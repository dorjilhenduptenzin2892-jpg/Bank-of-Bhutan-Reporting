import React, { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import ChartCard from '../ui/ChartCard';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { parseGstMonthlyPdf, type GstTransactionRow } from '../../lib/gst/pdfParser';
import { generateGstReceiptPdfBlob } from '../../lib/gst/receiptPdf';
// XLSX will be imported dynamically for Vite/ESM compatibility

interface GstCalculatorPageProps {
  onNavigate: (path: '/start' | '/report-analysis') => void;
}

  const CURRENCY_MAP: Record<string, string> = {
    '064': 'BTN',
    '64': 'BTN',
    '356': 'INR',
    '840': 'USD'
  };

const DEFAULT_GST = 5.0;

const formatDate = (date: Date | null): string => {
  if (!date || Number.isNaN(date.getTime())) return 'UNKNOWN';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const toMoney = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const rate = (pct: number) => pct / 100;

const GstCalculatorPage: React.FC<GstCalculatorPageProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<GstTransactionRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importMessage, setImportMessage] = useState('');
  const [midInput, setMidInput] = useState('');
  const [selectedMid, setSelectedMid] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [channelType, setChannelType] = useState<'POS' | 'IPG'>('POS');
  const [gstPct, setGstPct] = useState(DEFAULT_GST);
  // CSV import state
  const [csvLoading, setCsvLoading] = useState(false);
  const [mdrPct, setMdrPct] = useState(3.0);


  const mids = useMemo(() => {
    const unique = new Set<string>();
    rows.forEach((row) => {
      if (row.merchantId) unique.add(row.merchantId);
    });
    return [...unique].sort();
  }, [rows]);

  const selectedMidRows = useMemo(() => rows.filter((row) => row.merchantId === selectedMid), [rows, selectedMid]);

  const merchantName = useMemo(() => selectedMidRows.find((r) => r.merchantName)?.merchantName || '', [selectedMidRows]);

  const currencyCounts = useMemo(() => {
    const counter = new Map<string, number>();
    selectedMidRows.forEach((row) => {
      const code = (row.bilCurr || '').trim() || 'UNKNOWN';
      counter.set(code, (counter.get(code) || 0) + 1);
    });
    return [...counter.entries()].sort((a, b) => b[1] - a[1]);
  }, [selectedMidRows]);

  const hasMultiCurrency = currencyCounts.length > 1;
  // effectiveCurrency: selectedCurrency if chosen, otherwise primaryCurrency
  const primaryCurrency = currencyCounts[0]?.[0] || '';
  const effectiveCurrency = selectedCurrency || primaryCurrency;
  const filteredRows = useMemo(() => {
    if (!selectedMid) return [];
    if (!effectiveCurrency) return [];
    return rows.filter((row) => row.merchantId === selectedMid && (((row.bilCurr || '').trim() || 'UNKNOWN') === effectiveCurrency));
  }, [rows, selectedMid, effectiveCurrency]);

  const summary = useMemo(() => {
    const gross = filteredRows.reduce((sum, row) => sum + row.apprAmt, 0);
    const mdrAmount = gross * rate(mdrPct);
    const gstAmount = mdrAmount * rate(gstPct);
    const totalDeduction = mdrAmount + gstAmount;
    const netPayable = gross - totalDeduction;
    return { gross, mdrAmount, gstAmount, totalDeduction, netPayable };
  }, [filteredRows, gstPct, mdrPct]);

  const periodLabel = useMemo(() => {
    const validDates = filteredRows.map((row) => row.reqDate).filter((date): date is Date => Boolean(date && !Number.isNaN(date.getTime())));
    if (!validDates.length) return 'All Data';
    const min = new Date(Math.min(...validDates.map((d) => d.getTime())));
    const max = new Date(Math.max(...validDates.map((d) => d.getTime())));
    return `${formatDate(min)} to ${formatDate(max)}`;
  }, [filteredRows]);

  const dailyRows = useMemo(() => {
    const grouped = new Map<string, GstTransactionRow[]>();
    filteredRows.forEach((row) => {
      const key = formatDate(row.reqDate);
      const arr = grouped.get(key) || [];
      arr.push(row);
      grouped.set(key, arr);
    });

    return [...grouped.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateLabel, dayRows]) => {
        const gross = dayRows.reduce((sum, row) => sum + row.apprAmt, 0);
        const mdr = gross * rate(mdrPct);
        const gst = mdr * rate(gstPct);
        const net = gross - (mdr + gst);
        return {
          dateLabel,
          txnCount: dayRows.length,
          gross,
          mdr,
          gst,
          net
        };
      });
  }, [filteredRows, gstPct, mdrPct]);

  const uniqueMidCount = mids.length;
  const currencyLabel = effectiveCurrency ? (CURRENCY_MAP[effectiveCurrency] || effectiveCurrency) : '';

  const onImportPdf = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setImportMessage('');
    setWarnings([]);

    try {
      const result = await parseGstMonthlyPdf(file);
      setRows(result.rows);
      setWarnings(result.warnings);
      setMidInput('');
      setSelectedMid('');
      setSelectedCurrency('');
      setChannelType('POS');
      setMdrPct(3.0);
      setGstPct(DEFAULT_GST);
      setImportMessage(`Import successful. Parsed ${result.rows.length} rows across ${new Set(result.rows.map((r) => r.merchantId)).size} unique MIDs.`);
    } catch (error: any) {
      setRows([]);
      setImportMessage(`Import failed: ${error?.message || String(error)}`);
    } finally {
      setLoading(false);
      if (event.target) event.target.value = '';
    }
  };

  // Canonical header mapping
  const HEADER_ALIASES: Record<string, string> = {
    "MERCHANT": "Merchant",
    "MERCHANT ID": "Merchant",
    "MERCHANT NAME": "Merchant Name",
    "TERMINAL": "Terminal",
    "RRN": "RRN",
    "APPR CODE": "Appr Code",
    "APPROVAL CODE": "Appr Code",
    "CARD NO": "Card No",
    "CARD NUMBER": "Card No",
    "REQ DATE": "Req Date",
    "REQUEST DATE": "Req Date",
    "APPR AMT": "Appr Amt",
    "APPROVED AMOUNT": "Appr Amt",
    "BIL CURR": "Bil Curr",
    "BILL CURR": "Bil Curr",
    "BILLING CURRENCY": "Bil Curr",
  };

  function canonicalizeHeader(raw: string): string {
    if (raw == null) return "";
    let s = String(raw)
      .replace(/\r|\n|\\n/g, " ")
      .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
    // Remove punctuation except spaces
    s = s.replace(/[.,:;!?()\[\]{}<>\-_=+|\\/"'`~@#$%^&*]/g, "");
    if (!s) return "";
    return HEADER_ALIASES[s] || s;
  }

  function cleanTxnRow(row: Record<string, string>): GstTransactionRow | null {
    // Drop empty/unnamed columns
    Object.keys(row).forEach((k) => {
      if (!k || !k.trim()) delete row[k];
    });
    // Footer/summary row detection
    const values = Object.values(row);
    if (values.some((v) => /PAGE/i.test(v) && /OF/i.test(v))) return null;
    if (values.some((v) => /^TOTAL/i.test(v) || /^COUNT:/i.test(v))) return null;
    if ((row["Merchant"] ?? "") === "" && (row["Appr Amt"] ?? "") === "" && (row["Card No"] ?? "").toUpperCase().includes("TOTAL")) return null;

    // Extract fields
    const mid = (row["Merchant"] ?? "").trim();
    const merchantName = (row["Merchant Name"] ?? "").trim();
    const terminal = (row["Terminal"] ?? "").trim();
    let rrn = (row["RRN"] ?? "").trim();
    if (/null$/i.test(rrn)) rrn = rrn.replace(/null$/i, "").trim();
    const apprCode = (row["Appr Code"] ?? "").trim();
    const cardNo = (row["Card No"] ?? "").trim();
    const reqDateRaw = (row["Req Date"] ?? "").trim();
    const bilCurr = (row["Bil Curr"] ?? "").trim();
    // Amount
    let apprAmt = NaN;
    if (row["Appr Amt"] != null) {
      apprAmt = Number.parseFloat(row["Appr Amt"].replace(/,/g, ""));
    }
    // Date parsing
    let reqDate: Date | null = null;
    if (reqDateRaw) {
      // Try DD/MM/YYYY or YYYY/MM/DD
      const dmy = reqDateRaw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      const ymd = reqDateRaw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
      if (dmy) {
        const day = Number(dmy[1]), month = Number(dmy[2]), year = Number(dmy[3]);
        reqDate = new Date(year < 100 ? 2000 + year : year, month - 1, day);
      } else if (ymd) {
        const year = Number(ymd[1]), month = Number(ymd[2]), day = Number(ymd[3]);
        reqDate = new Date(year, month - 1, day);
      } else {
        const direct = new Date(reqDateRaw);
        if (!Number.isNaN(direct.getTime())) reqDate = direct;
      }
    }
    // Only valid if MID, amount > 0, valid date
    if (!mid) return null;
    if (!Number.isFinite(apprAmt) || apprAmt <= 0) return null;
    if (!reqDate || Number.isNaN(reqDate.getTime())) return null;
    return {
      merchantId: mid,
      merchantName,
      terminal,
      rrn,
      apprCode,
      cardNo,
      reqDate,
      reqDateRaw,
      apprAmt,
      bilCurr
    };
  }

  // Unified import handler for CSV and Excel
  const onImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCsvLoading(true);
    setImportMessage("");
    setWarnings([]);
    let skippedFooterSummary = 0, skippedMissingMID = 0, skippedInvalidAmount = 0, skippedInvalidDate = 0, keptRows = 0;
    const examples: Record<string, any[]> = {footer: [], mid: [], amt: [], date: []};
    const processRows = (rows: any[], fileType: string) => {
      const gstRows: GstTransactionRow[] = [];
      for (const rawRow of rows) {
        Object.keys(rawRow).forEach((k) => { if (!k || !k.trim()) delete rawRow[k]; });
        const cleaned = cleanTxnRow(rawRow);
        if (!cleaned) {
          const values = Object.values(rawRow);
          if (values.some((v) => /PAGE/i.test(v) && /OF/i.test(v)) || values.some((v) => /^TOTAL/i.test(v) || /^COUNT:/i.test(v)) || ((rawRow["Merchant"] ?? "") === "" && (rawRow["Appr Amt"] ?? "") === "" && (rawRow["Card No"] ?? "").toUpperCase().includes("TOTAL"))) {
            skippedFooterSummary++;
            if (examples.footer.length < 5) examples.footer.push(rawRow);
          } else if (!(rawRow["Merchant"] ?? "")) {
            skippedMissingMID++;
            if (examples.mid.length < 5) examples.mid.push(rawRow);
          } else if (!rawRow["Appr Amt"] || Number.parseFloat(rawRow["Appr Amt"].replace(/,/g, "")) <= 0) {
            skippedInvalidAmount++;
            if (examples.amt.length < 5) examples.amt.push(rawRow);
          } else {
            skippedInvalidDate++;
            if (examples.date.length < 5) examples.date.push(rawRow);
          }
          continue;
        }
        gstRows.push(cleaned);
        keptRows++;
      }
      setRows(gstRows);
      setMidInput("");
      setSelectedMid("");
      setSelectedCurrency("");
      setChannelType('POS');
      setMdrPct(3.0);
      setGstPct(DEFAULT_GST);
      const diag = [
        `${fileType} import successful. Parsed ${gstRows.length} valid rows across ${new Set(gstRows.map((r) => r.merchantId)).size} unique MIDs.`,
        `Skipped: ${skippedFooterSummary} footer/summary, ${skippedMissingMID} missing MID, ${skippedInvalidAmount} invalid amount, ${skippedInvalidDate} invalid date.`
      ];
      setImportMessage(diag.join("\n"));
      const warn: string[] = [];
      if (examples.footer.length) warn.push(`Footer/summary examples: ${examples.footer.map(e => JSON.stringify(e)).join("\n")}`);
      if (examples.mid.length) warn.push(`Missing MID examples: ${examples.mid.map(e => JSON.stringify(e)).join("\n")}`);
      if (examples.amt.length) warn.push(`Invalid amount examples: ${examples.amt.map(e => JSON.stringify(e)).join("\n")}`);
      if (examples.date.length) warn.push(`Invalid date examples: ${examples.date.map(e => JSON.stringify(e)).join("\n")}`);
      setWarnings(warn);
      setCsvLoading(false);
      if (event.target) event.target.value = "";
    };
    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: "greedy",
        transformHeader: canonicalizeHeader,
        transform: (v) => typeof v === "string" ? v.trim() : v,
        complete: (results) => {
          processRows(results.data as any[], 'CSV');
        },
        error: (error) => {
          setRows([]);
          setImportMessage(`CSV import failed: ${error?.message || String(error)}`);
          setCsvLoading(false);
          if (event.target) event.target.value = "";
        }
      });
      setCsvLoading(false);
      if (event.target) event.target.value = "";
    }
  };

    const onSelectMid = (value: string) => {
    setMidInput(value);
    if (mids.includes(value)) {
      setSelectedMid(value);
      setSelectedCurrency('');
    } else {
      setSelectedMid('');
      setSelectedCurrency('');
    }
  };

  const onChannelChange = (value: 'POS' | 'IPG') => {
    setChannelType(value);
    setMdrPct(value === 'POS' ? 3.0 : 3.5);
  };

  const canGenerate = filteredRows.length > 0 && !!selectedMid && !!effectiveCurrency;

  const downloadReceipt = async () => {
    if (!canGenerate) return;
    const blob = await generateGstReceiptPdfBlob({
      merchantId: selectedMid,
      merchantName,
      channelType,
      bilCurrCode: effectiveCurrency,
      bilCurrLabel: currencyLabel,
      gstPct,
      mdrPct,
      gross: summary.gross,
      mdrAmount: summary.mdrAmount,
      gstAmount: summary.gstAmount,
      totalDeduction: summary.totalDeduction,
      netPayable: summary.netPayable,
      periodLabel,
      generatedAt: new Date(),
      dailyRows,
      transactions: filteredRows
    });
    saveAs(blob, `GST_Receipt_${selectedMid}_${currencyLabel || effectiveCurrency}.pdf`);
  };

  const downloadDailyCsv = () => {
    if (!dailyRows.length) return;
    const csv = Papa.unparse(dailyRows.map((row) => ({
      Date: row.dateLabel,
      Txn_Count: row.txnCount,
      Gross: row.gross.toFixed(2),
      MDR: row.mdr.toFixed(2),
      GST: row.gst.toFixed(2),
      Net: row.net.toFixed(2),
      Currency: currencyLabel
    })));
    saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `GST_Annexure_Daily_${selectedMid}.csv`);
  };

  const downloadTransactionsCsv = () => {
    if (!filteredRows.length) return;
    const csv = Papa.unparse(filteredRows.map((row) => ({
      Merchant: row.merchantId,
      Merchant_Name: row.merchantName,
      Terminal: row.terminal,
      RRN: row.rrn,
      Appr_Code: row.apprCode,
      Card_No: row.cardNo,
      Req_Date: row.reqDateRaw || formatDate(row.reqDate),
      Appr_Amt: row.apprAmt.toFixed(2),
      Bil_Curr: row.bilCurr
    })));
    saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `GST_Transactions_${selectedMid}.csv`);
  };

  return (
    <div className="gst-page" style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 16px 56px', fontSize: 15 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <Button btnType="primary" style={{ minWidth: 70, padding: '0 12px' }} onClick={() => onNavigate('/start')}>← Back</Button>
      </div>

      <h1 className="page-title" style={{ marginBottom: 6 }}>GST Calculator</h1>
      <p style={{ marginBottom: 20, color: 'var(--text-secondary)', fontSize: 16 }}>Import monthly report, select MID and channel, then generate Merchant Monthly GST Deduction receipt.</p>

      <section className="kpi-card" style={{ marginBottom: 18 }}>
        <div className="section-title" style={{ marginBottom: 8 }}>Import Monthly CSV or Excel</div>
        <div style={{ marginTop: 8 }}>
          <input id="gst-file-upload" type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={onImportFile} disabled={csvLoading} />
        </div>
        {csvLoading ? <p style={{ marginTop: 8, color: 'var(--accent)' }}>Parsing file...</p> : null}
        {importMessage ? <p style={{ marginTop: 8, color: 'var(--text-secondary)' }}>{importMessage}</p> : null}
        {rows.length > 0 ? <p style={{ marginTop: 6, color: 'var(--text-tertiary)' }}>Rows: {rows.length.toLocaleString()} | Unique MIDs: {uniqueMidCount.toLocaleString()}</p> : null}
      </section>

      {warnings.length > 0 ? (
        <section className="kpi-card" style={{ border: '1px solid var(--warning)', background: '#fffbeb', marginBottom: 18 }}>
          <div className="section-title" style={{ color: 'var(--warning)' }}>Warnings</div>
          <ul style={{ margin: '8px 0 0 18px', maxHeight: 120, overflowY: 'auto', color: 'var(--decline)' }}>
            {warnings.map((warning, idx) => <li key={`${warning}-${idx}`}>{warning}</li>)}
          </ul>
        </section>
      ) : null}

      {rows.length > 0 ? (
        <section className="kpi-card" style={{ marginBottom: 18 }}>
          <div className="section-title">Merchant Selection</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            <div>
              <label htmlFor="mid-input">Merchant (MID)</label>
              <input
                id="mid-input"
                value={midInput}
                onChange={(e) => onSelectMid(e.target.value.trim())}
                placeholder="Type or paste MID"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 6, minHeight: 36, fontSize: 15 }}
              />
            </div>

            <div>
              <label>Merchant Name</label>
              <div style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 6, minHeight: 36, background: 'var(--background)', fontSize: 15 }}>{merchantName || '—'}</div>
            </div>

            <div>
              <label>Detected Currency</label>
              <div style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 6, minHeight: 36, background: 'var(--background)', fontSize: 15 }}>
                {primaryCurrency ? `${CURRENCY_MAP[primaryCurrency] || primaryCurrency} (code ${primaryCurrency})` : '—'}
              </div>
            </div>
          </div>

          {hasMultiCurrency ? (
            <div style={{ marginTop: 10, border: '1px solid var(--warning)', background: '#fffbeb', borderRadius: 8, padding: 10 }}>
              <p style={{ margin: 0, marginBottom: 8, color: 'var(--warning)' }}>Multiple Bil Curr values detected for this MID. Select one currency before generating receipt.</p>
              <select value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)} style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 15 }}>
                <option value="">Select currency</option>
                {currencyCounts.map(([code, count]) => (
                  <option key={code} value={code}>{CURRENCY_MAP[code] || code} (code {code}) - {count} rows</option>
                ))}
              </select>
            </div>
          ) : null}

          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ fontWeight: 600 }}>Channel Type</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="radio" name="channel" checked={channelType === 'POS'} onChange={() => onChannelChange('POS')} /> POS
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="radio" name="channel" checked={channelType === 'IPG'} onChange={() => onChannelChange('IPG')} /> IPG
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 10 }}>
            <div>
              <label htmlFor="gst-rate">GST %</label>
              <input id="gst-rate" type="number" step="0.01" value={gstPct} onChange={(e) => setGstPct(Number(e.target.value) || 0)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 15 }} />
            </div>
            <div>
              <label htmlFor="mdr-rate">MDR %</label>
              <input id="mdr-rate" type="number" step="0.01" value={mdrPct} onChange={(e) => setMdrPct(Number(e.target.value) || 0)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 15 }} />
            </div>
          </div>
        </section>
      ) : null}

        {canGenerate ? (
        <section className="kpi-card" style={{ marginBottom: 18 }}>
          <div className="section-title">Receipt Preview</div>
          <p style={{ marginTop: 0, marginBottom: 8 }}>
            MID: {selectedMid} | Merchant: {merchantName || 'N/A'} | Billing Currency: {currencyLabel} (code {effectiveCurrency})
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className="table-text" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10, background: 'var(--card-bg)', borderRadius: 8, overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: 'var(--background)' }}>
                  {['Metric', 'Amount'].map((head) => (
                    <th key={head} style={{ border: '1px solid var(--line)', padding: 8, textAlign: head === 'Metric' ? 'left' : 'right', fontWeight: 600 }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr><td style={{ border: '1px solid var(--line)', padding: 8 }}>Gross ({currencyLabel})</td><td style={{ border: '1px solid var(--line)', padding: 8, textAlign: 'right' }}>{toMoney(summary.gross)}</td></tr>
                <tr><td style={{ border: '1px solid var(--line)', padding: 8 }}>MDR ({mdrPct.toFixed(2)}%)</td><td style={{ border: '1px solid var(--line)', padding: 8, textAlign: 'right' }}>{toMoney(summary.mdrAmount)}</td></tr>
                <tr><td style={{ border: '1px solid var(--line)', padding: 8 }}>GST ({gstPct.toFixed(2)}%)</td><td style={{ border: '1px solid var(--line)', padding: 8, textAlign: 'right' }}>{toMoney(summary.gstAmount)}</td></tr>
                <tr><td style={{ border: '1px solid var(--line)', padding: 8 }}>Total Deduction</td><td style={{ border: '1px solid var(--line)', padding: 8, textAlign: 'right' }}>{toMoney(summary.totalDeduction)}</td></tr>
                <tr><td style={{ border: '1px solid var(--line)', padding: 8, fontWeight: 700, background: 'var(--background)' }}>Net Payable</td><td style={{ border: '1px solid var(--line)', padding: 8, textAlign: 'right', fontWeight: 700, background: 'var(--background)' }}>{toMoney(summary.netPayable)}</td></tr>
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <Button btnType="primary" onClick={downloadReceipt}>Download Receipt PDF</Button>
            <Button btnType="primary" onClick={downloadTransactionsCsv}>Download Transactions CSV</Button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table-text" style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--card-bg)', borderRadius: 8, overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: 'var(--background)' }}>
                  {['Req Date', 'Txn Count', `Gross (${currencyLabel})`, 'MDR', 'GST', 'Net'].map((head) => (
                    <th key={head} style={{ border: '1px solid var(--line)', padding: 7, textAlign: head.startsWith('Req Date') ? 'left' : 'right', fontWeight: 600 }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dailyRows.map((row) => (
                  <tr key={row.dateLabel}>
                    <td style={{ border: '1px solid var(--line)', padding: 7 }}>{row.dateLabel}</td>
                    <td style={{ border: '1px solid var(--line)', padding: 7, textAlign: 'right' }}>{row.txnCount}</td>
                    <td style={{ border: '1px solid var(--line)', padding: 7, textAlign: 'right' }}>{toMoney(row.gross)}</td>
                    <td style={{ border: '1px solid var(--line)', padding: 7, textAlign: 'right' }}>{toMoney(row.mdr)}</td>
                    <td style={{ border: '1px solid var(--line)', padding: 7, textAlign: 'right' }}>{toMoney(row.gst)}</td>
                    <td style={{ border: '1px solid var(--line)', padding: 7, textAlign: 'right' }}>{toMoney(row.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default GstCalculatorPage;
