import type { ReportType } from '../types';
import type { RawTransaction, PeriodType } from './bucketing';
import { bucketTransactions, sortPeriodKeys } from './bucketing';
import { classifyResponse, normalizeResponseCode } from './classifier';
import { BUSINESS_CODE_DICTIONARY, REASON_NORMALIZATION, TECHNICAL_CODE_DICTIONARY } from '../constants';
import type { BucketKPI } from './kpi';

interface TrendSummary {
  label: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
}

export interface ManagementNarrative {
  executiveOverview: string;
  transactionPerformance: string;
  declineCategoryDistribution: string;
  dominantDrivers: string;
  declineTrends: string;
  schemeAnalysis: string;
  channelInsights: string;
  trendIntelligence: string[];
  strategicObservations: string;
  priorityFocusAreas: string[];
  continuousImprovementAreas: string[];
  formalSummary: string;
}

function resolveDescription(code: string, description?: string): string {
  const dictEntry = BUSINESS_CODE_DICTIONARY[code] || TECHNICAL_CODE_DICTIONARY[code];
  if (dictEntry) return dictEntry.normalizedDescription;
  const normalizedReason = (description || '').toLowerCase().trim();
  const phraseEntry = REASON_NORMALIZATION[normalizedReason];
  if (phraseEntry) return phraseEntry.normalizedDescription;
  return description || `Declined (Code ${code})`;
}

function computeTrend(values: number[], label: string): TrendSummary {
  if (values.length < 2) {
    return { label, direction: 'stable', changePercent: 0 };
  }
  const first = values[0];
  const last = values[values.length - 1];
  const change = first === 0 ? 0 : ((last - first) / Math.max(1, first)) * 100;
  const absChange = Math.abs(change);
  const direction = absChange < 3 ? 'stable' : change > 0 ? 'increasing' : 'decreasing';
  return { label, direction, changePercent: Number(change.toFixed(1)) };
}

function formatTrend(trend: TrendSummary): string {
  if (trend.direction === 'stable') {
    return `${trend.label} remained within expected operational range with limited variation.`;
  }
  const verb = trend.direction === 'increasing' ? 'increased' : 'decreased';
  return `${trend.label} ${verb} by approximately ${Math.abs(trend.changePercent).toFixed(1)}% across the review period.`;
}

function getPeriodLabel(period: PeriodType | string): string {
  if (period === 'WEEKLY') return 'weekly';
  if (period === 'MONTHLY') return 'monthly';
  if (period === 'YEARLY') return 'yearly';
  if (period === 'QUARTERLY') return 'quarterly';
  return 'custom';
}

export function buildManagementNarrative(params: {
  channel: ReportType;
  period: PeriodType | string;
  transactions: RawTransaction[];
  buckets: BucketKPI[];
}): ManagementNarrative {
  const { channel, period, transactions, buckets } = params;
  const periodLabel = getPeriodLabel(period);

  const bucketTotals = buckets.map((b) => b.total);
  const successRates = buckets.map((b) => b.success_rate);

  const totalBusiness = buckets.reduce((s, b) => s + b.business_failures, 0);
  const totalUser = buckets.reduce((s, b) => s + b.user_failures, 0);
  const totalTechnical = buckets.reduce((s, b) => s + b.technical_failures, 0);
  const totalFailures = totalBusiness + totalUser + totalTechnical;

  const businessShare = totalFailures ? (totalBusiness / totalFailures) * 100 : 0;
  const userShare = totalFailures ? (totalUser / totalFailures) * 100 : 0;
  const technicalShare = totalFailures ? (totalTechnical / totalFailures) * 100 : 0;

  const periodBuckets = bucketTransactions(transactions, period as PeriodType);
  const periodKeys = sortPeriodKeys(Object.keys(periodBuckets));

  const declineCounts = new Map<string, { code: string; description: string; count: number; presence: number }>();
  periodKeys.forEach((key) => {
    const bucketTx = periodBuckets[key] || [];
    const seen = new Set<string>();
    bucketTx.forEach((tx) => {
      const code = normalizeResponseCode(tx.response_code);
      if (!code || code === '00' || code === '0') return;
      const category = classifyResponse(channel, code);
      if (category === 'success') return;
      const description = resolveDescription(code, tx.response_description);
      const entryKey = `${code}::${description}`;
      const entry = declineCounts.get(entryKey) || { code, description, count: 0, presence: 0 };
      entry.count += 1;
      if (!seen.has(entryKey)) {
        entry.presence += 1;
        seen.add(entryKey);
      }
      declineCounts.set(entryKey, entry);
    });
  });

  const totalDeclines = [...declineCounts.values()].reduce((s, d) => s + d.count, 0);
  const topDeclines = [...declineCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);
  const top5Share = totalDeclines
    ? (topDeclines.slice(0, 5).reduce((s, d) => s + d.count, 0) / totalDeclines) * 100
    : 0;
  const concentrationLabel = top5Share > 60 ? 'high concentration' : top5Share > 40 ? 'moderate concentration' : 'diversified distribution';

  const stableDeclines = topDeclines.filter((d) => d.presence / Math.max(1, periodKeys.length) >= 0.7);
  const intermittentDeclines = topDeclines.filter((d) => d.presence / Math.max(1, periodKeys.length) < 0.4);

  const schemeMap = new Map<string, { total: number; success: number }>();
  transactions.forEach((tx) => {
    const scheme = (tx.card_network || 'OTHER').toUpperCase();
    const entry = schemeMap.get(scheme) || { total: 0, success: 0 };
    entry.total += 1;
    const code = normalizeResponseCode(tx.response_code);
    if (code === '00' || code === '0') entry.success += 1;
    schemeMap.set(scheme, entry);
  });

  const schemeNarrative = [...schemeMap.entries()].map(([scheme, stats]) => {
    const successRate = stats.total ? (stats.success / stats.total) * 100 : 0;
    return `${scheme} authorizations reflect a success rate of ${successRate.toFixed(1)}% with ${stats.total.toLocaleString()} transactions.`;
  });

  const volumeTrend = computeTrend(bucketTotals, 'Transaction volumes');
  const successTrend = computeTrend(successRates, 'Authorization success rates');

  const executiveOverview = `During the review period, ${channel} acquiring activity reflected stable transaction processing characteristics, with decline patterns shaped primarily by issuer authorization behaviour and customer transaction dynamics.`;

  const transactionPerformance = `${formatTrend(volumeTrend)} ${formatTrend(successTrend)} These patterns are consistent with typical acquiring environments and evolving customer usage profiles.`;

  const declineCategoryDistribution = `The decline distribution indicates a predominant influence of issuer-side authorization decisions (${businessShare.toFixed(1)}%), complemented by customer-driven (${userShare.toFixed(1)}%) and technical (${technicalShare.toFixed(1)}%) factors. This structure reflects expected operational dynamics for ${channel} acquiring.`;

  const dominantDrivers = `A limited set of decline codes accounts for a substantial proportion of total declines, with the top five representing ${top5Share.toFixed(1)}% and indicating ${concentrationLabel} in authorization outcomes. Key contributors include ${topDeclines.map((d) => d.description).slice(0, 5).join(', ')}.`;

  const declineTrends = `Persistent decline codes include ${stableDeclines.map((d) => d.description).slice(0, 3).join(', ') || 'core issuer-driven declines'}, while intermittent patterns such as ${intermittentDeclines.map((d) => d.description).slice(0, 3).join(', ') || 'episodic codes'} suggest episodic transactional and issuer policy dynamics.`;

  const schemeAnalysis = schemeNarrative.length
    ? `Scheme-level analysis indicates differentiated authorization behaviour across card networks. ${schemeNarrative.join(' ')}`
    : 'Scheme-level analysis indicates consistent authorization behaviour across card networks within expected operational range.';

  const channelInsights = channel === 'POS'
    ? 'For POS, observed patterns reflect card-present transaction dynamics, merchant interaction characteristics, and issuer authorization frameworks influencing approval outcomes.'
    : channel === 'ATM'
      ? 'For ATM, patterns reflect cash withdrawal behaviour, customer limit usage, and issuer authorization logic within typical acquiring environments.'
      : 'For IPG, patterns reflect authentication workflows, customer interaction behaviour, and merchant integration characteristics aligned with issuer authorization policies.';

  const trendIntelligence = [
    'Issuer-driven authorization outcomes remain the dominant decline component across periods.',
    'Customer-driven declines indicate consistent behavioural influence on transaction outcomes.',
    'Structural concentration of declines suggests focused optimization opportunities.',
    'Scheme-level performance remains within expected operational range with differentiated issuer behaviour.',
    'Technical declines remain a limited contributor, indicating stable processing environments.',
    `${periodLabel} fluctuations reflect normal transactional seasonality and issuer policy dynamics.`
  ];

  const strategicObservations = 'Observed patterns highlight opportunities for continued optimization in issuer alignment, customer awareness, and transaction monitoring frameworks.';

  const priorityFocusAreas = [
    'Coordinate with issuers on dominant authorization decline codes to refine rule configurations.',
    'Monitor high-concentration decline codes to improve approval quality without compromising risk controls.',
    'Engage with schemes to align authorization behaviour and share trend intelligence.'
  ];

  const continuousImprovementAreas = [
    'Review channel configuration and merchant enablement to sustain approval performance.',
    'Enhance customer education on limits, authentication, and card usage expectations.',
    'Expand management dashboards to track decline concentration and scheme-specific patterns.'
  ];

  const formalSummary = `During the review period, ${channel} acquiring activity demonstrated stable transaction processing characteristics. Decline patterns were primarily shaped by issuer authorization policies and customer transaction behaviour, while technical declines represented a limited proportion of overall outcomes. The observed trends are consistent with typical acquiring environments and reflect a stable operational landscape. Continued monitoring and stakeholder alignment remain integral to sustaining efficient transaction processing.`;

  return {
    executiveOverview,
    transactionPerformance,
    declineCategoryDistribution,
    dominantDrivers,
    declineTrends,
    schemeAnalysis,
    channelInsights,
    trendIntelligence,
    strategicObservations,
    priorityFocusAreas,
    continuousImprovementAreas,
    formalSummary
  };
}
