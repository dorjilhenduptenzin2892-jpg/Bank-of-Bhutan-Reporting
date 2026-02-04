import type { IncomingMessage, ServerResponse } from 'http';
import type { ReportType } from '../types';
import { computeKpiByBucket } from '../lib/kpi';
import { generateComparisons } from '../lib/comparison';
import { generateExecutiveSummary } from '../lib/summarizer';
import { generateReportDocxBuffer } from '../lib/docx';
import { getDateRange, type RawTransaction } from '../lib/bucketing';

export const config = {
  runtime: 'nodejs'
};

export default async function handler(req: IncomingMessage & { body?: any; method?: string }, res: ServerResponse & { status?: (code: number) => any; json?: (body: any) => any }) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end('Method Not Allowed');
  }

  try {
    const { channel, period, transactions, selectedYear } = (req.body || {}) as {
      channel?: ReportType;
      period?: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
      transactions?: RawTransaction[];
      selectedYear?: number;
    };

    if (!channel || !period || !Array.isArray(transactions)) {
      res.statusCode = 400;
      return res.end('Invalid payload. Expected channel, period, and transactions.');
    }

    const filtered = transactions.filter((tx) => tx.channel === channel);
    const buckets = computeKpiByBucket(filtered, channel, period, selectedYear);
    const comparisons = generateComparisons(buckets);
    const executiveSummary = generateExecutiveSummary(channel, period, buckets, comparisons);

    const { start, end } = getDateRange(filtered);
    const dateRange = start && end
      ? `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`
      : 'N/A';

    const buffer = await generateReportDocxBuffer({
      channel,
      period,
      dateRange,
      buckets,
      comparisons,
      executiveSummary
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${channel}_${period}_Report.docx"`);
    return res.end(buffer);
  } catch (error: any) {
    console.error('Report generation failed:', error);
    res.statusCode = 500;
    return res.end(`Report generation failed: ${error?.message || 'Unknown error'}`);
  }
}
