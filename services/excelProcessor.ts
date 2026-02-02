
import * as XLSX from 'xlsx';
import { TransactionRecord, ReportData, StandardizedDecline, ReportType } from '../types';
import { BUSINESS_CODE_DICTIONARY, TECHNICAL_CODE_DICTIONARY, REASON_NORMALIZATION } from '../constants';
import { generateTypicalCause } from './geminiService';

export async function processExcel(file: File, reportType: ReportType): Promise<ReportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const rawData = XLSX.utils.sheet_to_json<TransactionRecord>(workbook.Sheets[sheetName]);

        if (rawData.length === 0) throw new Error("Excel file is empty");

        // Success vs Failure (00 or 0 is Success)
        const successes = rawData.filter(tx => String(tx.RESPONSE_CODE) === '00' || String(tx.RESPONSE_CODE) === '0');
        const failures = rawData.filter(tx => String(tx.RESPONSE_CODE) !== '00' && String(tx.RESPONSE_CODE) !== '0');
        
        const successRate = (successes.length / rawData.length) * 100;
        const failureRate = 100 - successRate;

        // Date Range
        const dates = rawData.map(tx => {
            const d = tx.TRANSACTION_DATE;
            if (typeof d === 'number') {
                const date = new Date((d - 25569) * 86400 * 1000);
                return date;
            }
            return new Date(d);
        }).filter(d => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
        
        const startDate = dates[0]?.toLocaleDateString() || 'N/A';
        const endDate = dates[dates.length - 1]?.toLocaleDateString() || 'N/A';
        const year = dates[0]?.getFullYear().toString() || new Date().getFullYear().toString();
        const dateRangeText = `${startDate} – ${endDate}`;

        const businessMap: Record<string, { volume: number, code: string, reason: string }> = {};
        const technicalMap: Record<string, { volume: number, code: string, reason: string }> = {};

        // Pre-populate technicalMap to ensure all 3 always appear
        Object.entries(TECHNICAL_CODE_DICTIONARY).forEach(([code, entry]) => {
          technicalMap[code] = { volume: 0, code, reason: entry.normalizedDescription };
        });

        for (const tx of failures) {
          const code = String(tx.RESPONSE_CODE || '').trim();
          const isTechnical = !!TECHNICAL_CODE_DICTIONARY[code];
          
          const targetMap = isTechnical ? technicalMap : businessMap;
          const key = isTechnical ? code : (code || (tx.RESPONSE_REASON || '').toLowerCase().trim() || 'Unknown');
          
          if (!targetMap[key]) {
            targetMap[key] = { volume: 0, code, reason: tx.RESPONSE_REASON || '' };
          }
          targetMap[key].volume++;
        }

        const mapToStandardized = async (entries: [string, any][], isTech: boolean): Promise<StandardizedDecline[]> => {
          return Promise.all(entries.map(async ([key, val]) => {
            const dict = isTech ? TECHNICAL_CODE_DICTIONARY : BUSINESS_CODE_DICTIONARY;
            const codeEntry = dict[val.code];
            
            if (codeEntry) {
              return {
                description: codeEntry.normalizedDescription,
                volume: val.volume,
                typicalCause: codeEntry.typicalCause
              };
            }

            const phraseKey = val.reason.toLowerCase().trim();
            const phraseEntry = REASON_NORMALIZATION[phraseKey];
            if (phraseEntry) {
               return {
                description: phraseEntry.normalizedDescription,
                volume: val.volume,
                typicalCause: phraseEntry.typicalCause
              };
            }

            const cause = await generateTypicalCause(val.reason || `Code ${val.code}`);
            return {
              description: val.reason || `Declined (Code ${val.code})`,
              volume: val.volume,
              typicalCause: cause
            };
          }));
        };

        let businessFailures = await mapToStandardized(Object.entries(businessMap), false);
        const technicalFailures = await mapToStandardized(Object.entries(technicalMap), true);

        // Apply filters: Volume >= 50 and Top 12
        businessFailures = businessFailures
          .filter(f => f.volume >= 50)
          .sort((a, b) => b.volume - a.volume)
          .slice(0, 12);

        technicalFailures.sort((a, b) => b.volume - a.volume);

        resolve({
          reportType,
          successRate,
          failureRate,
          dateRange: dateRangeText,
          year,
          businessFailures,
          technicalFailures,
          totalTransactions: rawData.length,
          narrative: '' 
        });

      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("File reading failed"));
    reader.readAsArrayBuffer(file);
  });
}
