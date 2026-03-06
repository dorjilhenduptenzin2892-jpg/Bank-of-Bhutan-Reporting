export type PnlTotals = {
  income: number;
  expense: number;
  net: number;
};

export type SchemeKey = 'VISA' | 'MASTERCARD' | 'AMEX';

export type PnlReport = {
  issuance: PnlTotals;
  acquiring: PnlTotals;
  overall: PnlTotals;
  schemes: Record<SchemeKey, { issuance: PnlTotals; acquiring: PnlTotals; overall: PnlTotals }>;
  glTotals: {
    incomeByGlCode: Record<string, number>;
    expenseByGlCode: Record<string, number>;
  };
};

type ParsedRow = {
  glCode: string;
  glDesc: string;
  balance: number;
  scheme: SchemeKey | 'OTHER' | null;
};

const ACQUIRING_INCOME_CODES = new Set([
  '43000300',
  '42000126',
  '43000500',
  '42000104',
  '42000118',
  '44000204',
  '42000130',
  '42000127',
  '42000129',
  '42000101',
  '42000105',
  '42000123',
  '42000134',
  '42000122',
  '44000202',
  '42000121',
  '44000201',
  '42000119',
  '42000120',
  '42000128',
  '42000133'
]);

const ISSUANCE_INCOME_CODES = new Set([
  '43000200',
  '42000106',
  '44000205',
  '42000107',
  '41000116',
  '42000103',
  '42000102',
  '43000400',
  '45000100',
  '44000306',
  '42000108',
  '42000122',
  '44000313'
]);

const ACQUIRING_EXPENSE_CODES = new Set([
  '35000707',
  '35000709',
  '35000713',
  '32000300',
  '35000704',
  '35000716',
  '35000715',
  '32000200',
  '35000714',
  '35000703'
]);

const ISSUANCE_EXPENSE_CODES = new Set([
  '35000706',
  '35000708',
  '35000705',
  '35000701',
  '32000100'
]);

const normalizeHeader = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const parseBalance = (value: unknown): number => {
  if (value == null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value).trim();
  if (!raw) return 0;
  const negative = /^\(.*\)$/.test(raw);
  const cleaned = raw.replace(/[(),]/g, '').replace(/,/g, '');
  const num = Number.parseFloat(cleaned);
  if (!Number.isFinite(num)) return 0;
  return negative ? -num : num;
};

const parseDebit = (value: unknown): number => Math.abs(parseBalance(value));

const parseGlCode = (value: unknown) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const normalized = raw.replace(/\.0+$/, '');
  const digits = normalized.replace(/[^\d]/g, '');
  return digits || normalized;
};

const getScheme = (glDesc: string): SchemeKey | 'OTHER' | null => {
  const upper = glDesc.toUpperCase();
  if (upper.includes('BFS')) return null;
  if (upper.includes('VISA')) return 'VISA';
  if (upper.includes('AMEX') || upper.includes('AMERICAN EXPRESS')) return 'AMEX';
  if (upper.includes('MASTERCARD') || upper.includes('MASTER') || /(^|[^A-Z])MC([^A-Z]|$)/.test(upper)) return 'MASTERCARD';
  return 'OTHER';
};

const buildTotals = (incomeRows: ParsedRow[], expenseRows: ParsedRow[], incomeCodes: Set<string>, expenseCodes: Set<string>) => {
  const income = incomeRows.filter((r) => incomeCodes.has(r.glCode)).reduce((sum, r) => sum + r.balance, 0);
  const expense = expenseRows
    .filter((r) => expenseCodes.has(r.glCode))
    .reduce((sum, r) => sum + Math.abs(r.balance), 0);
  return { income, expense, net: income - expense };
};

const parseSheetRows = (sheet: any, sheetLabel: 'income' | 'expense'): ParsedRow[] => {
  const rows = (sheet || []) as any[][];
  if (!rows.length) return [];
  const [rawHeaders, ...dataRows] = rows;
  const headers = (rawHeaders || []).map(normalizeHeader);
  const headerIndex = new Map<string, number>();
  headers.forEach((h, idx) => {
    if (h) headerIndex.set(h, idx);
  });

  const requiredCore = ['GL_CODE', 'GL_DESC', 'BALANCE'];
  const requiredExtra = sheetLabel === 'income' ? ['INCOME'] : ['EXPENSE'];
  const required = [...requiredCore, ...requiredExtra];

  const missing = required.filter((h) => !headerIndex.has(h));
  const missingCore = requiredCore.filter((h) => !headerIndex.has(h));
  if (missing.length) {
    if (missingCore.length) {
      throw new Error(`${sheetLabel} sheet is missing column(s): ${missingCore.join(', ')}`);
    }
  }

  const glCodeIdx = headerIndex.get('GL_CODE') ?? -1;
  const glDescIdx = headerIndex.get('GL_DESC') ?? -1;
  const balanceIdx = headerIndex.get('BALANCE') ?? -1;

  return dataRows
    .map((row) => {
      const glCode = parseGlCode(row?.[glCodeIdx]);
      const glDesc = String(row?.[glDescIdx] ?? '').trim();
      let balance = parseBalance(row?.[balanceIdx]);
      const scheme = getScheme(glDesc);
      return {
        glCode,
        glDesc,
        balance,
        scheme
      };
    })
    .filter((row) => row.glCode || row.glDesc || row.balance !== 0);
};

export const parsePnlWorkbook = async (file: File): Promise<PnlReport> => {
  const XLSX = await import('xlsx');
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetNames = workbook.SheetNames || [];
  const lowerMap = new Map(sheetNames.map((name) => [name.toLowerCase(), name]));
  const incomeName = lowerMap.get('income');
  const expenseName = lowerMap.get('expense');
  if (!incomeName || !expenseName) {
    const missing = [
      !incomeName ? 'income' : null,
      !expenseName ? 'expense' : null
    ].filter(Boolean).join(', ');
    throw new Error(`Missing required sheet(s): ${missing}`);
  }

  const incomeSheet = workbook.Sheets[incomeName];
  const expenseSheet = workbook.Sheets[expenseName];
  const incomeRowsRaw = XLSX.utils.sheet_to_json(incomeSheet, { header: 1, defval: '' }) as any[][];
  const expenseRowsRaw = XLSX.utils.sheet_to_json(expenseSheet, { header: 1, defval: '' }) as any[][];

  const incomeRows = parseSheetRows(incomeRowsRaw, 'income');
  const expenseRows = parseSheetRows(expenseRowsRaw, 'expense');

  const incomeByGlCode: Record<string, number> = {};
  const expenseByGlCode: Record<string, number> = {};
  incomeRows.forEach((row) => {
    if (!row.glCode) return;
    incomeByGlCode[row.glCode] = (incomeByGlCode[row.glCode] || 0) + row.balance;
  });
  expenseRows.forEach((row) => {
    if (!row.glCode) return;
    expenseByGlCode[row.glCode] = (expenseByGlCode[row.glCode] || 0) + Math.abs(row.balance);
  });

  const issuance = buildTotals(incomeRows, expenseRows, ISSUANCE_INCOME_CODES, ISSUANCE_EXPENSE_CODES);
  const acquiring = buildTotals(incomeRows, expenseRows, ACQUIRING_INCOME_CODES, ACQUIRING_EXPENSE_CODES);
  const overall = {
    income: issuance.income + acquiring.income,
    expense: issuance.expense + acquiring.expense,
    net: issuance.net + acquiring.net
  };

  const zeroTotals: PnlTotals = { income: 0, expense: 0, net: 0 };
  const schemes: PnlReport['schemes'] = {
    VISA: {
      issuance: buildTotals(incomeRows.filter((r) => r.scheme === 'VISA'), expenseRows.filter((r) => r.scheme === 'VISA'), ISSUANCE_INCOME_CODES, ISSUANCE_EXPENSE_CODES),
      acquiring: buildTotals(incomeRows.filter((r) => r.scheme === 'VISA'), expenseRows.filter((r) => r.scheme === 'VISA'), ACQUIRING_INCOME_CODES, ACQUIRING_EXPENSE_CODES),
      overall: { income: 0, expense: 0, net: 0 }
    },
    MASTERCARD: {
      issuance: zeroTotals,
      acquiring: buildTotals(incomeRows.filter((r) => r.scheme === 'MASTERCARD'), expenseRows.filter((r) => r.scheme === 'MASTERCARD'), ACQUIRING_INCOME_CODES, ACQUIRING_EXPENSE_CODES),
      overall: { income: 0, expense: 0, net: 0 }
    },
    AMEX: {
      issuance: zeroTotals,
      acquiring: buildTotals(incomeRows.filter((r) => r.scheme === 'AMEX'), expenseRows.filter((r) => r.scheme === 'AMEX'), ACQUIRING_INCOME_CODES, ACQUIRING_EXPENSE_CODES),
      overall: { income: 0, expense: 0, net: 0 }
    }
  };

  (Object.keys(schemes) as SchemeKey[]).forEach((key) => {
    const scheme = schemes[key];
    scheme.overall = {
      income: scheme.issuance.income + scheme.acquiring.income,
      expense: scheme.issuance.expense + scheme.acquiring.expense,
      net: scheme.issuance.net + scheme.acquiring.net
    };
  });

  return { issuance, acquiring, overall, schemes, glTotals: { incomeByGlCode, expenseByGlCode } };
};

export const parseGlAdjustmentWorkbook = async (file: File): Promise<number> => {
  const XLSX = await import('xlsx');
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames?.[0];
  if (!sheetName) throw new Error('GL workbook has no sheets.');
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
  if (!rows.length) throw new Error('GL workbook is empty.');

  const [rawHeaders, ...dataRows] = rows;
  const headers = (rawHeaders || []).map(normalizeHeader);
  const headerIndex = new Map<string, number>();
  headers.forEach((h, idx) => {
    if (h) headerIndex.set(h, idx);
  });

  const required = ['PARTICULARS', 'DEBIT'];
  const missing = required.filter((h) => !headerIndex.has(h));
  if (missing.length) {
    throw new Error(`GL workbook missing column(s): ${missing.join(', ')}`);
  }

  const particularsIdx = headerIndex.get('PARTICULARS') ?? -1;
  const debitIdx = headerIndex.get('DEBIT') ?? -1;

  let maxDebit = 0;
  dataRows.forEach((row) => {
    const particulars = String(row?.[particularsIdx] ?? '').trim();
    if (!particulars) return;
    if (!/VDT/i.test(particulars)) return;
    const debit = parseDebit(row?.[debitIdx]);
    if (debit > maxDebit) maxDebit = debit;
  });

  return maxDebit;
};
