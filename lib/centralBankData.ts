import type { ReportType, ReportData, StandardizedDecline } from '../types';
import { BUSINESS_CODE_DICTIONARY, REASON_NORMALIZATION, TECHNICAL_CODE_DICTIONARY } from '../constants';
import { normalizeResponseCode } from './classifier';
import type { RawTransaction } from './bucketing';
import { getDateRange } from './bucketing';
import { analyzeKPIIntelligence, type KPIIntelligenceReport } from '../services/kpiIntelligence';

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

function buildDeclineList(
  map: Map<string, { description: string; volume: number; typicalCause: string }>,
  limit?: number
): StandardizedDecline[] {
  const list = [...map.values()].sort((a, b) => b.volume - a.volume);
  const trimmed = typeof limit === 'number' ? list.slice(0, limit) : list;
  return trimmed.map(item => ({
    description: item.description,
    volume: item.volume,
    typicalCause: item.typicalCause
  }));
}

export function buildCentralBankReportData(
  channel: ReportType,
  transactions: RawTransaction[]
): { reportData: ReportData; kpiReport: KPIIntelligenceReport } {
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

  return { reportData, kpiReport };
}
