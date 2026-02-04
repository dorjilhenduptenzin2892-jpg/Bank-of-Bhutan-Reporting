import type { IncomingMessage, ServerResponse } from 'http';
import type { ReportType } from '../types';
import { generateCentralBankDocxBuffer } from '../lib/centralBankDocx';
import { buildCentralBankReportData } from '../lib/centralBankData';
import type { RawTransaction } from '../lib/bucketing';

export const config = {
  runtime: 'nodejs'
};

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

    const { reportData, kpiReport } = buildCentralBankReportData(channel, transactions);
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
