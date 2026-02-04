import type { ReportType } from '../types';
import type { BucketKPI } from './kpi';
import type { ComparisonResult } from './comparison';

const USER_REASON_MAP: Record<string, string> = {
  '51': 'customer liquidity constraints (insufficient funds)',
  '61': 'customer liquidity constraints (limit controls)',
  '54': 'expired card activity',
  '13': 'invalid transaction parameters',
  '14': 'invalid card details',
  '55': 'PIN verification issues',
  '65': 'withdrawal or usage limits',
  '78': 'blocked or inactive card status',
  'N7': 'CVV validation failure'
};

export function generateExecutiveSummary(
  channel: ReportType,
  period: 'WEEKLY' | 'MONTHLY' | 'YEARLY',
  buckets: BucketKPI[],
  comparisons: ComparisonResult[]
): string {
  if (buckets.length === 0) {
    return 'No transaction data available for executive summary.';
  }

  const latest = buckets[buckets.length - 1];
  const lastComparison = comparisons[comparisons.length - 1];
  const sentences: string[] = [];

  sentences.push(
    `${channel} ${period.toLowerCase()} performance reflects a success rate of ${latest.success_rate.toFixed(2)}% with total volume of ${latest.total.toLocaleString()} transactions.`
  );

  if (lastComparison && lastComparison.success_rate_change < -0.5) {
    sentences.push(`Success rate declined by ${Math.abs(lastComparison.success_rate_change).toFixed(2)}% in the most recent period.`);
  }

  if (lastComparison && (lastComparison.business_change > 0 || lastComparison.user_change > 0 || lastComparison.technical_change > 0)) {
    sentences.push('Decline volumes increased across one or more categories and warrant continued monitoring.');
  }

  const userReasons = latest.user_declines
    .map((d) => USER_REASON_MAP[d.code])
    .filter(Boolean);

  if (userReasons.length > 0) {
    sentences.push(`User decline drivers indicate ${[...new Set(userReasons)].slice(0, 2).join(' and ')}.`);
  }

  const business05 = latest.business_declines.find((d) => d.code === '05');
  if (business05) {
    sentences.push('Issuer risk screening and card blocking policies (code 05) remain a notable contributor to business declines.');
  }

  const tech91 = latest.technical_declines.find((d) => d.code === '91');
  if (tech91) {
    sentences.push('Technical declines include issuer or network instability indicators (code 91).');
  }

  return sentences.join(' ');
}
