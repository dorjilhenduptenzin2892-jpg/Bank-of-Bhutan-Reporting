import type { ReportType } from '../types';
import type { RawTransaction } from './bucketing';
import { classifyResponse, normalizeResponseCode, DeclineCategory } from './classifier';
import { bucketTransactions, sortPeriodKeys } from './bucketing';

export interface DeclineRecord {
  code: string;
  description: string;
  count: number;
  percent: number;
}

export interface BucketKPI {
  period: string;
  total: number;
  success_count: number;
  success_rate: number;
  business_failures: number;
  business_rate: number;
  user_failures: number;
  user_rate: number;
  technical_failures: number;
  technical_rate: number;
  business_declines: DeclineRecord[];
  user_declines: DeclineRecord[];
  technical_declines: DeclineRecord[];
}

function buildTopDeclines(
  transactions: RawTransaction[],
  channel: ReportType,
  category: DeclineCategory
): DeclineRecord[] {
  const map = new Map<string, { code: string; description: string; count: number }>();
  let categoryTotal = 0;

  transactions.forEach((tx) => {
    const code = normalizeResponseCode(tx.response_code);
    const txCategory = classifyResponse(channel, code);
    if (txCategory !== category) return;
    categoryTotal += 1;
    const description = tx.response_description || 'Unknown';
    const key = `${code}::${description}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { code, description, count: 1 });
    }
  });

  return [...map.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((entry) => ({
      code: entry.code,
      description: entry.description,
      count: entry.count,
      percent: categoryTotal ? (entry.count / categoryTotal) * 100 : 0
    }));
}

export function computeKpiByBucket(
  transactions: RawTransaction[],
  channel: ReportType,
  period: 'WEEKLY' | 'MONTHLY' | 'YEARLY',
  selectedYear?: number
): BucketKPI[] {
  const buckets = bucketTransactions(transactions, period, selectedYear);
  const keys = sortPeriodKeys(Object.keys(buckets));

  return keys.map((key) => {
    const bucket = buckets[key] || [];
    const total = bucket.length;
    let success = 0;
    let business = 0;
    let user = 0;
    let technical = 0;

    bucket.forEach((tx) => {
      const category = classifyResponse(channel, tx.response_code);
      if (category === 'success') success += 1;
      if (category === 'business_decline') business += 1;
      if (category === 'user_decline') user += 1;
      if (category === 'technical_decline') technical += 1;
    });

    const successRate = total ? (success / total) * 100 : 0;
    const businessRate = total ? (business / total) * 100 : 0;
    const userRate = total ? (user / total) * 100 : 0;
    const technicalRate = total ? (technical / total) * 100 : 0;

    return {
      period: key,
      total,
      success_count: success,
      success_rate: Number(successRate.toFixed(2)),
      business_failures: business,
      business_rate: Number(businessRate.toFixed(2)),
      user_failures: user,
      user_rate: Number(userRate.toFixed(2)),
      technical_failures: technical,
      technical_rate: Number(technicalRate.toFixed(2)),
      business_declines: buildTopDeclines(bucket, channel, 'business_decline'),
      user_declines: buildTopDeclines(bucket, channel, 'user_decline'),
      technical_declines: buildTopDeclines(bucket, channel, 'technical_decline')
    };
  });
}
