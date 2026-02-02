
export interface TransactionRecord {
  CARD_NETWORK: string;
  TXN_TYPE: string;
  TRANSACTION_DATE: string | Date;
  MID: string;
  MERCHANT_NAME: string;
  VALUE: number;
  RRNO: string;
  MCC: string;
  CURRENCY: string;
  "Success/failure": string;
  RESPONSE_CODE: string;
  RESPONSE_REASON: string;
  RESPONSE_CATEGORY: string;
}

export interface StandardizedDecline {
  description: string;
  volume: number;
  typicalCause: string;
}

export type ReportType = 'POS' | 'ATM';

export interface ReportData {
  reportType: ReportType;
  successRate: number;
  failureRate: number;
  dateRange: string;
  year: string;
  businessFailures: StandardizedDecline[];
  technicalFailures: StandardizedDecline[];
  totalTransactions: number;
  narrative: string;
}

export interface DictionaryEntry {
  normalizedDescription: string;
  typicalCause: string;
}
