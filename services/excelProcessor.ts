
import * as XLSX from 'xlsx';
import { TransactionRecord, ReportType } from '../types';
import type { PeriodType, RawTransaction } from '../lib/bucketing';
import { getDateRange } from '../lib/bucketing';
import { computeKpiByBucket, type BucketKPI } from '../lib/kpi';
import { generateComparisons, type ComparisonResult } from '../lib/comparison';
import { generateExecutiveSummary } from '../lib/summarizer';

export interface ProcessedReportWithKPI {
  transactions: RawTransaction[];
  buckets: BucketKPI[];
  comparisons: ComparisonResult[];
  executiveSummary: string;
  dateRange: string;
}

export async function processExcel(
  file: File,
  reportType: ReportType,
  period: PeriodType
): Promise<ProcessedReportWithKPI> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const rawData = XLSX.utils.sheet_to_json<TransactionRecord>(workbook.Sheets[sheetName]);

        if (rawData.length === 0) throw new Error("Excel file is empty");

        const normalizeChannel = (value?: string): RawTransaction['channel'] => {
          const raw = (value || '').trim().toUpperCase();
          if (raw.includes('POS')) return 'POS' as const;
          if (raw.includes('ATM')) return 'ATM' as const;
          if (raw.includes('IPG') || raw.includes('ECOM') || raw.includes('E-COM') || raw.includes('ONLINE') || raw.includes('INTERNET')) return 'IPG' as const;
          return 'UNKNOWN';
        };

        const normalizeKey = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

        const pick = (row: Record<string, any>, aliases: string[]) => {
          const aliasSet = new Set(aliases.map(normalizeKey));
          for (const key of Object.keys(row)) {
            if (aliasSet.has(normalizeKey(key))) return row[key];
          }
          return undefined;
        };

        const normalizeResponseCode = (code?: string | number, status?: string) => {
          const rawCode = String(code ?? '').trim().toUpperCase();
          const rawStatus = String(status ?? '').trim().toUpperCase();

          // Success/Failure column is source of truth when present.
          if (rawStatus.includes('SUCCESS') || rawStatus.includes('APPROV')) return '00';
          if (rawStatus.includes('FAIL') || rawStatus.includes('DECLIN')) return '05';

          if (rawCode.includes('SUCCESS') || rawCode.includes('APPROV')) return '00';
          if (rawCode.includes('FAIL') || rawCode.includes('DECLIN')) return '05';
          if (/^0+$/.test(rawCode)) return '00';
          if (/^\d+$/.test(rawCode) && rawCode.length === 1) return rawCode.padStart(2, '0');
          return rawCode;
        };

        const rows = rawData as unknown as Record<string, any>[];
        const channelValues = rows.map((tx) => pick(tx, ['TXN_TYPE', 'TXN TYPE', 'CHANNEL', 'TERMINAL TYPE']));
        const knownChannelCount = channelValues.filter((v) => normalizeChannel(String(v ?? '')) !== 'UNKNOWN').length;
        const knownChannelRatio = rows.length > 0 ? knownChannelCount / rows.length : 0;
        const weakChannelSignal = knownChannelRatio < 0.3;

        const transactions: RawTransaction[] = rows.map((tx) => {
          const rawDate = pick(tx, ['TRANSACTION_DATE', 'TRANSACTION DATE', 'TXN DATE', 'DATE']);
          const parsedDate = typeof rawDate === 'number'
            ? new Date((rawDate - 25569) * 86400 * 1000)
            : rawDate;
          const parsedChannel = normalizeChannel(String(pick(tx, ['TXN_TYPE', 'TXN TYPE', 'CHANNEL', 'TERMINAL TYPE']) ?? ''));
          const resolvedChannel = parsedChannel === 'UNKNOWN' && weakChannelSignal ? reportType : parsedChannel;
          const responseCodeRaw = pick(tx, ['RESPONSE_CODE', 'RESPONSE CODE', 'RC', 'CODE']);
          const successFailureRaw = pick(tx, ['Success/failure', 'SUCCESS/FAILURE', 'SUCCESS FAILURE', 'STATUS']);
          const responseReasonRaw = pick(tx, [
            'RESPONSE_REASON',
            'RESPONSE REASON',
            'RESPONSE_DESCRIPTION',
            'RESPONSE DESCRIPTION',
            'REASON',
            'DESCRIPTION'
          ]);
          const responseCategoryRaw = pick(tx, ['RESPONSE_CATEGORY', 'RESPONSE CATEGORY', 'CATEGORY']);

          return {
            transaction_datetime: parsedDate,
            channel: resolvedChannel,
            response_code: normalizeResponseCode(responseCodeRaw, successFailureRaw),
            success_status: String(successFailureRaw ?? ''),
            response_description: String(responseReasonRaw ?? '').trim() || 'Unknown',
            response_category: String(responseCategoryRaw || ''),
            card_network: pick(tx, ['CARD_NETWORK', 'CARD NETWORK', 'CARD BRAND', 'BRAND', 'SCHEME']),
            mid: pick(tx, ['MID', 'MERCHANT ID']),
            amount: pick(tx, ['VALUE', 'AMOUNT', 'TXN AMOUNT']),
            mcc: pick(tx, ['MCC']),
            merchant_name: pick(tx, ['MERCHANT_NAME', 'MERCHANT NAME'])
          };
        });

        const buckets = computeKpiByBucket(transactions, reportType, period);
        const comparisons = generateComparisons(buckets);
        const executiveSummary = generateExecutiveSummary(reportType, period, buckets, comparisons);
        const { start, end } = getDateRange(transactions);
        const dateRangeText = start && end ? `${start.toLocaleDateString()} – ${end.toLocaleDateString()}` : 'N/A';

        resolve({
          transactions,
          buckets,
          comparisons,
          executiveSummary,
          dateRange: dateRangeText
        });

      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("File reading failed"));
    reader.readAsArrayBuffer(file);
  });
}
