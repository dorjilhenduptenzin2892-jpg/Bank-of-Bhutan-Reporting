
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

        const transactions: RawTransaction[] = rawData.map((tx) => {
          const rawDate = tx.TRANSACTION_DATE;
          const parsedDate = typeof rawDate === 'number'
            ? new Date((rawDate - 25569) * 86400 * 1000)
            : rawDate;

          return {
            transaction_datetime: parsedDate,
            channel: reportType,
            response_code: String(tx.RESPONSE_CODE || '').trim(),
            response_description: tx.RESPONSE_REASON || tx.RESPONSE_CATEGORY || 'Unknown',
            amount: tx.VALUE
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
