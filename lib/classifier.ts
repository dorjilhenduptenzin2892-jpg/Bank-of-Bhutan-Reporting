import { TECHNICAL_CODE_DICTIONARY } from '../constants';
import type { ReportType } from '../types';

export type DeclineCategory = 'success' | 'business_decline' | 'user_decline' | 'technical_decline';

export const IPG_USER_CODES = new Set(['N7', '78', '61', '54', '51']);
export const POS_ATM_USER_CODES = new Set(['61', '54', '51', '13', '14', '55', '65', '78']);
export const TECHNICAL_CODES = new Set(Object.keys(TECHNICAL_CODE_DICTIONARY));

function normalizeCode(code: string | number | null | undefined): string {
  if (code === null || code === undefined) return '';
  return String(code).trim().toUpperCase();
}

export function classifyResponse(channel: ReportType, responseCode: string): DeclineCategory {
  const code = normalizeCode(responseCode);
  if (code === '00') return 'success';
  if (channel === 'IPG' && IPG_USER_CODES.has(code)) return 'user_decline';
  if ((channel === 'POS' || channel === 'ATM') && POS_ATM_USER_CODES.has(code)) return 'user_decline';
  if (TECHNICAL_CODES.has(code)) return 'technical_decline';
  return 'business_decline';
}

export function normalizeResponseCode(code: string | number | null | undefined): string {
  return normalizeCode(code);
}
