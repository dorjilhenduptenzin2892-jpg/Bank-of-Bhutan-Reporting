export type Channel = 'POS' | 'ATM' | 'IPG';
export type Brand = 'Visa' | 'MasterCard' | 'AMEX' | 'Other';
export type FailureCategory = 'Business' | 'Technical' | 'User' | 'Unknown';
export type Currency = 'BTN' | 'USD' | 'INR';

export interface RawAcquiringRow {
  CARD_NETWORK?: string;
  TXN_TYPE?: string;
  TRANSACTION_DATE?: string | Date;
  MID?: string;
  MERCHANT_NAME?: string;
  VALUE?: string | number;
  RRNO?: string;
  MCC?: string;
  CURRENCY?: string | number;
  RESPONSE_CODE?: string;
  RESPONSE_REASON?: string;
  RESPONSE_CATEGORY?: string;
}

export interface ChannelMetrics {
  channel: Channel;
  totalCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  failureRate: number;
  volumes: Record<Currency, number>;
  averageTicket: Record<Currency, number>;
  currencyCounts: Record<Currency, number>;
}

export interface OverallMetrics {
  totalCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  volumes: Record<Currency, number>;
}

export interface BrandChannelMetrics {
  channel: Channel;
  totalCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
}

export interface BrandMetrics {
  brand: Exclude<Brand, 'Other'>;
  totalCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  byChannel: Record<Channel, BrandChannelMetrics>;
  volumes: Record<Currency, number>;
}

export interface FailureCategorySummary {
  category: FailureCategory;
  count: number;
  share: number;
}

export interface FailureCategoryBreakdown {
  totalFailures: number;
  overall: FailureCategorySummary[];
  byChannel: Record<Channel, FailureCategorySummary[]>;
}

export interface FailureReasonRecord {
  reason: string;
  channel: Channel;
  brand: Brand;
  category: FailureCategory;
  count: number;
}

export interface FailureReasonSummary {
  reason: string;
  count: number;
  share: number;
}

export interface FailureReasonFilters {
  channel: Channel | 'ALL';
  brand: Exclude<Brand, 'Other'> | 'ALL';
  category: FailureCategory | 'ALL';
}

export interface AnalyticsMeta {
  rowsLoaded: number;
  rowsProcessed: number;
  invalidRows: number;
  invalidByReason: {
    currencyMismatch: number;
    unknownChannel: number;
  };
}

export interface AnalyticsResult {
  overall: OverallMetrics;
  terminal: ChannelMetrics[];
  brands: BrandMetrics[];
  failureCategories: FailureCategoryBreakdown;
  failureReasonMatrix: FailureReasonRecord[];
  meta: AnalyticsMeta;
}
