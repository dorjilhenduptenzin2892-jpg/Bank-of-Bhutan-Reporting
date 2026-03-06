import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { parseGlAdjustmentWorkbook, parsePnlWorkbook, type PnlReport, type PnlTotals, type SchemeKey } from '../../lib/pnl/pnlParser';

interface PnlAnalysisPageProps {
  onNavigate: (path: '/start' | '/report-analysis' | '/gst-calculator' | '/pnl-analysis') => void;
}

const formatMoney = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PnlTable: React.FC<{ title: string; data: PnlTotals }> = ({ title, data }) => (
  <div
    style={{
      border: '1px solid var(--line)',
      borderRadius: 14,
      padding: 14,
      background: 'var(--card-bg)',
      boxShadow: '0 10px 20px rgba(15, 23, 42, 0.06)'
    }}
  >
    <div style={{ fontWeight: 800, marginBottom: 10, letterSpacing: 0.2 }}>{title}</div>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
      <thead>
        <tr style={{ background: 'var(--background)' }}>
          {['Income', 'Expense', 'Net'].map((head) => (
            <th key={head} style={{ border: '1px solid var(--line)', padding: 8, textAlign: 'right', fontWeight: 600 }}>
              {head}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ border: '1px solid var(--line)', padding: 8, textAlign: 'right' }}>{formatMoney(data.income)}</td>
          <td style={{ border: '1px solid var(--line)', padding: 8, textAlign: 'right' }}>{formatMoney(data.expense)}</td>
          <td style={{ border: '1px solid var(--line)', padding: 8, textAlign: 'right', fontWeight: 800, color: 'var(--accent)' }}>
            {formatMoney(data.net)}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);

const PnlAnalysisPage: React.FC<PnlAnalysisPageProps> = ({ onNavigate }) => {
  const [report, setReport] = useState<PnlReport | null>(null);
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [prevGlMax, setPrevGlMax] = useState<number | null>(null);
  const [nextGlMax, setNextGlMax] = useState<number | null>(null);
  const [glError, setGlError] = useState('');
  const [activeScheme, setActiveScheme] = useState<SchemeKey>('VISA');

  const applyVisaAdjustment = (base: PnlReport): PnlReport => {
    if (prevGlMax == null || nextGlMax == null) return base;
    const glBase = base.glTotals.expenseByGlCode['32000100'] ?? 0;
    const adjustment = (glBase - prevGlMax) + nextGlMax;

    const issuance = {
      income: base.issuance.income,
      expense: base.issuance.expense + adjustment,
      net: base.issuance.net - adjustment
    };
    const overall = {
      income: base.overall.income,
      expense: base.overall.expense + adjustment,
      net: base.overall.net - adjustment
    };
    const schemes = {
      ...base.schemes,
      VISA: {
        issuance: {
          income: base.schemes.VISA.issuance.income,
          expense: base.schemes.VISA.issuance.expense + adjustment,
          net: base.schemes.VISA.issuance.net - adjustment
        },
        acquiring: base.schemes.VISA.acquiring,
        overall: {
          income: base.schemes.VISA.overall.income,
          expense: base.schemes.VISA.overall.expense + adjustment,
          net: base.schemes.VISA.overall.net - adjustment
        }
      }
    };

    return { ...base, issuance, overall, schemes };
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const result = await parsePnlWorkbook(file);
      setReport(result);
      setFilename(file.name);
      setPrevGlMax(null);
      setNextGlMax(null);
      setGlError('');
    } catch (err: any) {
      setReport(null);
      setFilename('');
      setError(err?.message || 'Failed to parse P&L workbook. Please check the sheet names and columns.');
    } finally {
      setLoading(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleGlUpload = (setter: (value: number | null) => void) => async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setGlError('');
    try {
      const maxDebit = await parseGlAdjustmentWorkbook(file);
      setter(maxDebit);
    } catch (err: any) {
      setter(null);
      setGlError(err?.message || 'Failed to parse GL workbook.');
    } finally {
      if (event.target) event.target.value = '';
    }
  };

  const schemes: SchemeKey[] = ['VISA', 'MASTERCARD', 'AMEX'];

  const displayReport = report ? applyVisaAdjustment(report) : null;

  return (
    <div
      className="gst-page"
      style={{
        maxWidth: 1180,
        margin: '0 auto',
        padding: '28px 16px 72px',
        fontSize: 15,
        background:
          'radial-gradient(circle at 20% 10%, rgba(14, 116, 144, 0.12), transparent 55%), radial-gradient(circle at 85% 0%, rgba(34, 197, 94, 0.12), transparent 55%)'
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <Button btnType="primary" style={{ minWidth: 70, padding: '0 12px' }} onClick={() => onNavigate('/start')}>← Back</Button>
      </div>

      <div
        style={{
          borderRadius: 18,
          padding: '18px 20px',
          border: '1px solid var(--line)',
          background: 'linear-gradient(135deg, rgba(13,148,136,0.18) 0%, rgba(251,191,36,0.12) 100%)',
          marginBottom: 18
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 800, color: '#0f766e' }}>ADC Division</div>
            <h1 className="page-title" style={{ margin: '6px 0 4px', fontFamily: 'Georgia, "Times New Roman", serif' }}>P&amp;L Analysis</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>
              Import monthly raw ledger data to generate Issuance, Acquiring, and Overall P&amp;L.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {filename ? (
              <span
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid var(--line)',
                  background: 'var(--card-bg)',
                  fontSize: 13,
                  color: 'var(--text-secondary)'
                }}
              >
                File: {filename}
              </span>
            ) : null}
            <span
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                background: 'rgba(15, 118, 110, 0.12)',
                color: '#0f766e',
                fontSize: 12,
                fontWeight: 700
              }}
            >
              Income + Expense Sheets
            </span>
          </div>
        </div>
      </div>

      <section className="kpi-card" style={{ marginBottom: 18, borderRadius: 18, border: '1px solid var(--line)' }}>
        <div className="section-title" style={{ marginBottom: 8 }}>Import Raw Data</div>
        <label htmlFor="pnl-file-upload">
          <Button btnType="secondary" as="span">Upload Excel</Button>
          <input
            id="pnl-file-upload"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleUpload}
            disabled={loading}
            style={{ display: 'none' }}
          />
        </label>
        {loading ? <p style={{ marginTop: 8, color: 'var(--accent)' }}>Parsing file...</p> : null}
        {error ? <p style={{ marginTop: 8, color: 'var(--decline)' }}>{error}</p> : null}
      </section>

      {report ? (
        <>
          <section className="kpi-card" style={{ marginBottom: 18, borderRadius: 18, border: '1px solid var(--line)' }}>
            <div className="section-title">VISA GL Adjustment (Expense)</div>
            <p style={{ marginTop: 6, color: 'var(--text-secondary)' }}>
              Upload previous and next month GL files to compute the VISA adjustment for GL <span className="font-mono">32000100</span>.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10, alignItems: 'center' }}>
              <label htmlFor="gl-prev-upload">
                <Button btnType="secondary" as="span">Upload Previous Month GL</Button>
                <input id="gl-prev-upload" type="file" accept=".xlsx,.xls" onChange={handleGlUpload(setPrevGlMax)} style={{ display: 'none' }} />
              </label>
              <label htmlFor="gl-next-upload">
                <Button btnType="secondary" as="span">Upload Next Month GL</Button>
                <input id="gl-next-upload" type="file" accept=".xlsx,.xls" onChange={handleGlUpload(setNextGlMax)} style={{ display: 'none' }} />
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Prev max debit: {prevGlMax == null ? '—' : formatMoney(prevGlMax)}</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Next max debit: {nextGlMax == null ? '—' : formatMoney(nextGlMax)}</span>
              </div>
            </div>
            {report ? (
              <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                GL32000100 balance: {formatMoney(report.glTotals.expenseByGlCode['32000100'] ?? 0)} | Adjustment: {prevGlMax == null || nextGlMax == null ? '—' : formatMoney((report.glTotals.expenseByGlCode['32000100'] ?? 0) - prevGlMax + nextGlMax)}
              </div>
            ) : null}
            {glError ? <p style={{ marginTop: 8, color: 'var(--decline)' }}>{glError}</p> : null}
          </section>

          <section className="kpi-card" style={{ marginBottom: 18, borderRadius: 18, border: '1px solid var(--line)' }}>
            <div className="section-title">P&amp;L Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginTop: 12 }}>
              <PnlTable title="Issuance P&L" data={displayReport!.issuance} />
              <PnlTable title="Acquiring P&L" data={displayReport!.acquiring} />
            </div>
            <div style={{ marginTop: 14 }}>
              <PnlTable title="Overall P&L" data={displayReport!.overall} />
            </div>
          </section>

          <section className="kpi-card" style={{ marginBottom: 18, borderRadius: 18, border: '1px solid var(--line)' }}>
            <div className="section-title">Card Scheme Breakdown</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              {schemes.map((scheme) => (
                <button
                  key={scheme}
                  type="button"
                  onClick={() => setActiveScheme(scheme)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 999,
                    border: activeScheme === scheme ? '2px solid #0f766e' : '1px solid var(--line)',
                    background: activeScheme === scheme ? 'rgba(15, 118, 110, 0.12)' : 'var(--card-bg)',
                    color: activeScheme === scheme ? '#0f766e' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {scheme}
                </button>
              ))}
            </div>
            {(() => {
              const scheme = activeScheme;
              const data = displayReport!.schemes[scheme];
              const showIssuance = scheme === 'VISA';
              return (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                    {showIssuance ? <PnlTable title={`${scheme} Issuance`} data={data.issuance} /> : null}
                    <PnlTable title={`${scheme} Acquiring`} data={data.acquiring} />
                  </div>
                  {showIssuance ? (
                    <div style={{ marginTop: 12 }}>
                      <PnlTable title={`${scheme} Overall`} data={data.overall} />
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </section>
        </>
      ) : null}
    </div>
  );
};

export default PnlAnalysisPage;
