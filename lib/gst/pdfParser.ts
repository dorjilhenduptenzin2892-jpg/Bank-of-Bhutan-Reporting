import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString();

export interface GstTransactionRow {
  merchantId: string;
  merchantName: string;
  terminal: string;
  rrn: string;
  apprCode: string;
  cardNo: string;
  reqDate: Date | null;
  reqDateRaw: string;
  apprAmt: number;
  bilCurr: string;
}

export interface GstParseResult {
  rows: GstTransactionRow[];
  warnings: string[];
}

type TextToken = {
  text: string;
  x: number;
  y: number;
  page: number;
};

type ColumnLayout = {
  starts: number[];
};

type LineEntry = {
  key: string;
  page: number;
  y: number;
  tokens: TextToken[];
};

const HEADER_COLUMNS = 9;

const normalize = (value: string): string => value.toUpperCase().replace(/\s+/g, ' ').trim();

const cleanAmount = (raw: string): number => {
  const cleaned = raw.replace(/,/g, '').replace(/[^0-9.-]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const parseDate = (raw: string): Date | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) return direct;

  const match = trimmed.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const findByXRange = (
  tokens: TextToken[],
  matcher: (token: TextToken) => boolean,
  minX: number,
  maxX: number
): TextToken | undefined => tokens.find((token) => token.x >= minX && token.x <= maxX && matcher(token));

const buildLayoutFromHeaderTokens = (tokens: TextToken[]): ColumnLayout | null => {
  if (!tokens.length) return null;

  const merchantMid = findByXRange(tokens, (t) => /MERCHANT/.test(normalize(t.text)) && !/NAME/.test(normalize(t.text)), 360, 410);
  const merchantName = findByXRange(tokens, (t) => /MERCHANT|NAME/.test(normalize(t.text)), 410, 450);
  const terminal = findByXRange(tokens, (t) => /TERMINA/.test(normalize(t.text)), 450, 490);
  const rrn = findByXRange(tokens, (t) => /RRN/.test(normalize(t.text)), 530, 570);
  const apprCode = findByXRange(tokens, (t) => /APPR/.test(normalize(t.text)), 700, 740);
  const cardNo = findByXRange(tokens, (t) => /CARD/.test(normalize(t.text)), 20, 120);
  const reqDate = findByXRange(tokens, (t) => /REQ/.test(normalize(t.text)), 610, 640);
  const apprAmt = findByXRange(tokens, (t) => /APPR/.test(normalize(t.text)), 330, 380);
  const bilCurr = findByXRange(tokens, (t) => /BIL/.test(normalize(t.text)), 290, 320);

  if (!merchantMid || !merchantName || !terminal || !rrn || !apprCode || !cardNo || !reqDate || !apprAmt || !bilCurr) {
    return null;
  }

  return {
    starts: [
      merchantMid.x,
      merchantName.x,
      terminal.x,
      rrn.x,
      apprCode.x,
      cardNo.x,
      reqDate.x,
      apprAmt.x,
      bilCurr.x
    ]
  };
};

const assignColumn = (x: number, starts: number[]): number => {
  let col = 0;
  for (let i = 0; i < starts.length; i += 1) {
    if (x >= starts[i]) {
      col = i;
      continue;
    }
    break;
  }
  return Math.min(col, HEADER_COLUMNS - 1);
};

const isHeaderText = (lineText: string): boolean => {
  const text = normalize(lineText);
  return text.includes('MERCHANT') && text.includes('RRN') && text.includes('APPR') && text.includes('BIL');
};

const isContinuationLine = (cells: string[]): boolean => {
  const [merchantIdRaw, merchantNameRaw, terminalRaw, rrnRaw, apprCodeRaw, cardNoRaw, reqDateRaw, apprAmtRaw, bilCurrRaw] = cells;
  const hasOnlyMerchantColumns = !terminalRaw && !rrnRaw && !apprCodeRaw && !cardNoRaw && !reqDateRaw && !apprAmtRaw && !bilCurrRaw;
  return hasOnlyMerchantColumns && (!!merchantIdRaw || !!merchantNameRaw);
};

const isLikelyDataRow = (cells: string[]): boolean => {
  const [, , , rrnRaw, , cardNoRaw, , apprAmtRaw] = cells;
  const cardMasked = /\d{4,6}\*{4,}\d{2,6}/.test(cardNoRaw);
  return rrnRaw.length > 0 || apprAmtRaw.length > 0 || cardMasked;
};

export const parseGstMonthlyPdf = async (file: File): Promise<GstParseResult> => {
  const warnings: string[] = [];
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = getDocument({ data: bytes });
  const pdf = await loadingTask.promise;

  const tokens: TextToken[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    for (const item of textContent.items as any[]) {
      const text = String(item.str || '').trim();
      if (!text) continue;
      const transform = item.transform || [];
      tokens.push({
        text,
        x: Number(transform[4] || 0),
        y: Number(transform[5] || 0),
        page: pageNumber
      });
    }
  }

  const rowsByLine = new Map<string, TextToken[]>();
  for (const token of tokens) {
    const yBucket = Math.round(token.y / 2) * 2;
    const key = `${token.page}:${yBucket}`;
    const current = rowsByLine.get(key) || [];
    current.push(token);
    rowsByLine.set(key, current);
  }

  const lineEntries: LineEntry[] = [...rowsByLine.entries()].map(([key, entryTokens]) => {
    const [pageRaw, yRaw] = key.split(':');
    return {
      key,
      page: Number.parseInt(pageRaw, 10),
      y: Number.parseInt(yRaw, 10),
      tokens: entryTokens
    };
  });

  lineEntries.sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    return b.y - a.y;
  });

  const layoutByPage = new Map<number, ColumnLayout>();
  for (let page = 1; page <= pdf.numPages; page += 1) {
    const pageLines = lineEntries.filter((entry) => entry.page === page && entry.y >= 450);
    const headerLines = pageLines.filter((entry) => isHeaderText(entry.tokens.map((t) => t.text).join(' ')));
    const headerTokens = headerLines.flatMap((entry) => entry.tokens);
    const layout = buildLayoutFromHeaderTokens(headerTokens);
    if (layout) {
      layoutByPage.set(page, layout);
    }
  }

  const parsedRows: GstTransactionRow[] = [];

  for (let i = 0; i < lineEntries.length; i += 1) {
    const currentLine = lineEntries[i];
    const layout = layoutByPage.get(currentLine.page);
    if (!layout) continue;

    const ordered = [...currentLine.tokens].sort((a, b) => a.x - b.x);
    const lineText = ordered.map((t) => t.text).join(' ').trim();
    if (!lineText || isHeaderText(lineText)) continue;

    const cells = new Array<string>(HEADER_COLUMNS).fill('');
    for (const token of ordered) {
      const idx = assignColumn(token.x, layout.starts);
      cells[idx] = `${cells[idx]} ${token.text}`.trim();
    }

    if (!isLikelyDataRow(cells) || isContinuationLine(cells)) continue;

    const [merchantIdRaw, merchantNameRaw, terminalRaw, rrnRaw, apprCodeRaw, cardNoRaw, reqDateRaw, apprAmtRaw, bilCurrRaw] = cells;
    let merchantId = merchantIdRaw.trim();
    let merchantName = merchantNameRaw.trim();

    const nextLine = lineEntries[i + 1];
    if (nextLine && nextLine.page === currentLine.page && currentLine.y - nextLine.y <= 12 && currentLine.y - nextLine.y >= 4) {
      const nextOrdered = [...nextLine.tokens].sort((a, b) => a.x - b.x);
      const nextCells = new Array<string>(HEADER_COLUMNS).fill('');
      for (const token of nextOrdered) {
        const idx = assignColumn(token.x, layout.starts);
        nextCells[idx] = `${nextCells[idx]} ${token.text}`.trim();
      }
      if (isContinuationLine(nextCells)) {
        merchantId = `${merchantId} ${nextCells[0]}`.trim();
        merchantName = `${merchantName} ${nextCells[1]}`.trim();
      }
    }

    const amount = cleanAmount(apprAmtRaw);
    const bilCurr = bilCurrRaw.trim();

    if (!merchantId || Number.isNaN(amount)) {
      warnings.push(`Skipped row due to missing MID or amount: "${lineText}"`);
      continue;
    }

    parsedRows.push({
      merchantId,
      merchantName,
      terminal: terminalRaw.trim(),
      rrn: rrnRaw.trim(),
      apprCode: apprCodeRaw.trim(),
      cardNo: cardNoRaw.trim(),
      reqDate: parseDate(reqDateRaw),
      reqDateRaw: reqDateRaw.trim(),
      apprAmt: amount,
      bilCurr
    });
  }

  if (!parsedRows.length) {
    warnings.push('No transaction rows were parsed. Please verify the uploaded PDF format and header names.');
  }

  return { rows: parsedRows, warnings };
};
