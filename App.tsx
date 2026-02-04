
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { processExcel } from './services/excelProcessor';
import { ReportType } from './types';
import type { PeriodType, RawTransaction } from './lib/bucketing';
import type { BucketKPI } from './lib/kpi';
import type { ComparisonResult } from './lib/comparison';
import { computeKpiByBucket } from './lib/kpi';
import { generateComparisons } from './lib/comparison';
import { generateExecutiveSummary } from './lib/summarizer';
import { bucketTransactions, getDateRange } from './lib/bucketing';
import { ResponsiveContainer, Cell, PieChart, Pie, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, LabelList, Legend } from 'recharts';
import { generateManagementDocxBlob } from './lib/managementDocx';
import { buildManagementNarrative } from './lib/managementNarrative';
import { generateCentralBankDocxBlob } from './lib/centralBankDocx';
import { buildCentralBankReportData } from './lib/centralBankData';

const UI_VIEW = true;
const REPORT_VIEW = true;
const USE_SERVER_EXPORT = false;
const UI_BUILD = '2026-02-04.3';

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

  const performanceChartRef = useRef<HTMLDivElement | null>(null);
  const trendChartRef = useRef<HTMLDivElement | null>(null);
  const businessChartRef = useRef<HTMLDivElement | null>(null);
  const userChartRef = useRef<HTMLDivElement | null>(null);
  const technicalChartRef = useRef<HTMLDivElement | null>(null);

  const handleTypeChange = (type: ReportType) => {
    setReportType(type);
    setTransactions([]);
    setBuckets([]);
    setComparisons([]);
    setExecutiveSummary('');
    setDateRange('');
    setError(null);
  };

  useEffect(() => {
    if (transactions.length === 0) return;
    const updatedBuckets = computeKpiByBucket(transactions, reportType, period);
    const updatedComparisons = generateComparisons(updatedBuckets);
    const updatedSummary = generateExecutiveSummary(reportType, period, updatedBuckets, updatedComparisons);
    const { start, end } = getDateRange(transactions);
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
  }, [period, reportType, transactions]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    
    try {
      setLoadingStep('Parsing Excel data...');
      const result = await processExcel(file, reportType, period);
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
    if (!transactions.length) return;
    try {
      setError(null);
      let exportTransactions = transactions;

      const { reportData, kpiReport } = buildCentralBankReportData(reportType, exportTransactions);
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
    if (!transactions.length) return;
    try {
      setError(null);
      if (USE_SERVER_EXPORT) {
        const response = await fetch('/api/export-management', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: reportType,
            period,
            transactions
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
        period,
        transactions,
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

  const outcomeData = useMemo(() => {
    if (!currentBucket) return [];
    return [
      { name: 'Success', value: currentBucket.success_rate, color: '#16a34a' },
      { name: 'Business', value: currentBucket.business_rate, color: '#2563eb' },
      { name: 'User', value: currentBucket.user_rate, color: '#f59e0b' },
      { name: 'Technical', value: currentBucket.technical_rate, color: '#7c3aed' }
    ];
  }, [currentBucket]);

  const totalDeclines = currentBucket
    ? currentBucket.business_failures + currentBucket.user_failures + currentBucket.technical_failures
    : 0;

  const businessDeclineData = currentBucket
    ? currentBucket.business_declines.map((d) => ({ name: d.description, value: d.count }))
    : [];
  const userDeclineData = currentBucket
    ? currentBucket.user_declines.map((d) => ({ name: d.description, value: d.count }))
    : [];
  const technicalDeclineData = currentBucket
    ? currentBucket.technical_declines.map((d) => ({ name: d.description, value: d.count }))
    : [];

  const comparativeChartData = useMemo(() => (
    buckets.map((b) => ({ period: b.period, success: b.success_rate }))
  ), [buckets]);

  const successFailureTrendData = useMemo(() => (
    buckets.map((b) => ({
      period: b.period,
      success: b.success_rate,
      failure: Number((100 - b.success_rate).toFixed(2))
    }))
  ), [buckets]);

  const declineTrendData = useMemo(() => (
    buckets.map((b) => ({
      period: b.period,
      business: b.business_rate,
      user: b.user_rate,
      technical: b.technical_rate
    }))
  ), [buckets]);

  const schemeData = useMemo(() => {
    if (!currentBucket) return [] as { name: string; value: number }[];
    const bucketed = bucketTransactions(transactions, period);
    const bucketTransactionsList = bucketed[currentBucket.period] || [];

    const normalizeScheme = (value?: string) => {
      const raw = (value || '').trim().toUpperCase();
      if (!raw) return 'Other';
      if (raw.includes('VISA')) return 'VISA';
      if (raw.includes('MASTERCARD') || raw.includes('MASTER')) return 'MASTERCARD';
      if (raw.includes('AMEX') || raw.includes('AMERICAN')) return 'AMEX';
      if (raw.includes('JCB')) return 'JCB';
      if (raw.includes('UNIONPAY') || raw.includes('UPI')) return 'UNIONPAY';
      if (raw.includes('RUPAY')) return 'RUPAY';
      if (raw.includes('DISCOVER')) return 'DISCOVER';
      return 'Other';
    };

    const counts = bucketTransactionsList.reduce<Record<string, number>>((acc, tx) => {
      const scheme = normalizeScheme(tx.card_network);
      acc[scheme] = (acc[scheme] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [currentBucket, period, transactions]);

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
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Acquiring KPI Dashboard</p>
              <h1 className="text-2xl font-bold text-slate-900">Transaction Performance & Decline Analytics</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">Tier-1 banking-grade monitoring for {reportType} acquiring</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              {(['POS', 'ATM', 'IPG'] as ReportType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleTypeChange(type)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${reportType === type ? 'bg-blue-700 text-white shadow' : 'text-slate-600 hover:bg-white'}`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">View By</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as PeriodType)}
                className="text-xs border border-slate-200 rounded px-2 py-1"
              >
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>

            <label htmlFor="file-upload" className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer hover:border-slate-400 shadow-sm">
              Import Ledger
            </label>
            <button onClick={handleCentralExport} className="bg-slate-900 hover:bg-slate-950 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm">
              Export (Central Bank)
            </button>
            <button onClick={handleManagementExport} className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm">
              Management Report
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
                      <p className="text-sm text-slate-500 mt-2">Upload a POS, ATM, or IPG ledger to populate KPI metrics and decline charts.</p>
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
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Success Rate</p>
                  <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">▲</div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mt-3">{currentBucket ? `${currentBucket.success_rate.toFixed(2)}%` : '—'}</p>
                <p className="text-xs text-slate-400 mt-1">Total success / total transactions</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Failure Rate</p>
                  <div className="h-9 w-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">●</div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mt-3">{currentBucket ? `${(100 - currentBucket.success_rate).toFixed(2)}%` : '—'}</p>
                <p className="text-xs text-slate-400 mt-1">Total failures / total transactions</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Total Transactions</p>
                  <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">■</div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mt-3">{currentBucket ? currentBucket.total.toLocaleString() : '—'}</p>
                <p className="text-xs text-slate-400 mt-1">Processed volume</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Total Failures</p>
                  <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">◆</div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mt-3">{currentBucket ? totalDeclines.toLocaleString() : '—'}</p>
                <p className="text-xs text-slate-400 mt-1">Business + user + technical</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Failure Breakdown (Share of Total Failures)</div>
              <div className="text-sm text-slate-700 font-semibold">Business: <span className="text-slate-900">{currentBucket ? `${currentBucket.business_rate.toFixed(2)}%` : '—'}</span></div>
              <div className="text-sm text-slate-700 font-semibold">User: <span className="text-slate-900">{currentBucket ? `${currentBucket.user_rate.toFixed(2)}%` : '—'}</span></div>
              <div className="text-sm text-slate-700 font-semibold">Technical: <span className="text-slate-900">{currentBucket ? `${currentBucket.technical_rate.toFixed(2)}%` : '—'}</span></div>
              <div className="text-sm text-slate-700 font-semibold">Date Range: <span className="text-slate-900">{dateRange || '—'}</span></div>
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

            {/* Graphs */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Transaction Performance</p>
                    <h3 className="text-lg font-bold text-slate-900">Authorization Outcomes</h3>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => copyChartImage(performanceChartRef.current)} className="text-xs font-bold uppercase tracking-wider px-3 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">
                      Copy Chart
                    </button>
                    <button onClick={() => downloadChartImage(performanceChartRef.current, `${reportType}-performance.png`)} className="text-xs font-bold uppercase tracking-wider px-3 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">
                      Download Chart
                    </button>
                  </div>
                </div>
                <div ref={performanceChartRef} className="h-72 bg-slate-50 rounded-xl p-3">
                  {currentBucket ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={outcomeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={70} paddingAngle={4} stroke="none">
                          {outcomeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
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
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Performance Trend</p>
                    <h3 className="text-lg font-bold text-slate-900">Success vs Failure</h3>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => copyChartImage(trendChartRef.current)} className="text-xs font-bold uppercase tracking-wider px-3 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">
                      Copy Chart
                    </button>
                    <button onClick={() => downloadChartImage(trendChartRef.current, `${reportType}-success-failure-trend.png`)} className="text-xs font-bold uppercase tracking-wider px-3 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">
                      Download Chart
                    </button>
                  </div>
                </div>
                <div ref={trendChartRef} className="h-72 bg-slate-50 rounded-xl p-3">
                  {buckets.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={successFailureTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="success" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} label={{ position: 'top', formatter: (value: number) => `${value.toFixed(1)}%` }} />
                        <Line type="monotone" dataKey="failure" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} label={{ position: 'top', formatter: (value: number) => `${value.toFixed(1)}%` }} />
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
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Decline Distribution</p>
                    <h3 className="text-lg font-bold text-slate-900">Business Decline Profile</h3>
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
                      <BarChart data={businessDeclineData} layout="vertical" margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={160} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 4, 4]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-500">No data available</div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Decline Mix Over Time</p>
                  <h3 className="text-lg font-bold text-slate-900">Share of Failures by Cause</h3>
                </div>
              </div>
              <div className="h-72 bg-slate-50 rounded-xl p-3">
                {buckets.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={declineTrendData} barSize={28} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="4 4" />
                      <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                      <Legend verticalAlign="top" height={28} />
                      <Bar dataKey="business" stackId="a" fill="#2563eb" name="Business" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="user" stackId="a" fill="#f59e0b" name="User" />
                      <Bar dataKey="technical" stackId="a" fill="#7c3aed" name="Technical" radius={[0, 0, 4, 4]} />
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
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Scheme Distribution</p>
                  <h3 className="text-lg font-bold text-slate-900">Card Brand Mix</h3>
                </div>
              </div>
              <div className="h-72 bg-slate-50 rounded-xl p-3">
                {schemeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={schemeData} layout="vertical" margin={{ left: 40, right: 20, top: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="4 4" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => value.toLocaleString()} />
                      <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 4, 4]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-slate-500">No data available</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Decline Distribution</p>
                    <h3 className="text-lg font-bold text-slate-900">User Decline Profile</h3>
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
                      <BarChart data={userDeclineData} layout="vertical" margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={160} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 4, 4]} />
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
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Technical Response Profile</p>
                    <h3 className="text-lg font-bold text-slate-900">Technical Decline Distribution</h3>
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
                      <BarChart data={technicalDeclineData} layout="vertical" margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={160} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 4, 4]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-500">No data available</div>
                  )}
                </div>
              </div>
            </div>


            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {[
                { title: 'Top 10 Business Declines', data: currentBucket?.business_declines || [] },
                { title: 'Top 10 User Declines', data: currentBucket?.user_declines || [] },
                { title: 'Top 10 Technical Declines', data: currentBucket?.technical_declines || [] }
              ].map((block) => (
                <div key={block.title} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">{block.title}</h3>
                  {block.data.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="py-2">Code</th>
                            <th className="py-2">Description</th>
                            <th className="py-2 text-right">Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {block.data.slice(0, 10).map((d, i) => (
                            <tr key={`${d.code}-${i}`}>
                              <td className="py-2 font-semibold text-slate-700">{d.code}</td>
                              <td className="py-2 text-slate-600">{d.description}</td>
                              <td className="py-2 text-right text-slate-700 font-semibold">{d.count.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">No data available</div>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Report Snapshot (UI)</h3>
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="py-2">Success Rate</th>
                      <th className="py-2">Failure Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 font-semibold text-slate-700">{currentBucket ? `${currentBucket.success_rate.toFixed(2)}%` : '—'}</td>
                      <td className="py-2 font-semibold text-slate-700">{currentBucket ? `${(100 - currentBucket.success_rate).toFixed(2)}%` : '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {[
                  { title: 'Top 10 Business Declines', data: currentBucket?.business_declines || [] },
                  { title: 'Top 10 User Declines', data: currentBucket?.user_declines || [] },
                  { title: 'Top 10 Technical Declines', data: currentBucket?.technical_declines || [] }
                ].map((block) => (
                  <div key={`${block.title}-snapshot`} className="border border-slate-200 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3">{block.title}</h4>
                    {block.data.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-slate-500">
                              <th className="py-2">Description</th>
                              <th className="py-2 text-right">Count</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {block.data.slice(0, 10).map((d, i) => (
                              <tr key={`${block.title}-${i}`}>
                                <td className="py-2 text-slate-600">{d.description}</td>
                                <td className="py-2 text-right text-slate-700 font-semibold">{d.count.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">No data available</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Period Breakdown</p>
                  <h3 className="text-lg font-bold text-slate-900">Weekly / Monthly / Yearly Buckets</h3>
                </div>
                <div className="text-xs font-semibold text-slate-500">{period}</div>
              </div>
              {buckets.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="py-2">Period</th>
                        <th className="py-2 text-right">Total</th>
                        <th className="py-2 text-right">Success %</th>
                        <th className="py-2 text-right">Business %</th>
                        <th className="py-2 text-right">User %</th>
                        <th className="py-2 text-right">Technical %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {buckets.map((b) => (
                        <tr key={b.period}>
                          <td className="py-2 font-semibold text-slate-700">{b.period}</td>
                          <td className="py-2 text-right text-slate-700">{b.total.toLocaleString()}</td>
                          <td className="py-2 text-right text-slate-700">{b.success_rate.toFixed(2)}%</td>
                          <td className="py-2 text-right text-slate-700">{b.business_rate.toFixed(2)}%</td>
                          <td className="py-2 text-right text-slate-700">{b.user_rate.toFixed(2)}%</td>
                          <td className="py-2 text-right text-slate-700">{b.technical_rate.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-slate-500">No data available</div>
              )}
            </div>
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
