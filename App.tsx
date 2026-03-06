import React, { useEffect, useMemo, useRef, useState } from 'react';
import { processExcel } from './services/excelProcessor';
import { ReportType } from './types';
import type { PeriodType, RawTransaction } from './lib/bucketing';
import type { BucketKPI } from './lib/kpi';
import { computeKpiByBucket } from './lib/kpi';
import { getDateRange } from './lib/bucketing';
import { classifyResponse } from './lib/classifier';
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, LabelList, Legend, AreaChart, Area, ScatterChart, Scatter } from 'recharts';
import { generateCentralBankDocxBlob } from './lib/centralBankDocx';
import { buildCentralBankReportData } from './lib/centralBankData';
import AcquiringAnalyticsPage from './components/AcquiringAnalytics/AcquiringAnalyticsPage';
import { ThemeProvider } from './theme/ThemeProvider';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { KpiCard } from './components/ui/KpiCard';
import { Button } from './components/ui/Button';
import OverviewAcquiringTable from './components/OverviewAcquiringTable';
import StartPage from './components/StartPage';
import GstCalculatorPage from './components/gst/GstCalculatorPage';
import PnlAnalysisPage from './components/pnl/PnlAnalysisPage';

const UI_VIEW = true;
const UI_BUILD = '2026-02-04.4';
type AppRoute = '/start' | '/report-analysis' | '/gst-calculator' | '/pnl-analysis';

const normalizeRoute = (pathname: string): AppRoute => {
  if (pathname === '/' || pathname === '/start' || pathname === '/home') return '/start';
  if (pathname === '/gst-calculator') return '/gst-calculator';
  if (pathname === '/report-analysis') return '/report-analysis';
  if (pathname === '/pnl-analysis') return '/pnl-analysis';
  return '/start';
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [transactions, setTransactions] = useState<RawTransaction[]>([]);
  const [buckets, setBuckets] = useState<BucketKPI[]>([]);
  const [dateRange, setDateRange] = useState('');
  const [bucketFocus, setBucketFocus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<ReportType>('POS');
  const [period, setPeriod] = useState<PeriodType>('MONTHLY');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activePage, setActivePage] = useState<'KPI' | 'ACQUIRING_ANALYTICS'>('KPI');
  const [route, setRoute] = useState<AppRoute>(() => normalizeRoute(window.location.pathname));

  const trendChartRef = useRef<HTMLDivElement | null>(null);
  const compositionChartRef = useRef<HTMLDivElement | null>(null);
  const volumeVsSuccessChartRef = useRef<HTMLDivElement | null>(null);

  const navigate = (path: AppRoute) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setRoute(path);
  };

  useEffect(() => {
    const onPopState = () => setRoute(normalizeRoute(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (window.location.pathname === '/' || window.location.pathname === '/home') {
      window.history.replaceState({}, '', '/start');
      setRoute('/start');
    }
  }, []);

  const handleTypeChange = (type: ReportType) => {
    setReportType(type);
    setError(null);
  };

  const aggregationPeriod: PeriodType = period === 'CUSTOM' ? 'DAILY' : period;

  const dateBounds = useMemo(() => {
    const dates = transactions
      .map((tx) => new Date(tx.transaction_datetime))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    const min = dates[0];
    const max = dates[dates.length - 1];
    return {
      min: min ? min.toISOString().slice(0, 10) : '',
      max: max ? max.toISOString().slice(0, 10) : ''
    };
  }, [transactions]);

  const operationalTransactions = useMemo(() => {
    let filtered = transactions.filter((tx) => tx.channel === reportType);

    if (period === 'CUSTOM' && customStart && customEnd) {
      const startDate = new Date(`${customStart}T00:00:00`);
      const endDate = new Date(`${customEnd}T23:59:59.999`);
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        filtered = filtered.filter((tx) => {
          const date = new Date(tx.transaction_datetime);
          if (isNaN(date.getTime())) return false;
          return date >= startDate && date <= endDate;
        });
      }
    }

    return filtered;
  }, [customEnd, customStart, period, reportType, transactions]);

  const centralReportTransactions = useMemo(() => {
    let filtered = transactions.filter((tx) => tx.channel === reportType);

    // Central bank report must include all card schemes.
    if (period === 'CUSTOM' && customStart && customEnd) {
      const startDate = new Date(`${customStart}T00:00:00`);
      const endDate = new Date(`${customEnd}T23:59:59.999`);
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        filtered = filtered.filter((tx) => {
          const date = new Date(tx.transaction_datetime);
          if (isNaN(date.getTime())) return false;
          return date >= startDate && date <= endDate;
        });
      }
    }

    return filtered;
  }, [customEnd, customStart, period, reportType, transactions]);

  useEffect(() => {
    if (operationalTransactions.length === 0) {
      setBuckets([]);
      setDateRange('');
      return;
    }
    const updatedBuckets = computeKpiByBucket(operationalTransactions, reportType, aggregationPeriod);
    const { start, end } = getDateRange(operationalTransactions);
    const range = start && end ? `${start.toLocaleDateString()} – ${end.toLocaleDateString()}` : 'N/A';
    setBuckets(updatedBuckets);
    if (updatedBuckets.length > 0) {
      setBucketFocus(updatedBuckets[updatedBuckets.length - 1].period);
    } else {
      setBucketFocus('');
    }
    setDateRange(range);
  }, [aggregationPeriod, operationalTransactions, reportType]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      setLoadingStep('Parsing Excel data...');
      const result = await processExcel(file, reportType, aggregationPeriod);
      const channelCounts = result.transactions.reduce<Record<ReportType, number>>(
        (acc, tx) => {
          if (tx.channel === 'POS' || tx.channel === 'ATM' || tx.channel === 'IPG') {
            acc[tx.channel] += 1;
          }
          return acc;
        },
        { POS: 0, ATM: 0, IPG: 0 }
      );
      const dominantChannel = (Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as ReportType) || reportType;

      setReportType(dominantChannel);
      // Clear custom date constraints on new file import to avoid stale narrow filtering.
      setCustomStart('');
      setCustomEnd('');
      setTransactions(result.transactions);
      setBuckets(result.buckets);
      setDateRange(result.dateRange);
    } catch (err: any) {
      setError(err.message || 'Failed to process file. Please check the Excel format.');
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingStep('');
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleCentralExport = async () => {
    if (!transactions.length) {
      setError('No ledger loaded. Import an Excel file before generating the Central Bank report.');
      return;
    }
    if (!centralReportTransactions.length) {
      setError('No transactions match the selected channel/date filters. Central Bank report ignores card scheme filter.');
      return;
    }
    try {
      setError(null);
      const { reportData, kpiReport } = buildCentralBankReportData(reportType, centralReportTransactions);
      const blob = await generateCentralBankDocxBlob(reportData, kpiReport);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const now = new Date();
      const month = now.toLocaleString('en-US', { month: 'short' });
      const year = now.getFullYear();
      link.download = `Acquiring_Review_RMA ${reportType} ${month} ${year}.docx`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err: any) {
      console.error('Central export error:', err);
      const errorMsg = err.message || String(err);
      setError(`Failed to generate Central Bank document (client export): ${errorMsg}`);
    }
  };

  const copyChartImage = async (container: HTMLDivElement | null) => {
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    try {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 1200;
        canvas.height = img.height || 600;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          if (navigator.clipboard && (window as any).ClipboardItem) {
            await navigator.clipboard.write([
              new (window as any).ClipboardItem({ 'image/png': blob })
            ]);
          }
        }, 'image/png');
      };
      img.src = url;
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  };

  const downloadChartImage = async (container: HTMLDivElement | null, filename: string) => {
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width || 1200;
      canvas.height = img.height || 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
      }, 'image/png');
    };
    img.src = url;
  };

  const overallCounts = useMemo(() => {
    let success = 0;
    let business = 0;
    let user = 0;
    let technical = 0;
    operationalTransactions.forEach((tx) => {
      const category = classifyResponse(reportType, tx.response_code);
      if (category === 'success') success += 1;
      if (category === 'business_decline') business += 1;
      if (category === 'user_decline') user += 1;
      if (category === 'technical_decline') technical += 1;
    });
    const total = operationalTransactions.length;
    const decline = total - success;
    return { total, success, decline, business, user, technical };
  }, [operationalTransactions, reportType]);

  const kpiTrends = useMemo(() => {
    if (buckets.length < 2) {
      return {
        success: undefined,
        decline: undefined,
        business: undefined,
        user: undefined,
        technical: undefined
      } as const;
    }
    const latest = buckets[buckets.length - 1];
    const prev = buckets[buckets.length - 2];
    return {
      success: Number((latest.success_rate - prev.success_rate).toFixed(2)),
      decline: Number(((100 - latest.success_rate) - (100 - prev.success_rate)).toFixed(2)),
      business: Number((latest.business_rate - prev.business_rate).toFixed(2)),
      user: Number((latest.user_rate - prev.user_rate).toFixed(2)),
      technical: Number((latest.technical_rate - prev.technical_rate).toFixed(2))
    } as const;
  }, [buckets]);

  const currentBucket = useMemo(() => {
    if (!buckets.length) return null;
    if (!bucketFocus) return buckets[buckets.length - 1];
    return buckets.find((b) => b.period === bucketFocus) || buckets[buckets.length - 1];
  }, [bucketFocus, buckets]);

  const successFailureTrendData = useMemo(() => (
    buckets.map((b) => ({
      period: b.period,
      total: b.total,
      successRate: b.success_rate,
      declineRate: 100 - b.success_rate,
      businessRate: b.business_rate,
      userRate: b.user_rate,
      technicalRate: b.technical_rate
    }))
  ), [buckets]);

  const declineTrendData = useMemo(() => (
    buckets.map((b) => ({
      period: b.period,
      total: b.total,
      business: b.business_rate,
      user: b.user_rate,
      technical: b.technical_rate
    }))
  ), [buckets]);

  const volumeVsSuccessData = useMemo(() => (
    buckets.map((b) => ({ period: b.period, total: b.total, successRate: b.success_rate }))
  ), [buckets]);

  const renderTrendTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload || {};
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-700 shadow">
        <div className="font-semibold text-slate-900 mb-2">{label}</div>
        <div>Total Transactions: {data.total?.toLocaleString?.() ?? '—'}</div>
        <div>Success Rate: {data.successRate?.toFixed ? `${data.successRate.toFixed(2)}%` : '—'}</div>
        <div>Total Decline Rate: {data.declineRate?.toFixed ? `${data.declineRate.toFixed(2)}%` : '—'}</div>
        <div>Business Decline: {data.businessRate?.toFixed ? `${data.businessRate.toFixed(2)}%` : '—'}</div>
        <div>User Decline: {data.userRate?.toFixed ? `${data.userRate.toFixed(2)}%` : '—'}</div>
        <div>Technical Decline: {data.technicalRate?.toFixed ? `${data.technicalRate.toFixed(2)}%` : '—'}</div>
      </div>
    );
  };

  const renderDeclineTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload || {};
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-700 shadow">
        <div className="font-semibold text-slate-900 mb-2">{label}</div>
        <div>Share: {data?.value?.toFixed ? `${data.value.toFixed(2)}%` : '—'}</div>
      </div>
    );
  };

  if (route === '/start') {
    return <StartPage onNavigate={(path) => navigate(path)} />;
  }

  if (route === '/gst-calculator') {
    return <GstCalculatorPage onNavigate={(path) => navigate(path)} />;
  }

  if (route === '/pnl-analysis') {
    return <PnlAnalysisPage onNavigate={(path) => navigate(path)} />;
  }

  return (
    <ThemeProvider>
      <DashboardLayout
        pageTitle="Bank of Bhutan Acquiring Reporting"
        pageSubtitle="Alternate Delivery Channel"
        activePage={activePage}
        onPageChange={setActivePage}
        buildLabel={UI_BUILD}
        filterBar={activePage === 'KPI' ? (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button btnType="primary" style={{ minWidth: 70, padding: '0 12px' }} onClick={() => navigate('/start')}>← Back</Button>
              {(['POS', 'ATM', 'IPG'] as ReportType[]).map((type) => (
                <Button key={type} btnType={reportType === type ? 'primary' : 'secondary'} style={{ marginRight: 8 }} onClick={() => handleTypeChange(type)}>
                  {type}
                </Button>
              ))}
            </div>
            <div>
              <select value={period} onChange={(e) => setPeriod(e.target.value as PeriodType)}>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
                <option value="CUSTOM">Custom Range</option>
              </select>
            </div>
            {period === 'CUSTOM' && (
              <>
                <input type="date" value={customStart} min={dateBounds.min || undefined} max={dateBounds.max || undefined} onChange={(e) => setCustomStart(e.target.value)} />
                <span>to</span>
                <input type="date" value={customEnd} min={dateBounds.min || undefined} max={dateBounds.max || undefined} onChange={(e) => setCustomEnd(e.target.value)} />
              </>
            )}
            <label htmlFor="file-upload">
              <Button btnType="secondary" as="span">Import Ledger</Button>
              <input type="file" id="file-upload" style={{ display: 'none' }} accept=".xlsx" onChange={handleFileUpload} />
            </label>
            <Button btnType="primary" onClick={handleCentralExport}>Download Central Bank Report (DOCX)</Button>
          </div>
        ) : undefined}
      >
        {activePage === 'KPI' ? (
          <>
            {error && (
              <div style={{ marginBottom: 24, padding: 16, background: '#ffeaea', border: '1px solid #e57373', borderRadius: 8, color: '#b71c1c' }}>{error}</div>
            )}
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, textAlign: 'center' }}>
                <div className="skeleton kpi" style={{ width: 80, height: 32, marginBottom: 16 }} />
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Processing {reportType} Ledger</h2>
                <p style={{ color: '#567089', fontSize: 15 }}>{loadingStep}</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
              <KpiCard title="Success %" value={overallCounts.total > 0 ? `${((overallCounts.success / overallCounts.total) * 100).toFixed(2)}%` : '—'} trend={kpiTrends.success} type="success" subtitle="vs last period" />
              <KpiCard title="Decline %" value={overallCounts.total > 0 ? `${((overallCounts.decline / overallCounts.total) * 100).toFixed(2)}%` : '—'} trend={kpiTrends.decline} type="decline" subtitle="vs last period" />
              <KpiCard title="Total Txns" value={overallCounts.total.toLocaleString()} type="technical" subtitle="All time" />
              <KpiCard title="Business Decline %" value={overallCounts.total > 0 ? `${((overallCounts.business / overallCounts.total) * 100).toFixed(2)}%` : '—'} trend={kpiTrends.business} type="business" subtitle="vs last period" />
              <KpiCard title="User Decline %" value={overallCounts.total > 0 ? `${((overallCounts.user / overallCounts.total) * 100).toFixed(2)}%` : '—'} trend={kpiTrends.user} type="decline" subtitle="vs last period" />
              <KpiCard title="Technical Decline %" value={overallCounts.total > 0 ? `${((overallCounts.technical / overallCounts.total) * 100).toFixed(2)}%` : '—'} trend={kpiTrends.technical} type="technical" subtitle="vs last period" />
            </div>
            {transactions.length > 0 && <OverviewAcquiringTable transactions={transactions} />}
            {/* ...existing chart and analytics sections can be refactored similarly... */}
          </>
        ) : (
          <>
            <AcquiringAnalyticsPage />
          </>
        )}
      </DashboardLayout>
    </ThemeProvider>
  );
};

export default App;

