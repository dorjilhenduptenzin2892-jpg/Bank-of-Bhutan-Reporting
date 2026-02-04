import type { IncomingMessage, ServerResponse } from 'http';
import type { ReportType, ReportData, StandardizedDecline } from '../types';
import { BUSINESS_CODE_DICTIONARY, REASON_NORMALIZATION, TECHNICAL_CODE_DICTIONARY } from '../constants';
import { analyzeKPIIntelligence } from '../services/kpiIntelligence';
import { generateCentralBankDocxBuffer } from '../lib/centralBankDocx';
import { normalizeResponseCode } from '../lib/classifier';
import type { RawTransaction } from '../lib/bucketing';
import { getDateRange } from '../lib/bucketing';

export const config = {
  runtime: 'nodejs'
};

function resolveTypicalCause(code: string, description: string): { desc: string; cause: string } {
  const dictEntry = BUSINESS_CODE_DICTIONARY[code] || TECHNICAL_CODE_DICTIONARY[code];
  if (dictEntry) {
    return { desc: dictEntry.normalizedDescription, cause: dictEntry.typicalCause };
  }

  const normalizedReason = (description || '').toLowerCase().trim();
  const phraseEntry = REASON_NORMALIZATION[normalizedReason];
  if (phraseEntry) {
    return { desc: phraseEntry.normalizedDescription, cause: phraseEntry.typicalCause };
  }

  return { desc: description || `Declined (Code ${code})`, cause: 'No reference available.' };
}

function buildDeclineList(map: Map<string, { description: string; volume: number; typicalCause: string }>, limit?: number): StandardizedDecline[] {
  const list = [...map.values()].sort((a, b) => b.volume - a.volume);
  const trimmed = typeof limit === 'number' ? list.slice(0, limit) : list;
  return trimmed.map(item => ({
    description: item.description,
    volume: item.volume,
    typicalCause: item.typicalCause
  }));
}

export default async function handler(req: IncomingMessage & { body?: any; method?: string }, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end('Method Not Allowed');
  }

  try {
    const { channel, transactions } = (req.body || {}) as { channel?: ReportType; transactions?: RawTransaction[] };

    if (!channel || !Array.isArray(transactions)) {
      res.statusCode = 400;
      return res.end('Invalid payload. Expected channel and transactions.');
    }

    const filtered = transactions.filter(tx => tx.channel === channel);
    const totalTransactions = filtered.length;
    const successCount = filtered.filter(tx => ['00', '0'].includes(normalizeResponseCode(tx.response_code))).length;
    const failureCount = totalTransactions - successCount;
    const successRate = totalTransactions ? (successCount / totalTransactions) * 100 : 0;
    const failureRate = totalTransactions ? (failureCount / totalTransactions) * 100 : 0;

    const businessMap = new Map<string, { description: string; volume: number; typicalCause: string }>();
    const technicalMap = new Map<string, { description: string; volume: number; typicalCause: string }>();

    filtered.forEach(tx => {
      const code = normalizeResponseCode(tx.response_code);
      if (code === '00' || code === '0') return;

      const isTechnical = !!TECHNICAL_CODE_DICTIONARY[code];
      const map = isTechnical ? technicalMap : businessMap;
      const { desc, cause } = resolveTypicalCause(code, tx.response_description || '');
      const key = `${desc}::${cause}`;
      const existing = map.get(key);
      if (existing) {
        existing.volume += 1;
      } else {
        map.set(key, { description: desc, volume: 1, typicalCause: cause });
      }
    });

    const businessFailures = buildDeclineList(businessMap, 10);
    const technicalFailures = buildDeclineList(technicalMap);

    const { start, end } = getDateRange(filtered);
    const dateRange = start && end ? `${start.toLocaleDateString()} – ${end.toLocaleDateString()}` : 'N/A';
    const year = start ? start.getFullYear().toString() : new Date().getFullYear().toString();

    const reportData: ReportData = {
      reportType: channel,
      successRate: Number(successRate.toFixed(2)),
      failureRate: Number(failureRate.toFixed(2)),
      dateRange,
      year,
      businessFailures,
      technicalFailures,
      totalTransactions,
      narrative: ''
    };

    const kpiReport = analyzeKPIIntelligence(reportData);
    const buffer = await generateCentralBankDocxBuffer(reportData, kpiReport);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${channel}_Central_Bank_Report.docx"`);
    return res.end(buffer);
  } catch (error: any) {
    console.error('Central bank export failed:', error);
    res.statusCode = 500;
    return res.end(`Central bank export failed: ${error?.message || 'Unknown error'}`);
  }
}
