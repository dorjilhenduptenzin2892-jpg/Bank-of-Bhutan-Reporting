export type PeriodType = 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'QUARTERLY' | 'CUSTOM';

export interface RawTransaction {
  transaction_datetime: string | Date;
  channel: 'POS' | 'ATM' | 'IPG';
  response_code: string;
  response_description?: string;
  card_network?: string;
  mid?: string;
  amount?: number;
}

function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const d = new Date(value);
  return d;
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function getISOWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

export function bucketTransactions(
  transactions: RawTransaction[],
  period: PeriodType,
  selectedYear?: number
): Record<string, RawTransaction[]> {
  const buckets: Record<string, RawTransaction[]> = {};

  transactions.forEach((tx) => {
    const date = toDate(tx.transaction_datetime);
    if (isNaN(date.getTime())) return;

    if (period === 'YEARLY' && selectedYear && date.getFullYear() !== selectedYear) {
      return;
    }

    let key = '';
    if (period === 'WEEKLY') {
      const { week, year } = getISOWeek(date);
      key = `${year}-W${pad2(week)}`;
    } else if (period === 'MONTHLY') {
      key = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
    } else if (period === 'QUARTERLY') {
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      key = `${date.getFullYear()}-Q${quarter}`;
    } else {
      key = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
    }

    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(tx);
  });

  return buckets;
}

export function sortPeriodKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const normalize = (value: string) => value.replace('W', '-');
    const da = normalize(a).split('-').map(Number);
    const db = normalize(b).split('-').map(Number);
    for (let i = 0; i < Math.max(da.length, db.length); i += 1) {
      const diff = (da[i] || 0) - (db[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });
}

export function getDateRange(transactions: RawTransaction[]): { start: Date | null; end: Date | null } {
  const dates = transactions
    .map((tx) => toDate(tx.transaction_datetime))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    start: dates[0] || null,
    end: dates[dates.length - 1] || null
  };
}
