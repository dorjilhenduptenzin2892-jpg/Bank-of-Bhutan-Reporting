import type {
  AnalyticsMeta,
  AnalyticsResult,
  Brand,
  BrandMetrics,
  BrandChannelMetrics,
  Channel,
  ChannelMetrics,
  Currency,
  FailureCategory,
  FailureCategoryBreakdown,
  FailureReasonFilters,
  FailureReasonRecord,
  FailureReasonSummary,
  OverallMetrics,
  RawAcquiringRow
} from '../types/analytics';

const POS_ATM_CURRENCIES = new Set(['064', '524']);
const IPG_CURRENCIES = new Set(['840', '356']);
const BRAND_ORDER: Array<Exclude<Brand, 'Other'>> = ['Visa', 'MasterCard', 'AMEX'];
const CHANNEL_ORDER: Channel[] = ['POS', 'ATM', 'IPG'];
const CATEGORY_ORDER: FailureCategory[] = ['Business', 'Technical', 'User', 'Unknown'];

const initCurrencyRecord = (): Record<Currency, number> => ({
  BTN: 0,
  USD: 0,
  INR: 0
});

const initChannelMetrics = (channel: Channel): ChannelMetrics => ({
  channel,
  totalCount: 0,
  successCount: 0,
  failureCount: 0,
  successRate: 0,
  failureRate: 0,
  volumes: initCurrencyRecord(),
  averageTicket: initCurrencyRecord(),
  currencyCounts: initCurrencyRecord()
});

const initBrandChannel = (channel: Channel): BrandChannelMetrics => ({
  channel,
  totalCount: 0,
  successCount: 0,
  failureCount: 0,
  successRate: 0
});

const initBrandMetrics = (brand: Exclude<Brand, 'Other'>): BrandMetrics => ({
  brand,
  totalCount: 0,
  successCount: 0,
  failureCount: 0,
  successRate: 0,
  byChannel: {
    POS: initBrandChannel('POS'),
    ATM: initBrandChannel('ATM'),
    IPG: initBrandChannel('IPG')
  },
  volumes: initCurrencyRecord()
});

const safeString = (value: unknown) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const parseAmount = (value: unknown) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/,/g, '').trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeChannel = (value?: string): Channel | 'UNKNOWN' => {
  const raw = safeString(value).toUpperCase();
  if (raw.includes('POS')) return 'POS';
  if (raw.includes('ATM')) return 'ATM';
  if (raw.includes('IPG')) return 'IPG';
  return 'UNKNOWN';
};

const normalizeBrand = (value?: string): Brand => {
  const raw = safeString(value).toUpperCase();
  if (!raw) return 'Other';
  if (raw.includes('VISA')) return 'Visa';
  if (raw.includes('MASTER')) return 'MasterCard';
  if (raw.includes('AMEX') || raw.includes('AMERICAN')) return 'AMEX';
  return 'Other';
};

const normalizeCategory = (value?: string): FailureCategory => {
  const raw = safeString(value).toUpperCase();
  if (!raw) return 'Unknown';
  if (raw.includes('BUSINESS')) return 'Business';
  if (raw.includes('TECH')) return 'Technical';
  if (raw.includes('USER') || raw.includes('CARDHOLDER')) return 'User';
  return 'Unknown';
};

const normalizeCurrencyCode = (value?: string | number) => {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  return raw.padStart(3, '0');
};

const currencyFromCode = (code: string, channel: Channel): Currency => {
  if (channel === 'IPG') {
    return code === '840' ? 'USD' : 'INR';
  }
  return 'BTN';
};

const isValidCurrency = (channel: Channel, code: string) => {
  if (channel === 'IPG') return IPG_CURRENCIES.has(code);
  return POS_ATM_CURRENCIES.has(code);
};

const computeRate = (count: number, total: number) => (total > 0 ? (count / total) * 100 : 0);

export interface AnalyticsAggregator {
  addRow: (row: RawAcquiringRow) => void;
  finalize: () => AnalyticsResult;
}

export const createAnalyticsAggregator = (): AnalyticsAggregator => {
  const meta: AnalyticsMeta = {
    rowsLoaded: 0,
    rowsProcessed: 0,
    invalidRows: 0,
    invalidByReason: {
      currencyMismatch: 0,
      unknownChannel: 0
    }
  };

  const overall: OverallMetrics = {
    totalCount: 0,
    successCount: 0,
    failureCount: 0,
    successRate: 0,
    volumes: initCurrencyRecord()
  };

  const channelMap = new Map<Channel, ChannelMetrics>(CHANNEL_ORDER.map((channel) => [channel, initChannelMetrics(channel)]));
  const brandMap = new Map<Exclude<Brand, 'Other'>, BrandMetrics>(
    BRAND_ORDER.map((brand) => [brand, initBrandMetrics(brand)])
  );

  const failureCategoryTotals: Record<FailureCategory, number> = {
    Business: 0,
    Technical: 0,
    User: 0,
    Unknown: 0
  };

  const failureCategoryByChannel: Record<Channel, Record<FailureCategory, number>> = {
    POS: { Business: 0, Technical: 0, User: 0, Unknown: 0 },
    ATM: { Business: 0, Technical: 0, User: 0, Unknown: 0 },
    IPG: { Business: 0, Technical: 0, User: 0, Unknown: 0 }
  };

  const failureReasonMap = new Map<string, FailureReasonRecord>();

  const addRow = (row: RawAcquiringRow) => {
    meta.rowsLoaded += 1;

    const channel = normalizeChannel(row.TXN_TYPE);
    if (channel === 'UNKNOWN') {
      meta.invalidRows += 1;
      meta.invalidByReason.unknownChannel += 1;
      return;
    }

    const currencyCode = normalizeCurrencyCode(row.CURRENCY);
    if (!isValidCurrency(channel, currencyCode)) {
      meta.invalidRows += 1;
      meta.invalidByReason.currencyMismatch += 1;
      return;
    }

    const value = parseAmount(row.VALUE);
    const responseCode = safeString(row.RESPONSE_CODE);
    const isSuccess = responseCode === '00';
    const brand = normalizeBrand(row.CARD_NETWORK);
    const currency = currencyFromCode(currencyCode, channel);

    meta.rowsProcessed += 1;

    overall.totalCount += 1;
    if (isSuccess) {
      overall.successCount += 1;
    } else {
      overall.failureCount += 1;
    }
    overall.volumes[currency] += value;

    const channelMetrics = channelMap.get(channel);
    if (channelMetrics) {
      channelMetrics.totalCount += 1;
      if (isSuccess) {
        channelMetrics.successCount += 1;
      } else {
        channelMetrics.failureCount += 1;
      }
      channelMetrics.volumes[currency] += value;
      channelMetrics.currencyCounts[currency] += 1;
    }

    if (brand !== 'Other') {
      const brandMetrics = brandMap.get(brand);
      if (brandMetrics) {
        brandMetrics.totalCount += 1;
        if (isSuccess) {
          brandMetrics.successCount += 1;
        } else {
          brandMetrics.failureCount += 1;
        }
        brandMetrics.volumes[currency] += value;

        const brandChannel = brandMetrics.byChannel[channel];
        brandChannel.totalCount += 1;
        if (isSuccess) {
          brandChannel.successCount += 1;
        } else {
          brandChannel.failureCount += 1;
        }
      }
    }

    if (!isSuccess) {
      const category = normalizeCategory(row.RESPONSE_CATEGORY);
      failureCategoryTotals[category] += 1;
      failureCategoryByChannel[channel][category] += 1;

      const reason = safeString(row.RESPONSE_REASON) || 'Unknown Reason';
      const recordKey = `${reason}|${channel}|${brand}|${category}`;
      const existing = failureReasonMap.get(recordKey);
      if (existing) {
        existing.count += 1;
      } else {
        failureReasonMap.set(recordKey, {
          reason,
          channel,
          brand,
          category,
          count: 1
        });
      }
    }
  };

  const finalize = (): AnalyticsResult => {
    overall.successRate = computeRate(overall.successCount, overall.totalCount);

    const terminal = CHANNEL_ORDER.map((channel) => {
      const metrics = channelMap.get(channel) || initChannelMetrics(channel);
      metrics.successRate = computeRate(metrics.successCount, metrics.totalCount);
      metrics.failureRate = computeRate(metrics.failureCount, metrics.totalCount);

      if (channel === 'IPG') {
        metrics.averageTicket.USD = metrics.currencyCounts.USD > 0 ? metrics.volumes.USD / metrics.currencyCounts.USD : 0;
        metrics.averageTicket.INR = metrics.currencyCounts.INR > 0 ? metrics.volumes.INR / metrics.currencyCounts.INR : 0;
      } else {
        metrics.averageTicket.BTN = metrics.totalCount > 0 ? metrics.volumes.BTN / metrics.totalCount : 0;
      }

      return metrics;
    });

    const brands = BRAND_ORDER.map((brand) => {
      const metrics = brandMap.get(brand) || initBrandMetrics(brand);
      metrics.successRate = computeRate(metrics.successCount, metrics.totalCount);

      CHANNEL_ORDER.forEach((channel) => {
        const channelMetrics = metrics.byChannel[channel];
        channelMetrics.successRate = computeRate(channelMetrics.successCount, channelMetrics.totalCount);
      });

      return metrics;
    });

    const totalFailures = overall.failureCount;

    const overallCategories = CATEGORY_ORDER.map((category) => ({
      category,
      count: failureCategoryTotals[category],
      share: totalFailures > 0 ? (failureCategoryTotals[category] / totalFailures) * 100 : 0
    }));

    const byChannel = CHANNEL_ORDER.reduce<Record<Channel, { category: FailureCategory; count: number; share: number }[]>>(
      (acc, channel) => {
        const channelFailures = channelMap.get(channel)?.failureCount || 0;
        acc[channel] = CATEGORY_ORDER.map((category) => ({
          category,
          count: failureCategoryByChannel[channel][category],
          share: channelFailures > 0 ? (failureCategoryByChannel[channel][category] / channelFailures) * 100 : 0
        }));
        return acc;
      },
      { POS: [], ATM: [], IPG: [] }
    );

    const failureCategories: FailureCategoryBreakdown = {
      totalFailures,
      overall: overallCategories,
      byChannel
    };

    const failureReasonMatrix = Array.from(failureReasonMap.values());

    return {
      overall,
      terminal,
      brands,
      failureCategories,
      failureReasonMatrix,
      meta
    };
  };

  return { addRow, finalize };
};

export const processAcquiringAnalytics = (rows: RawAcquiringRow[]): AnalyticsResult => {
  const aggregator = createAnalyticsAggregator();
  rows.forEach((row) => aggregator.addRow(row));
  return aggregator.finalize();
};

export const getTopFailureReasons = (
  analytics: AnalyticsResult,
  filters: FailureReasonFilters
): FailureReasonSummary[] => {
  const accumulator = new Map<string, number>();
  let filteredTotal = 0;

  analytics.failureReasonMatrix.forEach((record) => {
    if (filters.channel !== 'ALL' && record.channel !== filters.channel) return;
    if (filters.brand !== 'ALL' && record.brand !== filters.brand) return;
    if (filters.category !== 'ALL' && record.category !== filters.category) return;

    filteredTotal += record.count;
    accumulator.set(record.reason, (accumulator.get(record.reason) || 0) + record.count);
  });

  return Array.from(accumulator.entries())
    .map(([reason, count]) => ({
      reason,
      count,
      share: filteredTotal > 0 ? (count / filteredTotal) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};
