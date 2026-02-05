
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { processExcel } from './services/excelProcessor';
import { ReportType } from './types';
import type { PeriodType, RawTransaction } from './lib/bucketing';
import type { BucketKPI } from './lib/kpi';
import type { ComparisonResult } from './lib/comparison';
import { computeKpiByBucket } from './lib/kpi';
import { generateComparisons } from './lib/comparison';
import { generateExecutiveSummary } from './lib/summarizer';
import { bucketTransactions, getDateRange, sortPeriodKeys } from './lib/bucketing';
import { classifyResponse, normalizeResponseCode } from './lib/classifier';
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, LabelList, Legend, AreaChart, Area, ScatterChart, Scatter, PieChart, Pie, Cell, Treemap } from 'recharts';
import { generateManagementDocxBlob } from './lib/managementDocx';
import { buildManagementNarrative } from './lib/managementNarrative';
import { generateCentralBankDocxBlob } from './lib/centralBankDocx';
import { buildCentralBankReportData } from './lib/centralBankData';
import { getMastercardAnalytics, type ExecutiveChannel, type ExecutiveFilters, type ExecutiveGranularity, type ExecutiveRange } from './services/mastercardAnalytics';
import { generateMastercardSnapshotDocxBlob } from './lib/mastercardSnapshotDocx';
import KpiCard from './components/executive/KpiCard';
import SectionCard from './components/executive/SectionCard';

const UI_VIEW = true;
const REPORT_VIEW = true;
const USE_SERVER_EXPORT = false;
const UI_BUILD = '2026-02-04.4';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [transactions, setTransactions] = useState<RawTransaction[]>([]);
  const [buckets, setBuckets] = useState<BucketKPI[]>([]);
  const [comparisons, setComparisons] = useState<ComparisonResult[]>([]);
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [bucketFocus, setBucketFocus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<ReportType>('POS');
  const [period, setPeriod] = useState<PeriodType>('MONTHLY');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [schemeScope, setSchemeScope] = useState<'ALL' | 'VISA' | 'MASTERCARD' | 'UNIONPAY' | 'RUPAY'>('ALL');
  const [viewMode, setViewMode] = useState<'OPERATIONAL' | 'EXECUTIVE'>('EXECUTIVE');
  const [execRange, setExecRange] = useState<ExecutiveRange>('LAST_3_YEARS');
  const [execGranularity, setExecGranularity] = useState<ExecutiveGranularity>('MONTHLY');
  const [execChannel, setExecChannel] = useState<ExecutiveChannel>('POS_ATM');
  const [execCustomStart, setExecCustomStart] = useState('');
  const [execCustomEnd, setExecCustomEnd] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const trendChartRef = useRef<HTMLDivElement | null>(null);
  const compositionChartRef = useRef<HTMLDivElement | null>(null);
  const businessChartRef = useRef<HTMLDivElement | null>(null);
  const userChartRef = useRef<HTMLDivElement | null>(null);
  const technicalChartRef = useRef<HTMLDivElement | null>(null);
  const schemeTrendChartRef = useRef<HTMLDivElement | null>(null);

  const handleTypeChange = (type: ReportType) => {
    setReportType(type);
    setTransactions([]);
    setBuckets([]);
    setComparisons([]);
    setExecutiveSummary('');
    setDateRange('');
    setError(null);
  };

  const normalizeScheme = (value?: string) => {
    const raw = (value || '').trim().toUpperCase();
    if (!raw) return 'OTHER';
    if (raw.includes('VISA')) return 'VISA';
    if (raw.includes('MASTERCARD') || raw.includes('MASTER')) return 'MASTERCARD';
    if (raw.includes('UNIONPAY') || raw.includes('UPI')) return 'UNIONPAY';
    if (raw.includes('RUPAY')) return 'RUPAY';
    if (raw.includes('AMEX') || raw.includes('AMERICAN')) return 'AMEX';
    if (raw.includes('JCB')) return 'JCB';
    if (raw.includes('DISCOVER')) return 'DISCOVER';
    return 'OTHER';
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

    if (schemeScope !== 'ALL') {
      filtered = filtered.filter((tx) => normalizeScheme(tx.card_network) === schemeScope);
    }

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
  }, [customEnd, customStart, period, reportType, schemeScope, transactions]);

  useEffect(() => {
    if (operationalTransactions.length === 0) {
      setBuckets([]);
      setComparisons([]);
      setExecutiveSummary('');
      setDateRange('');
      return;
    }
    const updatedBuckets = computeKpiByBucket(operationalTransactions, reportType, aggregationPeriod);
    const updatedComparisons = generateComparisons(updatedBuckets);
    const updatedSummary = generateExecutiveSummary(reportType, aggregationPeriod, updatedBuckets, updatedComparisons);
    const { start, end } = getDateRange(operationalTransactions);
    const range = start && end ? `${start.toLocaleDateString()} – ${end.toLocaleDateString()}` : 'N/A';
    setBuckets(updatedBuckets);
    if (updatedBuckets.length > 0) {
      setBucketFocus(updatedBuckets[updatedBuckets.length - 1].period);
    } else {
      setBucketFocus('');
    }
    setComparisons(updatedComparisons);
    setExecutiveSummary(updatedSummary);
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
      setTransactions(result.transactions);
      setBuckets(result.buckets);
      setComparisons(result.comparisons);
      setExecutiveSummary(result.executiveSummary);
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
    if (!operationalTransactions.length) return;
    try {
      setError(null);
      const { reportData, kpiReport } = buildCentralBankReportData(reportType, operationalTransactions);
      const blob = await generateCentralBankDocxBlob(reportData, kpiReport);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}_Central_Bank_Report.docx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Central export error:', err);
      const errorMsg = err.message || String(err);
      setError(`Failed to generate Central Bank document (client export): ${errorMsg}`);
    }
  };

  const handleManagementExport = async () => {
    if (!operationalTransactions.length) return;
    try {
      setError(null);
      if (USE_SERVER_EXPORT) {
        const response = await fetch('/api/export-management', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: reportType,
            period: aggregationPeriod,
            transactions: operationalTransactions
          })
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || 'Report generation failed');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${reportType}_${period}_Report.docx`;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      if (!buckets.length) {
        throw new Error('No bucketed data available for report export.');
      }

      const narrative = buildManagementNarrative({
        channel: reportType,
        period: aggregationPeriod,
        transactions: operationalTransactions,
        buckets
      });

      const blob = await generateManagementDocxBlob({
        channel: reportType,
        period,
        dateRange: dateRange || 'N/A',
        buckets,
        comparisons,
        executiveSummary,
        narrative
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}_${period}_Report.docx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download error details:', err);
      console.error('Error stack:', err.stack);
      const errorMsg = err.message || String(err);
      console.error('Final error message:', errorMsg);
      setError(`Failed to generate Management document: ${errorMsg}`);
    }
  };

  const handleMastercardSnapshotExport = async () => {
    if (!transactions.length) return;
    try {
      setError(null);
      const blob = await generateMastercardSnapshotDocxBlob(mastercardAnalytics);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Mastercard_Acquiring_Business_Snapshot_${Date.now()}.docx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Mastercard snapshot export error:', err);
      const errorMsg = err.message || String(err);
      setError(`Failed to generate Mastercard snapshot: ${errorMsg}`);
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
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const currentBucket = useMemo(() => {
    if (!buckets.length) return undefined;
    if (!bucketFocus) return buckets[buckets.length - 1];
    return buckets.find((b) => b.period === bucketFocus) || buckets[buckets.length - 1];
  }, [bucketFocus, buckets]);

  const businessDeclineData = currentBucket
    ? currentBucket.business_declines.map((d) => ({ name: d.description, count: d.count, percent: d.percent, code: d.code }))
    : [];
  const userDeclineData = currentBucket
    ? currentBucket.user_declines.map((d) => ({ name: d.description, count: d.count, percent: d.percent, code: d.code }))
    : [];
  const technicalDeclineData = currentBucket
    ? currentBucket.technical_declines.map((d) => ({ name: d.description, count: d.count, percent: d.percent, code: d.code }))
    : [];

  const successFailureTrendData = useMemo(() => (
    buckets.map((b) => ({
      period: b.period,
      successRate: b.success_rate,
      declineRate: Number((100 - b.success_rate).toFixed(2)),
      total: b.total,
      successCount: b.success_count,
      declineCount: b.total - b.success_count,
      businessRate: b.business_rate,
      userRate: b.user_rate,
      technicalRate: b.technical_rate
    }))
  ), [buckets]);

  const declineTrendData = useMemo(() => (
    buckets.map((b) => ({
      period: b.period,
      business: b.business_rate,
      user: b.user_rate,
      technical: b.technical_rate,
      successRate: b.success_rate,
      declineRate: Number((100 - b.success_rate).toFixed(2)),
      businessRate: b.business_rate,
      userRate: b.user_rate,
      technicalRate: b.technical_rate,
      total: b.total,
      successCount: b.success_count,
      declineCount: b.total - b.success_count
    }))
  ), [buckets]);

  const schemeTrendData = useMemo(() => {
    if (!buckets.length) return [] as Array<Record<string, number | string>>;
    const bucketed = bucketTransactions(operationalTransactions, aggregationPeriod);
    const keys = sortPeriodKeys(Object.keys(bucketed));

    return keys.map((key) => {
      const items = bucketed[key] || [];
      const computeRate = (scheme: 'VISA' | 'MASTERCARD' | 'OTHER') => {
        const scoped = items.filter((tx) => {
          const normalized = normalizeScheme(tx.card_network);
          if (scheme === 'OTHER') return !['VISA', 'MASTERCARD'].includes(normalized);
          return normalized === scheme;
        });
        if (!scoped.length) return 0;
        const successCount = scoped.filter((tx) => classifyResponse(reportType, tx.response_code) === 'success').length;
        return Number(((successCount / scoped.length) * 100).toFixed(2));
      };

      return {
        period: key,
        VISA: computeRate('VISA'),
        MASTERCARD: computeRate('MASTERCARD'),
        OTHER: computeRate('OTHER')
      };
    });
  }, [aggregationPeriod, buckets.length, operationalTransactions, reportType]);

  const schemeTopDeclines = useMemo(() => {
    const map: Record<string, Record<string, { code: string; description: string; count: number }>> = {};
    operationalTransactions.forEach((tx) => {
      const category = classifyResponse(reportType, tx.response_code);
      if (category === 'success') return;
      const scheme = normalizeScheme(tx.card_network);
      if (!map[scheme]) map[scheme] = {};
      const code = normalizeResponseCode(tx.response_code);
      const description = tx.response_description || 'Unknown';
      const key = `${code}::${description}`;
      if (!map[scheme][key]) {
        map[scheme][key] = { code, description, count: 0 };
      }
      map[scheme][key].count += 1;
    });

    return Object.entries(map).map(([scheme, records]) => ({
      scheme,
      declines: Object.values(records)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    }));
  }, [operationalTransactions, reportType]);

  const topDeclineCodes = useMemo(() => {
    const counter = new Map<string, number>();
    operationalTransactions.forEach((tx) => {
      const category = classifyResponse(reportType, tx.response_code);
      if (category === 'success') return;
      const code = normalizeResponseCode(tx.response_code);
      counter.set(code, (counter.get(code) || 0) + 1);
    });
    return [...counter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([code]) => code);
  }, [operationalTransactions, reportType]);

  const topDeclineTrendData = useMemo(() => {
    if (!topDeclineCodes.length) return [] as Array<Record<string, string | number>>;
    const bucketed = bucketTransactions(operationalTransactions, aggregationPeriod);
    const keys = sortPeriodKeys(Object.keys(bucketed));
    return keys.map((key) => {
      const items = bucketed[key] || [];
      const row: Record<string, string | number> = { period: key };
      topDeclineCodes.forEach((code) => {
        const count = items.filter((tx) => normalizeResponseCode(tx.response_code) === code).length;
        row[code] = count;
      });
      return row;
    });
  }, [aggregationPeriod, operationalTransactions, topDeclineCodes]);

  const volumeVsSuccessData = useMemo(() => (
    buckets.map((b) => ({ period: b.period, total: b.total, successRate: b.success_rate }))
  ), [buckets]);

  const executiveFilters = useMemo<ExecutiveFilters>(() => ({
    rangeType: execRange,
    granularity: execGranularity,
    channel: execChannel,
    customStart: execCustomStart,
    customEnd: execCustomEnd
  }), [execChannel, execCustomEnd, execCustomStart, execGranularity, execRange]);

  const mastercardAnalytics = useMemo(() => (
    getMastercardAnalytics(transactions, executiveFilters)
  ), [executiveFilters, transactions]);

  const formatCurrency = (value: number) => `BTN ${Math.round(value).toLocaleString()}`;
  const formatPercent = (value: number, digits = 1) => `${value.toFixed(digits)}%`;

  const latestYoY = mastercardAnalytics.yoy.length
    ? mastercardAnalytics.yoy[mastercardAnalytics.yoy.length - 1]
    : undefined;

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
        <div>Count: {data.count?.toLocaleString?.() ?? '—'}</div>
        <div>Share: {data.percent?.toFixed ? `${data.percent.toFixed(2)}%` : '—'}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg overflow-hidden bg-slate-100 p-1 border border-slate-200">
              <img src="/bob-logo.svg" alt="Bank of Bhutan" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Mastercard Acquiring Intelligence</p>
              <h1 className="text-2xl font-bold text-slate-900">Mastercard Acquiring Business Snapshot</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">Strategic executive intelligence for POS & ATM acquiring performance</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              {(['POS', 'ATM'] as ReportType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleTypeChange(type)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${reportType === type ? 'bg-blue-700 text-white shadow' : 'text-slate-600 hover:bg-white'}`}
                >
                  {type}
                </button>
              ))}
            </div>

            {viewMode === 'OPERATIONAL' && (
              <>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Time Aggregation</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as PeriodType)}
                    className="text-xs border border-slate-200 rounded px-2 py-1"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="CUSTOM">Custom Range</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Data Scope</label>
                  <select
                    value={schemeScope}
                    onChange={(e) => setSchemeScope(e.target.value as typeof schemeScope)}
                    className="text-xs border border-slate-200 rounded px-2 py-1"
                  >
                    <option value="ALL">All Schemes</option>
                    <option value="VISA">Visa</option>
                    <option value="MASTERCARD">Mastercard</option>
                    <option value="UNIONPAY">UnionPay</option>
                    <option value="RUPAY">RuPay</option>
                  </select>
                </div>
              </>
            )}

            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {(['OPERATIONAL', 'EXECUTIVE'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${viewMode === mode ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-white'}`}
                >
                  {mode === 'OPERATIONAL' ? 'Operational View' : 'Executive View'}
                </button>
              ))}
            </div>

            {viewMode === 'OPERATIONAL' && period === 'CUSTOM' && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Custom Range</div>
                <input
                  type="date"
                  value={customStart}
                  min={dateBounds.min || undefined}
                  max={dateBounds.max || undefined}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="text-xs border border-slate-200 rounded px-2 py-1"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={customEnd}
                  min={dateBounds.min || undefined}
                  max={dateBounds.max || undefined}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="text-xs border border-slate-200 rounded px-2 py-1"
                />
              </div>
            )}

            <label htmlFor="file-upload" className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer hover:border-slate-400 shadow-sm">
              Import Ledger
            </label>
            <button onClick={handleMastercardSnapshotExport} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm">
              Download Mastercard Snapshot (DOCX)
            </button>
            <button onClick={handleCentralExport} className="bg-slate-900 hover:bg-slate-950 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm">
              Download Central Bank Report (DOCX)
            </button>
            <button onClick={handleManagementExport} className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm">
              Download Management Report (DOCX)
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <input type="file" id="file-upload" className="hidden" accept=".xlsx" onChange={handleFileUpload} />
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <div className="relative h-20 w-20 mb-6">
              <div className="absolute inset-0 rounded-full border-[4px] border-slate-200"></div>
              <div className="absolute inset-0 rounded-full border-[4px] border-blue-700 border-t-transparent animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Processing {reportType} Ledger</h2>
            <p className="text-slate-500 text-sm font-medium">{loadingStep}</p>
          </div>
        )}
        {UI_VIEW && (
          <div className="space-y-6">
            {transactions.length === 0 && !loading && (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Dashboard Status</p>
                      <h2 className="text-2xl font-bold text-slate-900">Awaiting Ledger Upload</h2>
                      <p className="text-sm text-slate-500 mt-2">Upload a POS or ATM ledger to populate Mastercard executive KPIs and trend analytics.</p>
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                      <div className="px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-widest">System Ready</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    {['Authorization Outcomes', 'Decline Distribution', 'Technical Response Profile'].map((label) => (
                      <div key={label} className="border border-dashed border-slate-200 rounded-xl p-4 text-sm text-slate-400">
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {viewMode === 'EXECUTIVE' && (
              <>
                <SectionCard title="Global Filters" subtitle="Executive filter system">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Time Range</label>
                      <select
                        value={execRange}
                        onChange={(e) => setExecRange(e.target.value as ExecutiveRange)}
                        className="text-xs border border-slate-200 rounded px-2 py-2"
                      >
                        <option value="LAST_3_YEARS">Last 3 Years (Rolling)</option>
                        <option value="YTD_2026">YTD 2026</option>
                        <option value="CUSTOM">Custom Range</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Granularity</label>
                      <select
                        value={execGranularity}
                        onChange={(e) => setExecGranularity(e.target.value as ExecutiveGranularity)}
                        className="text-xs border border-slate-200 rounded px-2 py-2"
                      >
                        <option value="MONTHLY">Monthly</option>
                        <option value="QUARTERLY">Quarterly</option>
                        <option value="YEARLY">Yearly</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Channel</label>
                      <select
                        value={execChannel}
                        onChange={(e) => setExecChannel(e.target.value as ExecutiveChannel)}
                        className="text-xs border border-slate-200 rounded px-2 py-2"
                      >
                        <option value="POS_ATM">POS + ATM</option>
                        <option value="POS">POS Only</option>
                        <option value="ATM">ATM Only</option>
                      </select>
                    </div>
                    {execRange === 'CUSTOM' && (
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Custom Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={execCustomStart}
                            min={dateBounds.min || undefined}
                            max={dateBounds.max || undefined}
                            onChange={(e) => setExecCustomStart(e.target.value)}
                            className="text-xs border border-slate-200 rounded px-2 py-2"
                          />
                          <span className="text-xs text-slate-400">to</span>
                          <input
                            type="date"
                            value={execCustomEnd}
                            min={dateBounds.min || undefined}
                            max={dateBounds.max || undefined}
                            onChange={(e) => setExecCustomEnd(e.target.value)}
                            className="text-xs border border-slate-200 rounded px-2 py-2"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </SectionCard>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
                  <KpiCard
                    label="Mastercard Volume"
                    value={formatCurrency(mastercardAnalytics.mastercard.volume)}
                    subtitle={mastercardAnalytics.rangeLabel}
                    trend={mastercardAnalytics.ytd.volumeGrowth >= 0 ? 'up' : 'down'}
                  />
                  <KpiCard
                    label="Mastercard Count"
                    value={mastercardAnalytics.mastercard.count.toLocaleString()}
                    subtitle={`Share ${formatPercent(mastercardAnalytics.mastercard.shareCount)}`}
                    trend={mastercardAnalytics.ytd.countGrowth >= 0 ? 'up' : 'down'}
                  />
                  <KpiCard
                    label="YTD 2026 Performance"
                    value={formatPercent(mastercardAnalytics.ytd.volumeGrowth)}
                    subtitle={`Count ${formatPercent(mastercardAnalytics.ytd.countGrowth)}`}
                    trend={mastercardAnalytics.ytd.volumeGrowth >= 0 ? 'up' : 'down'}
                  />
                  <KpiCard
                    label="YoY Growth"
                    value={latestYoY ? formatPercent(latestYoY.volumeGrowth) : '—'}
                    subtitle={latestYoY ? `${latestYoY.year}` : 'N/A'}
                    trend={latestYoY ? (latestYoY.volumeGrowth >= 0 ? 'up' : 'down') : 'flat'}
                  />
                  <KpiCard
                    label="Revenue Contribution"
                    value={formatPercent(mastercardAnalytics.mastercard.shareRevenue)}
                    subtitle={formatCurrency(mastercardAnalytics.mastercard.revenue)}
                    trend={mastercardAnalytics.mastercard.shareRevenue >= 0 ? 'flat' : 'down'}
                  />
                  <KpiCard
                    label="Market Share"
                    value={formatPercent(mastercardAnalytics.mastercard.shareVolume)}
                    subtitle="Volume Share"
                    trend={mastercardAnalytics.mastercard.shareVolume >= 0 ? 'flat' : 'down'}
                  />
                </div>

                <SectionCard title="Executive Snapshot" subtitle="Strategic highlights">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Data Range</p>
                      <p className="text-sm text-slate-900 mt-2">{mastercardAnalytics.rangeLabel}</p>
                      <p className="text-xs text-slate-500 mt-2">Channel Focus: {execChannel.replace('_', ' + ')}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Revenue Impact</p>
                      <p className="text-sm text-slate-900 mt-2">Mastercard revenue share at {formatPercent(mastercardAnalytics.mastercard.shareRevenue)}</p>
                      <p className="text-xs text-slate-500 mt-2">Total revenue: {formatCurrency(mastercardAnalytics.revenue.total)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Merchant Footprint</p>
                      <p className="text-sm text-slate-900 mt-2">{mastercardAnalytics.merchant.total.toLocaleString()} Mastercard merchants</p>
                      <p className="text-xs text-slate-500 mt-2">Sector coverage across {mastercardAnalytics.sectors.distribution.length} segments</p>
                    </div>
                  </div>
                  {mastercardAnalytics.insights.length > 0 && (
                    <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {mastercardAnalytics.insights.map((insight) => (
                        <div key={insight} className="border border-slate-200 rounded-lg p-3 text-xs text-slate-600 bg-white">
                          {insight}
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <SectionCard title="Mastercard Volume Trend" subtitle="Growth & Trends">
                    <div className="h-72 bg-slate-50 rounded-xl p-3">
                      {mastercardAnalytics.trend.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={mastercardAnalytics.trend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis tickFormatter={(value) => value.toLocaleString()} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend verticalAlign="top" height={24} />
                            <Line type="monotone" dataKey="volume" name="Mastercard Volume" stroke="#dc2626" strokeWidth={2} dot={{ r: 2 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-sm text-slate-500">No data available</div>
                      )}
                    </div>
                  </SectionCard>

                  <SectionCard title="Mastercard Count Trend" subtitle="Growth & Trends">
                    <div className="h-72 bg-slate-50 rounded-xl p-3">
                      {mastercardAnalytics.trend.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={mastercardAnalytics.trend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis tickFormatter={(value) => value.toLocaleString()} />
                            <Tooltip formatter={(value: number) => value.toLocaleString()} />
                            <Legend verticalAlign="top" height={24} />
                            <Line type="monotone" dataKey="count" name="Mastercard Count" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 2 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-sm text-slate-500">No data available</div>
                      )}
                    </div>
                  </SectionCard>
                </div>

                <SectionCard title="Year-on-Year Growth" subtitle="Volume & count %">
                  <div className="h-72 bg-slate-50 rounded-xl p-3">
                    {mastercardAnalytics.yoy.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mastercardAnalytics.yoy}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" />
                          <YAxis tickFormatter={(value) => `${value}%`} />
                          <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                          <Legend verticalAlign="top" height={24} />
                          <Line type="monotone" dataKey="volumeGrowth" name="Volume YoY %" stroke="#dc2626" strokeWidth={2} dot={{ r: 2 }} />
                          <Line type="monotone" dataKey="countGrowth" name="Count YoY %" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-slate-500">No data available</div>
                    )}
                  </div>
                </SectionCard>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <SectionCard title="Market Share (Volume)" subtitle="Mastercard vs Visa vs Amex">
                    <div className="h-72 bg-slate-50 rounded-xl p-3">
                      {mastercardAnalytics.marketShare.byScheme.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={mastercardAnalytics.marketShare.byScheme}
                              dataKey="shareVolume"
                              nameKey="scheme"
                              innerRadius={50}
                              outerRadius={90}
                              label={(entry) => `${entry.scheme}: ${entry.shareVolume.toFixed(1)}%`}
                            >
                              {mastercardAnalytics.marketShare.byScheme.map((entry) => (
                                <Cell
                                  key={entry.scheme}
                                  fill={{
                                    MASTERCARD: '#dc2626',
                                    VISA: '#1d4ed8',
                                    AMEX: '#10b981',
                                    OTHER: '#9ca3af'
                                  }[entry.scheme]}
                                />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-sm text-slate-500">No data available</div>
                      )}
                    </div>
                  </SectionCard>

                  <SectionCard title="Revenue Contribution" subtitle="Scheme comparison">
                    <div className="h-72 bg-slate-50 rounded-xl p-3">
                      {mastercardAnalytics.revenue.byScheme.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={mastercardAnalytics.revenue.byScheme}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="scheme" />
                            <YAxis tickFormatter={(value) => value.toLocaleString()} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-sm text-slate-500">No data available</div>
                      )}
                    </div>
                  </SectionCard>
                </div>

                <SectionCard title="Market Share Trend" subtitle="Share by volume over time">
                  <div className="h-72 bg-slate-50 rounded-xl p-3">
                    {mastercardAnalytics.marketShare.trendVolume.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={mastercardAnalytics.marketShare.trendVolume}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" />
                          <YAxis tickFormatter={(value) => `${value}%`} />
                          <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                          <Legend verticalAlign="top" height={24} />
                          <Bar dataKey="MASTERCARD" stackId="a" fill="#dc2626" />
                          <Bar dataKey="VISA" stackId="a" fill="#1d4ed8" />
                          <Bar dataKey="AMEX" stackId="a" fill="#10b981" />
                          <Bar dataKey="OTHER" stackId="a" fill="#9ca3af" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-slate-500">No data available</div>
                    )}
                  </div>
                </SectionCard>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <SectionCard title="Merchant Acceptance Growth" subtitle="Mastercard active merchants">
                    <div className="h-72 bg-slate-50 rounded-xl p-3">
                      {mastercardAnalytics.merchant.trend.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={mastercardAnalytics.merchant.trend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis tickFormatter={(value) => value.toLocaleString()} />
                            <Tooltip formatter={(value: number) => value.toLocaleString()} />
                            <Legend verticalAlign="top" height={24} />
                            <Line type="monotone" dataKey="merchants" name="Mastercard Merchants" stroke="#0f766e" strokeWidth={2} dot={{ r: 2 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-sm text-slate-500">No data available</div>
                      )}
                    </div>
                  </SectionCard>

                  <SectionCard title="Sector Distribution" subtitle="Mastercard volume & penetration">
                    <div className="h-72 bg-slate-50 rounded-xl p-3">
                      {mastercardAnalytics.sectors.top.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={mastercardAnalytics.sectors.top} layout="vertical" margin={{ left: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(value) => value.toLocaleString()} />
                            <YAxis type="category" dataKey="sector" width={120} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Bar dataKey="volume" fill="#f97316" radius={[4, 4, 4, 4]}>
                              <LabelList dataKey="penetration" position="right" formatter={(value: number) => `${value.toFixed(1)}%`} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-sm text-slate-500">No data available</div>
                      )}
                    </div>
                  </SectionCard>
                </div>

                <SectionCard title="Sector Treemap" subtitle="Mastercard volume by sector">
                  <div className="h-72 bg-slate-50 rounded-xl p-3">
                    {mastercardAnalytics.sectors.top.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <Treemap
                          data={mastercardAnalytics.sectors.top.map((item) => ({
                            name: item.sector,
                            size: item.volume
                          }))}
                          dataKey="size"
                          stroke="#ffffff"
                          fill="#dc2626"
                        />
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-slate-500">No data available</div>
                    )}
                  </div>
                </SectionCard>
              </>
            )}

            {viewMode === 'OPERATIONAL' && (
              <>
                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Success Rate</p>
                      <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">▲</div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 mt-3">{currentBucket ? `${currentBucket.success_rate.toFixed(2)}%` : '—'}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Total Decline Rate</p>
                      <div className="h-9 w-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">●</div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 mt-3">{currentBucket ? `${(100 - currentBucket.success_rate).toFixed(2)}%` : '—'}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Total Transactions</p>
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">■</div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 mt-3">{currentBucket ? currentBucket.total.toLocaleString() : '—'}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Business Decline %</p>
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">◆</div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 mt-3">{currentBucket ? `${currentBucket.business_rate.toFixed(2)}%` : '—'}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">User Decline %</p>
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">◆</div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 mt-3">{currentBucket ? `${currentBucket.user_rate.toFixed(2)}%` : '—'}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Technical Decline %</p>
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">◆</div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 mt-3">{currentBucket ? `${currentBucket.technical_rate.toFixed(2)}%` : '—'}</p>
                  </div>
                </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Period Focus</div>
              <select
                value={bucketFocus}
                onChange={(e) => setBucketFocus(e.target.value)}
                className="text-xs border border-slate-200 rounded px-2 py-1"
              >
                {buckets.map((b) => (
                  <option key={b.period} value={b.period}>{b.period}</option>
                ))}
              </select>
            </div>

            {/* Core Analytics Graphs */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Success vs Decline Trend</p>
                    <h3 className="text-lg font-bold text-slate-900">Authorization Performance</h3>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => copyChartImage(trendChartRef.current)} className="text-xs font-bold uppercase tracking-wider px-3 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">
                      Copy Chart
                    </button>
                    <button onClick={() => downloadChartImage(trendChartRef.current, `${reportType}-success-decline-trend.png`)} className="text-xs font-bold uppercase tracking-wider px-3 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">
                      Download Chart
                    </button>
                  </div>
                </div>
                <div ref={trendChartRef} className="h-72 bg-slate-50 rounded-xl p-3">
                  {successFailureTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={successFailureTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                        <Tooltip content={renderTrendTooltip} />
                        <Legend verticalAlign="top" height={24} />
                        <Line type="monotone" dataKey="successRate" name="Success Rate" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="declineRate" name="Total Decline Rate" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-500">No data available</div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Decline Composition Trend</p>
                    <h3 className="text-lg font-bold text-slate-900">Business vs User vs Technical</h3>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => copyChartImage(compositionChartRef.current)} className="text-xs font-bold uppercase tracking-wider px-3 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">
                      Copy Chart
                    </button>
                    <button onClick={() => downloadChartImage(compositionChartRef.current, `${reportType}-decline-composition.png`)} className="text-xs font-bold uppercase tracking-wider px-3 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">
                      Download Chart
                    </button>
                  </div>
                </div>
                <div ref={compositionChartRef} className="h-72 bg-slate-50 rounded-xl p-3">
                  {declineTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={declineTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                        <Tooltip content={renderTrendTooltip} />
                        <Legend verticalAlign="top" height={24} />
                        <Area type="monotone" dataKey="business" name="Business" stackId="1" stroke="#2563eb" fill="#93c5fd" />
                        <Area type="monotone" dataKey="user" name="User" stackId="1" stroke="#f59e0b" fill="#fde68a" />
                        <Area type="monotone" dataKey="technical" name="Technical" stackId="1" stroke="#7c3aed" fill="#ddd6fe" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-500">No data available</div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Business Decline Pattern</p>
                    <h3 className="text-lg font-bold text-slate-900">Top Decline Reasons</h3>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => copyChartImage(businessChartRef.current)} className="text-xs font-bold uppercase tracking-wider px-3 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">
                      Copy Chart
                    </button>
                    <button onClick={() => downloadChartImage(businessChartRef.current, `${reportType}-business-decline.png`)} className="text-xs font-bold uppercase tracking-wider px-3 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">
                      Download Chart
                    </button>
                  </div>
                </div>
                <div ref={businessChartRef} className="h-72 bg-slate-50 rounded-xl p-3">
                  {businessDeclineData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={businessDeclineData.slice(0, 10)} layout="vertical" margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={180} />
                        <Tooltip content={renderDeclineTooltip} />
                        <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 4, 4]}>
                          <LabelList dataKey="percent" position="right" formatter={(value: number) => `${value.toFixed(1)}%`} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-500">No data available</div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Card Scheme Trend</p>
                    <h3 className="text-lg font-bold text-slate-900">Success Rate by Scheme</h3>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => copyChartImage(schemeTrendChartRef.current)} className="text-xs font-bold uppercase tracking-wider px-3 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">
                      Copy Chart
                    </button>
                    <button onClick={() => downloadChartImage(schemeTrendChartRef.current, `${reportType}-scheme-trend.png`)} className="text-xs font-bold uppercase tracking-wider px-3 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">
                      Download Chart
                    </button>
                  </div>
                </div>
                <div ref={schemeTrendChartRef} className="h-72 bg-slate-50 rounded-xl p-3">
                  {schemeTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={schemeTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                        <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                        <Legend verticalAlign="top" height={24} />
                        <Line type="monotone" dataKey="VISA" name="Visa" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 2 }} />
                        <Line type="monotone" dataKey="MASTERCARD" name="Mastercard" stroke="#dc2626" strokeWidth={2} dot={{ r: 2 }} />
                        <Line type="monotone" dataKey="OTHER" name="Other" stroke="#6b7280" strokeWidth={2} dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-500">No data available</div>
                  )}
                </div>
              </div>
            </div>

            {viewMode === 'OPERATIONAL' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">User Decline Pattern</p>
                      <h3 className="text-lg font-bold text-slate-900">Top User Declines</h3>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => copyChartImage(userChartRef.current)} className="text-xs font-bold uppercase tracking-wider px-3 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">
                        Copy Chart
                      </button>
                      <button onClick={() => downloadChartImage(userChartRef.current, `${reportType}-user-decline.png`)} className="text-xs font-bold uppercase tracking-wider px-3 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">
                        Download Chart
                      </button>
                    </div>
                  </div>
                  <div ref={userChartRef} className="h-72 bg-slate-50 rounded-xl p-3">
                    {userDeclineData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={userDeclineData.slice(0, 5)} layout="vertical" margin={{ left: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" width={180} />
                          <Tooltip content={renderDeclineTooltip} />
                          <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 4, 4]}>
                            <LabelList dataKey="percent" position="right" formatter={(value: number) => `${value.toFixed(1)}%`} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-slate-500">No data available</div>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Technical Decline Pattern</p>
                      <h3 className="text-lg font-bold text-slate-900">Top Technical Declines</h3>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => copyChartImage(technicalChartRef.current)} className="text-xs font-bold uppercase tracking-wider px-3 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">
                        Copy Chart
                      </button>
                      <button onClick={() => downloadChartImage(technicalChartRef.current, `${reportType}-technical-decline.png`)} className="text-xs font-bold uppercase tracking-wider px-3 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">
                        Download Chart
                      </button>
                    </div>
                  </div>
                  <div ref={technicalChartRef} className="h-72 bg-slate-50 rounded-xl p-3">
                    {technicalDeclineData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={technicalDeclineData.slice(0, 5)} layout="vertical" margin={{ left: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" width={180} />
                          <Tooltip content={renderDeclineTooltip} />
                          <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 4, 4]}>
                            <LabelList dataKey="percent" position="right" formatter={(value: number) => `${value.toFixed(1)}%`} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-slate-500">No data available</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Advanced Analytics</p>
                  <h3 className="text-lg font-bold text-slate-900">Management Intelligence</h3>
                </div>
                <button
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className="text-xs font-bold uppercase tracking-wider px-3 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50"
                >
                  {showAdvanced ? 'Hide Panel' : 'Show Panel'}
                </button>
              </div>

              {showAdvanced && (
                <div className="mt-6 space-y-6">
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {schemeTopDeclines.map((block) => (
                      <div key={block.scheme} className="border border-slate-200 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3">{block.scheme} Top Declines</h4>
                        {block.declines.length > 0 ? (
                          <div className="space-y-2 text-xs">
                            {block.declines.map((d) => (
                              <div key={`${block.scheme}-${d.code}-${d.description}`} className="flex items-center justify-between">
                                <span className="text-slate-600 truncate">{d.code} · {d.description}</span>
                                <span className="font-semibold text-slate-900">{d.count.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">No data available</div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Top Decline Codes Trend</div>
                      <div className="h-64 mt-3">
                        {topDeclineTrendData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={topDeclineTrendData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="period" />
                              <YAxis />
                              <Tooltip />
                              <Legend verticalAlign="top" height={20} />
                              {topDeclineCodes.map((code, index) => (
                                <Line key={code} type="monotone" dataKey={code} stroke={['#2563eb', '#f59e0b', '#7c3aed'][index] || '#0ea5e9'} strokeWidth={2} dot={{ r: 2 }} />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs text-slate-500">No data available</div>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Contribution % Trend</div>
                      <div className="h-64 mt-3">
                        {declineTrendData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={declineTrendData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="period" />
                              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                              <Tooltip content={renderTrendTooltip} />
                              <Legend verticalAlign="top" height={20} />
                              <Area type="monotone" dataKey="business" name="Business" stackId="1" stroke="#2563eb" fill="#bfdbfe" />
                              <Area type="monotone" dataKey="user" name="User" stackId="1" stroke="#f59e0b" fill="#fde68a" />
                              <Area type="monotone" dataKey="technical" name="Technical" stackId="1" stroke="#7c3aed" fill="#ddd6fe" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs text-slate-500">No data available</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Volume vs Success Correlation</div>
                    <div className="h-64 mt-3">
                      {volumeVsSuccessData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="total" name="Total" tickFormatter={(value) => value.toLocaleString()} />
                            <YAxis dataKey="successRate" name="Success Rate" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                            <Tooltip formatter={(value: number, name: string) => name === 'successRate' ? `${value.toFixed(2)}%` : value.toLocaleString()} />
                            <Scatter data={volumeVsSuccessData} fill="#2563eb" />
                          </ScatterChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-slate-500">No data available</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-900 to-blue-900 border-t-2 border-blue-700 py-8 px-8 text-slate-300 text-xs font-semibold text-center">
        <p>© 2026 Bank of Bhutan | Acquiring Intelligence Platform | All rights reserved</p>
        <p className="mt-2 text-slate-400">Build: {UI_BUILD}</p>
      </footer>
    </div>
  );
};

export default App;
