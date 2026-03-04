import type { ReportType, ReportData, StandardizedDecline } from '../types';
import { BUSINESS_CODE_DICTIONARY, REASON_NORMALIZATION, TECHNICAL_CODE_DICTIONARY } from '../constants';
import { normalizeResponseCode } from './classifier';
import type { RawTransaction } from './bucketing';
import { getDateRange } from './bucketing';
import type { KPIIntelligenceReport } from '../services/kpiIntelligence';

function resolveTypicalCause(code: string, description: string): { desc: string; cause: string } {
  const dictEntry = BUSINESS_CODE_DICTIONARY[code] || TECHNICAL_CODE_DICTIONARY[code];
  const normalizedReason = (description || '').toLowerCase().trim();
  const phraseEntry = REASON_NORMALIZATION[normalizedReason];
  const hasReasonText = (description || '').trim().length > 0;

  if (hasReasonText) {
    if (phraseEntry) {
      return { desc: description.trim(), cause: phraseEntry.typicalCause };
    }
    if (dictEntry) {
      return { desc: description.trim(), cause: dictEntry.typicalCause };
    }
    return { desc: description.trim(), cause: 'No reference available.' };
  }

  if (dictEntry) return { desc: dictEntry.normalizedDescription, cause: dictEntry.typicalCause };
  if (phraseEntry) return { desc: phraseEntry.normalizedDescription, cause: phraseEntry.typicalCause };
  return { desc: `Declined (Code ${code})`, cause: 'No reference available.' };
}

function buildDeclineList(
  map: Map<string, { description: string; volume: number; typicalCause: string }>,
  limit?: number
): StandardizedDecline[] {
  const list = [...map.values()].sort((a, b) => b.volume - a.volume);
  const trimmed = typeof limit === 'number' ? list.slice(0, limit) : list;
  return trimmed.map((item) => ({
    description: item.description,
    volume: item.volume,
    typicalCause: item.typicalCause
  }));
}

function isStatusSuccess(status?: string) {
  const raw = String(status ?? '').trim().toUpperCase();
  if (!raw) return false;
  if (raw.includes('FAIL') || raw.includes('DECLIN')) return false;
  return raw.includes('SUCCESS') || raw.includes('APPROV');
}

function isStatusFailure(status?: string) {
  const raw = String(status ?? '').trim().toUpperCase();
  return raw.includes('FAIL') || raw.includes('DECLIN');
}

function isSuccess(tx: RawTransaction) {
  if (isStatusSuccess(tx.success_status)) return true;
  if (isStatusFailure(tx.success_status)) return false;
  return ['00', '0'].includes(normalizeResponseCode(tx.response_code));
}

export function buildCentralBankReportData(
  channel: ReportType,
  transactions: RawTransaction[]
): { reportData: ReportData; kpiReport?: KPIIntelligenceReport } {
  const filtered = transactions.filter((tx) => tx.channel === channel);
  const totalTransactions = filtered.length;
  const successCount = filtered.filter(isSuccess).length;
  const failureCount = totalTransactions - successCount;
  const successRate = totalTransactions ? (successCount / totalTransactions) * 100 : 0;
  const failureRate = totalTransactions ? (failureCount / totalTransactions) * 100 : 0;

  const businessMap = new Map<string, { description: string; volume: number; typicalCause: string }>();
  const technicalMap = new Map<string, { description: string; volume: number; typicalCause: string }>();

  filtered.forEach((tx) => {
    if (isSuccess(tx)) return;

    const code = normalizeResponseCode(tx.response_code);
    const category = String(tx.response_category || '').toUpperCase();
    const isTechnical = category.includes('TECH') || !!TECHNICAL_CODE_DICTIONARY[code];
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

  const businessFailures = buildDeclineList(businessMap);
  const technicalFailures = buildDeclineList(technicalMap);

  const { start, end } = getDateRange(filtered);
  const dateRange = start && end ? `${start.toLocaleDateString()} - ${end.toLocaleDateString()}` : 'N/A';
  const year = start ? start.getFullYear().toString() : new Date().getFullYear().toString();

  const reportData: ReportData = {
    reportType: channel,
    successRate: Number(successRate.toFixed(2)),
    failureRate: Number(failureRate.toFixed(2)),
    dateRange,
    year,
    startDateIso: start ? start.toISOString() : undefined,
    endDateIso: end ? end.toISOString() : undefined,
    businessFailures,
    technicalFailures,
    totalTransactions,
    narrative: ''
  };

  return { reportData };
}
