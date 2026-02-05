import type { RawTransaction } from '../lib/bucketing';

export type ExecutiveRange = 'LAST_3_YEARS' | 'YTD_2026' | 'CUSTOM';
export type ExecutiveGranularity = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type ExecutiveChannel = 'POS' | 'ATM' | 'POS_ATM';

type Scheme = 'MASTERCARD' | 'VISA' | 'AMEX' | 'OTHER';

type NormalizedChannel = 'POS' | 'ATM' | 'IPG' | 'OTHER';

export interface ExecutiveFilters {
  rangeType: ExecutiveRange;
  granularity: ExecutiveGranularity;
  channel: ExecutiveChannel;
  customStart?: string;
  customEnd?: string;
}

export interface SchemeAggregate {
  scheme: Scheme;
  count: number;
  volume: number;
  revenue: number;
  shareCount: number;
  shareVolume: number;
  shareRevenue: number;
}

export interface TrendPoint {
  period: string;
  count: number;
  volume: number;
}

export interface YoYPoint {
  year: number;
  count: number;
  volume: number;
  countGrowth: number;
  volumeGrowth: number;
}

export interface MarketShareTrendPoint {
  period: string;
  MASTERCARD: number;
  VISA: number;
  AMEX: number;
  OTHER: number;
}

export interface MerchantTrendPoint {
  period: string;
  merchants: number;
}

export interface SectorDistribution {
  sector: string;
  merchantCount: number;
  volume: number;
  penetration: number;
}

export interface MastercardAnalytics {
  rangeLabel: string;
  dateRange: { start: Date | null; end: Date | null };
  totals: { count: number; volume: number; revenue: number };
  mastercard: { count: number; volume: number; revenue: number; shareCount: number; shareVolume: number; shareRevenue: number };
  ytd: { year: number; count: number; volume: number; countGrowth: number; volumeGrowth: number };
  trend: TrendPoint[];
  yoy: YoYPoint[];
  revenue: { total: number; byScheme: SchemeAggregate[] };
  marketShare: { byScheme: SchemeAggregate[]; trendCount: MarketShareTrendPoint[]; trendVolume: MarketShareTrendPoint[] };
  merchant: { total: number; trend: MerchantTrendPoint[] };
  sectors: { distribution: SectorDistribution[]; top: SectorDistribution[] };
  insights: string[];
}

interface NormalizedTransaction {
  date: Date;
  channel: NormalizedChannel;
  scheme: Scheme;
  amount: number;
  mid?: string;
  mcc?: string;
}

const MDR_RATES: Record<Scheme, number> = {
  MASTERCARD: 0.015,
  VISA: 0.015,
  AMEX: 0.02,
  OTHER: 0.015
};

const normalizedCache = new WeakMap<RawTransaction[], NormalizedTransaction[]>();
const analyticsCache = new WeakMap<RawTransaction[], Map<string, MastercardAnalytics>>();

function normalizeScheme(value?: string): Scheme {
  const raw = (value || '').trim().toUpperCase();
  if (!raw) return 'OTHER';
  if (raw.includes('MASTERCARD') || raw.includes('MASTER')) return 'MASTERCARD';
  if (raw.includes('VISA')) return 'VISA';
  if (raw.includes('AMEX') || raw.includes('AMERICAN')) return 'AMEX';
  return 'OTHER';
}

function normalizeChannel(value?: string): NormalizedChannel {
  const raw = (value || '').trim().toUpperCase();
  if (!raw) return 'OTHER';
  if (raw.includes('POS')) return 'POS';
  if (raw.includes('ATM')) return 'ATM';
  if (raw.includes('IPG') || raw.includes('ECOM') || raw.includes('E-COM') || raw.includes('ONLINE')) return 'IPG';
  return 'OTHER';
}

function getPeriodKey(date: Date, granularity: ExecutiveGranularity): string {
  const year = date.getFullYear();
  if (granularity === 'YEARLY') return `${year}`;
  if (granularity === 'QUARTERLY') {
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return `${year}-Q${quarter}`;
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getRangeBounds(transactions: NormalizedTransaction[], filters: ExecutiveFilters): { start: Date | null; end: Date | null; label: string } {
  const dates = transactions.map((t) => t.date).filter((d) => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
  const dataStart = dates[0] || null;
  const dataEnd = dates[dates.length - 1] || null;

  if (filters.rangeType === 'CUSTOM' && filters.customStart && filters.customEnd) {
    const start = new Date(`${filters.customStart}T00:00:00`);
    const end = new Date(`${filters.customEnd}T23:59:59.999`);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      return { start, end, label: `${filters.customStart} – ${filters.customEnd}` };
    }
  }

  if (filters.rangeType === 'YTD_2026') {
    const start = new Date('2026-01-01T00:00:00');
    const now = new Date();
    const end = dataEnd && dataEnd < now ? dataEnd : now;
    return { start, end, label: `YTD 2026 (${start.toLocaleDateString()} – ${end.toLocaleDateString()})` };
  }

  if (filters.rangeType === 'LAST_3_YEARS') {
    const end = dataEnd || new Date();
    const start = new Date(end);
    start.setFullYear(start.getFullYear() - 3);
    return { start, end, label: `Last 3 Years (${start.getFullYear()} – ${end.getFullYear()})` };
  }

  return { start: dataStart, end: dataEnd, label: dataStart && dataEnd ? `${dataStart.toLocaleDateString()} – ${dataEnd.toLocaleDateString()}` : 'N/A' };
}

function mapMccToSector(mcc?: string): string {
  const code = String(mcc || '').replace(/\D/g, '');
  if (!code) return 'Others';
  const value = Number(code);

  if (value >= 3500 && value <= 3999) return 'Hotels';
  if ((value >= 3000 && value <= 3350) || [4511, 4722, 4789].includes(value)) return 'Tourism';
  if ([5812, 5813, 5814, 5815].includes(value)) return 'Restaurants';
  if ([4814, 4816, 4829, 5968, 5734, 7995].includes(value)) return 'E-commerce';
  if (value >= 5000 && value <= 5999) return 'Retail';
  if (value >= 6000 && value <= 6999) return 'Services';

  return 'Others';
}

function computeRevenue(amount: number, scheme: Scheme): number {
  return amount * (MDR_RATES[scheme] || 0);
}

function normalizeTransactions(transactions: RawTransaction[]): NormalizedTransaction[] {
  const cached = normalizedCache.get(transactions);
  if (cached) return cached;

  const normalized = transactions
    .map((tx) => {
      const date = tx.transaction_datetime instanceof Date
        ? tx.transaction_datetime
        : new Date(tx.transaction_datetime);
      if (isNaN(date.getTime())) return null;
      return {
        date,
        channel: normalizeChannel(tx.channel),
        scheme: normalizeScheme(tx.card_network),
        amount: Number(tx.amount || 0),
        mid: tx.mid,
        mcc: (tx as RawTransaction & { mcc?: string }).mcc
      } as NormalizedTransaction;
    })
    .filter((t): t is NormalizedTransaction => Boolean(t));

  normalizedCache.set(transactions, normalized);
  return normalized;
}

function buildInsights(metrics: MastercardAnalytics): string[] {
  const insights: string[] = [];

  if (metrics.mastercard.shareVolume > 40) {
    insights.push('Mastercard maintains a dominant share of acquiring volume, indicating strong portfolio positioning within the market mix.');
  } else if (metrics.mastercard.shareVolume > 25) {
    insights.push('Mastercard share remains competitive with balanced performance against peer schemes.');
  } else {
    insights.push('Mastercard share indicates growth headroom, highlighting potential for targeted acceptance expansion.');
  }

  if (metrics.ytd.volumeGrowth > 5) {
    insights.push('YTD volume growth is ahead of the prior year, signaling positive momentum in Mastercard usage.');
  } else if (metrics.ytd.volumeGrowth < -5) {
    insights.push('YTD volume softness versus prior year suggests the need for strategic reinforcement with key merchant segments.');
  } else {
    insights.push('YTD performance remains stable, reinforcing consistent Mastercard spend behavior.');
  }

  const topSector = metrics.sectors.top[0];
  if (topSector) {
    insights.push(`Highest Mastercard penetration is observed in ${topSector.sector}, indicating a strong sectoral advantage.`);
  }

  if (metrics.merchant.total > 0) {
    insights.push(`Mastercard acceptance footprint spans ${metrics.merchant.total.toLocaleString()} active merchants, supporting scale across POS and ATM channels.`);
  }

  return insights;
}

function computeYtdMetrics(transactions: NormalizedTransaction[], channelFilter: ExecutiveChannel) {
  const ytdStart = new Date('2026-01-01T00:00:00');
  const now = new Date();
  const maxDate = transactions.reduce((max, tx) => (tx.date > max ? tx.date : max), ytdStart);
  const ytdEnd = maxDate < now ? maxDate : now;

  const shouldIncludeChannel = (tx: NormalizedTransaction) => {
    if (tx.channel !== 'POS' && tx.channel !== 'ATM') return false;
    if (channelFilter === 'POS_ATM') return tx.channel === 'POS' || tx.channel === 'ATM';
    return tx.channel === channelFilter;
  };

  const withinRange = (tx: NormalizedTransaction, start: Date, end: Date) => tx.date >= start && tx.date <= end;

  const ytd = { count: 0, volume: 0 };
  const prev = { count: 0, volume: 0 };

  const prevStart = new Date('2025-01-01T00:00:00');
  const prevEnd = new Date(ytdEnd);
  prevEnd.setFullYear(2025);

  transactions.forEach((tx) => {
    if (!shouldIncludeChannel(tx)) return;
    if (tx.scheme !== 'MASTERCARD') return;
    if (withinRange(tx, ytdStart, ytdEnd)) {
      ytd.count += 1;
      ytd.volume += tx.amount;
    }
    if (withinRange(tx, prevStart, prevEnd)) {
      prev.count += 1;
      prev.volume += tx.amount;
    }
  });

  const countGrowth = prev.count ? ((ytd.count - prev.count) / prev.count) * 100 : 0;
  const volumeGrowth = prev.volume ? ((ytd.volume - prev.volume) / prev.volume) * 100 : 0;

  return {
    year: 2026,
    count: ytd.count,
    volume: ytd.volume,
    countGrowth: Number(countGrowth.toFixed(1)),
    volumeGrowth: Number(volumeGrowth.toFixed(1))
  };
}

export function getMastercardAnalytics(transactions: RawTransaction[], filters: ExecutiveFilters): MastercardAnalytics {
  const cache = analyticsCache.get(transactions) || new Map<string, MastercardAnalytics>();
  if (!analyticsCache.has(transactions)) {
    analyticsCache.set(transactions, cache);
  }
  const cacheKey = JSON.stringify(filters);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const normalized = normalizeTransactions(transactions);
  const { start, end, label } = getRangeBounds(normalized, filters);

  const filtered = normalized.filter((tx) => {
    if (tx.channel !== 'POS' && tx.channel !== 'ATM') return false;
    if (filters.channel === 'POS' && tx.channel !== 'POS') return false;
    if (filters.channel === 'ATM' && tx.channel !== 'ATM') return false;
    if (start && tx.date < start) return false;
    if (end && tx.date > end) return false;
    return true;
  });

  const schemeAgg = new Map<Scheme, { count: number; volume: number; revenue: number }>();
  const periodAgg = new Map<string, Map<Scheme, { count: number; volume: number; revenue: number }>>();
  const merchantSet = new Set<string>();
  const merchantTrend = new Map<string, Set<string>>();
  const sectorTotals = new Map<string, number>();
  const sectorMc = new Map<string, { volume: number; merchants: Set<string> }>();
  const yearlyMc = new Map<number, { count: number; volume: number }>();

  filtered.forEach((tx) => {
    const scheme = tx.scheme;
    const amount = tx.amount || 0;
    const revenue = computeRevenue(amount, scheme);
    const schemeEntry = schemeAgg.get(scheme) || { count: 0, volume: 0, revenue: 0 };
    schemeEntry.count += 1;
    schemeEntry.volume += amount;
    schemeEntry.revenue += revenue;
    schemeAgg.set(scheme, schemeEntry);

    const periodKey = getPeriodKey(tx.date, filters.granularity);
    const periodMap = periodAgg.get(periodKey) || new Map<Scheme, { count: number; volume: number; revenue: number }>();
    const periodEntry = periodMap.get(scheme) || { count: 0, volume: 0, revenue: 0 };
    periodEntry.count += 1;
    periodEntry.volume += amount;
    periodEntry.revenue += revenue;
    periodMap.set(scheme, periodEntry);
    periodAgg.set(periodKey, periodMap);

    if (scheme === 'MASTERCARD' && tx.mid) {
      merchantSet.add(tx.mid);
      const set = merchantTrend.get(periodKey) || new Set<string>();
      set.add(tx.mid);
      merchantTrend.set(periodKey, set);
    }

    const sector = mapMccToSector(tx.mcc);
    sectorTotals.set(sector, (sectorTotals.get(sector) || 0) + amount);

    if (scheme === 'MASTERCARD') {
      const sectorEntry = sectorMc.get(sector) || { volume: 0, merchants: new Set<string>() };
      sectorEntry.volume += amount;
      if (tx.mid) sectorEntry.merchants.add(tx.mid);
      sectorMc.set(sector, sectorEntry);

      const year = tx.date.getFullYear();
      const yearEntry = yearlyMc.get(year) || { count: 0, volume: 0 };
      yearEntry.count += 1;
      yearEntry.volume += amount;
      yearlyMc.set(year, yearEntry);
    }
  });

  const totalCount = [...schemeAgg.values()].reduce((s, v) => s + v.count, 0);
  const totalVolume = [...schemeAgg.values()].reduce((s, v) => s + v.volume, 0);
  const totalRevenue = [...schemeAgg.values()].reduce((s, v) => s + v.revenue, 0);

  const schemes: Scheme[] = ['MASTERCARD', 'VISA', 'AMEX', 'OTHER'];

  const schemeAggregates: SchemeAggregate[] = schemes.map((scheme) => {
    const stats = schemeAgg.get(scheme) || { count: 0, volume: 0, revenue: 0 };
    return {
      scheme,
      count: stats.count,
      volume: stats.volume,
      revenue: stats.revenue,
      shareCount: totalCount ? (stats.count / totalCount) * 100 : 0,
      shareVolume: totalVolume ? (stats.volume / totalVolume) * 100 : 0,
      shareRevenue: totalRevenue ? (stats.revenue / totalRevenue) * 100 : 0
    };
  });

  const mcStats = schemeAggregates.find((s) => s.scheme === 'MASTERCARD') || {
    scheme: 'MASTERCARD',
    count: 0,
    volume: 0,
    revenue: 0,
    shareCount: 0,
    shareVolume: 0,
    shareRevenue: 0
  };

  const periodKeys = Array.from(periodAgg.keys()).sort();
  const trend: TrendPoint[] = periodKeys.map((key) => {
    const periodMap = periodAgg.get(key) || new Map();
    const stats = periodMap.get('MASTERCARD' as Scheme) || { count: 0, volume: 0 };
    return {
      period: key,
      count: stats.count,
      volume: stats.volume
    };
  });

  const marketShareTrendCount: MarketShareTrendPoint[] = periodKeys.map((key) => {
    const periodMap = periodAgg.get(key) || new Map();
    const total = schemes.reduce((sum, scheme) => sum + (periodMap.get(scheme)?.count || 0), 0);
    const value = (scheme: Scheme) => {
      const count = periodMap.get(scheme)?.count || 0;
      return total ? (count / total) * 100 : 0;
    };
    return {
      period: key,
      MASTERCARD: value('MASTERCARD'),
      VISA: value('VISA'),
      AMEX: value('AMEX'),
      OTHER: value('OTHER')
    };
  });

  const marketShareTrendVolume: MarketShareTrendPoint[] = periodKeys.map((key) => {
    const periodMap = periodAgg.get(key) || new Map();
    const total = schemes.reduce((sum, scheme) => sum + (periodMap.get(scheme)?.volume || 0), 0);
    const value = (scheme: Scheme) => {
      const volume = periodMap.get(scheme)?.volume || 0;
      return total ? (volume / total) * 100 : 0;
    };
    return {
      period: key,
      MASTERCARD: value('MASTERCARD'),
      VISA: value('VISA'),
      AMEX: value('AMEX'),
      OTHER: value('OTHER')
    };
  });

  const yoy: YoYPoint[] = Array.from(yearlyMc.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, stats], index, arr) => {
      const prev = index > 0 ? arr[index - 1][1] : null;
      const countGrowth = prev && prev.count ? ((stats.count - prev.count) / prev.count) * 100 : 0;
      const volumeGrowth = prev && prev.volume ? ((stats.volume - prev.volume) / prev.volume) * 100 : 0;
      return {
        year,
        count: stats.count,
        volume: stats.volume,
        countGrowth: Number(countGrowth.toFixed(1)),
        volumeGrowth: Number(volumeGrowth.toFixed(1))
      };
    });

  const merchantTrendData: MerchantTrendPoint[] = periodKeys.map((key) => ({
    period: key,
    merchants: merchantTrend.get(key)?.size || 0
  }));

  const sectorDistribution: SectorDistribution[] = Array.from(sectorTotals.entries()).map(([sector, totalVol]) => {
    const mcEntry = sectorMc.get(sector);
    const mcVolume = mcEntry?.volume || 0;
    const merchantCount = mcEntry?.merchants.size || 0;
    return {
      sector,
      merchantCount,
      volume: mcVolume,
      penetration: totalVol ? (mcVolume / totalVol) * 100 : 0
    };
  }).sort((a, b) => b.volume - a.volume);

  const result: MastercardAnalytics = {
    rangeLabel: label,
    dateRange: { start, end },
    totals: { count: totalCount, volume: totalVolume, revenue: totalRevenue },
    mastercard: {
      count: mcStats.count,
      volume: mcStats.volume,
      revenue: mcStats.revenue,
      shareCount: Number(mcStats.shareCount.toFixed(2)),
      shareVolume: Number(mcStats.shareVolume.toFixed(2)),
      shareRevenue: Number(mcStats.shareRevenue.toFixed(2))
    },
    ytd: computeYtdMetrics(normalized, filters.channel),
    trend,
    yoy,
    revenue: { total: totalRevenue, byScheme: schemeAggregates },
    marketShare: {
      byScheme: schemeAggregates,
      trendCount: marketShareTrendCount,
      trendVolume: marketShareTrendVolume
    },
    merchant: { total: merchantSet.size, trend: merchantTrendData },
    sectors: { distribution: sectorDistribution, top: sectorDistribution.slice(0, 7) },
    insights: []
  };

  result.insights = buildInsights(result);
  cache.set(cacheKey, result);
  return result;
}
