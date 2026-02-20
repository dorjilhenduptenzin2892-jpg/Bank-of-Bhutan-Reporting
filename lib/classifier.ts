import { TECHNICAL_CODE_DICTIONARY } from '../constants';
import type { ReportType } from '../types';

export type DeclineCategory = 'success' | 'business_decline' | 'user_decline' | 'technical_decline';

export const IPG_USER_CODES = new Set(['13', '14', '51', '54', '55', '61', '65', '78', 'N7']);
export const POS_ATM_USER_CODES = new Set(['13', '14', '51', '54', '55', '61', '65', '78', 'N7']);
export const TECHNICAL_CODES = new Set(Object.keys(TECHNICAL_CODE_DICTIONARY));

function normalizeCode(code: string | number | null | undefined): string {
  if (code === null || code === undefined) return '';
  let normalized = String(code).trim().toUpperCase();
  if (/^\d+$/.test(normalized)) {
    if (normalized.length === 1) {
      normalized = normalized.padStart(2, '0');
    } else if (normalized.length > 2) {
      normalized = normalized.replace(/^0+(?=\d{2}$)/, '');
    }
  }
  return normalized;
}

export function classifyResponse(channel: ReportType, responseCode: string): DeclineCategory {
  const code = normalizeCode(responseCode);
  if (code === '00' || code === '0') return 'success';
  if (channel === 'IPG' && IPG_USER_CODES.has(code)) return 'user_decline';
  if ((channel === 'POS' || channel === 'ATM') && POS_ATM_USER_CODES.has(code)) return 'user_decline';
  if (TECHNICAL_CODES.has(code)) return 'technical_decline';
  return 'business_decline';
}

export function normalizeResponseCode(code: string | number | null | undefined): string {
  return normalizeCode(code);
}
