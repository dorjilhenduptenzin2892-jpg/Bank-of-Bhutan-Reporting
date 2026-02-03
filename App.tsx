
import React, { useMemo, useRef, useState } from 'react';
import { processExcel } from './services/excelProcessor';
import { generateDocx } from './services/docGenerator';
import { generateNarrative } from './services/geminiService';
import { ReportData, ReportType } from './types';
import { KPIIntelligenceReport } from './services/kpiIntelligence';
import { ResponsiveContainer, Cell, PieChart, Pie, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const UI_VIEW = true;
const REPORT_VIEW = true;

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [kpiReport, setKpiReport] = useState<KPIIntelligenceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<ReportType>('POS');
  const [period, setPeriod] = useState<'Monthly' | 'Weekly' | 'Yearly'>('Monthly');

  const performanceChartRef = useRef<HTMLDivElement | null>(null);
  const businessChartRef = useRef<HTMLDivElement | null>(null);
  const technicalChartRef = useRef<HTMLDivElement | null>(null);

  const handleTypeChange = (type: ReportType) => {
    setReportType(type);
    setReportData(null);
    setKpiReport(null);
    setError(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setReportData(null);
    setKpiReport(null);
    
    try {
      setLoadingStep('Parsing Excel data...');
      const result = await processExcel(file, reportType);
      
      let finalData = result.reportData;
      if (REPORT_VIEW) {
        setLoadingStep('Generating AI-powered narrative analysis...');
        const narrative = await generateNarrative(result.reportData);
        finalData = { ...result.reportData, narrative };
      }
      setReportData(finalData);
      setKpiReport(result.kpiIntelligence);
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

  const handleDownload = async () => {
    if (!reportData) return;
    try {
      console.log('Starting document generation...');
      console.log('Report data:', reportData);
      console.log('KPI report:', kpiReport);
      
      setError(null);
      
      console.log('Calling generateDocx...');
      const result = await generateDocx(reportData, kpiReport || undefined);
      console.log('Document generated successfully, result:', result);
      
      setError(null);
    } catch (err: any) {
      console.error('Download error details:', err);
      console.error('Error stack:', err.stack);
      const errorMsg = err.message || String(err);
      console.error('Final error message:', errorMsg);
      setError(`Failed to generate Word document: ${errorMsg}`);
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

  const pieData = reportData ? [
    { name: 'Success', value: reportData.successRate, color: '#16a34a' },
    { name: 'Failure', value: reportData.failureRate, color: '#f59e0b' }
  ] : [];

  const totalDeclines = useMemo(() => {
    if (!reportData) return 0;
    const businessTotal = (reportData.businessFailures || []).reduce((s, f) => s + (f.volume || 0), 0);
    const technicalTotal = (reportData.technicalFailures || []).reduce((s, f) => s + (f.volume || 0), 0);
    return businessTotal + technicalTotal;
  }, [reportData]);

  const businessDeclineData = useMemo(() => {
    if (!reportData) return [];
    return (reportData.businessFailures || [])
      .filter(f => (f.volume ?? 0) > 0)
      .slice(0, 10)
      .map(f => ({ name: f.description, value: f.volume }));
  }, [reportData]);

  const technicalDeclineData = useMemo(() => {
    if (!reportData) return [];
    return (reportData.technicalFailures || [])
      .filter(f => (f.volume ?? 0) > 0)
      .slice(0, 10)
      .map(f => ({ name: f.description, value: f.volume }));
  }, [reportData]);

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

            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              {(['Monthly', 'Weekly', 'Yearly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${period === p ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-white'}`}
                >
                  {p}
                </button>
              ))}
            </div>

            <label htmlFor="file-upload" className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer hover:border-slate-400 shadow-sm">
              Import Ledger
            </label>
            <button onClick={handleDownload} className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm">
              Report Export
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
            {!reportData && !loading && (
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
                <p className="text-3xl font-bold text-slate-900 mt-3">{reportData ? `${reportData.successRate.toFixed(2)}%` : '—'}</p>
                <p className="text-xs text-slate-400 mt-1">Authorization success</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Failure Rate</p>
                  <div className="h-9 w-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">●</div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mt-3">{reportData ? `${reportData.failureRate.toFixed(2)}%` : '—'}</p>
                <p className="text-xs text-slate-400 mt-1">Authorization declines</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Total Transactions</p>
                  <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">■</div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mt-3">{reportData ? reportData.totalTransactions.toLocaleString() : '—'}</p>
                <p className="text-xs text-slate-400 mt-1">Processed volume</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Total Declines</p>
                  <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">◆</div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mt-3">{reportData ? totalDeclines.toLocaleString() : '—'}</p>
                <p className="text-xs text-slate-400 mt-1">Decline volume</p>
              </div>
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
                  {reportData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={70} paddingAngle={4} stroke="none">
                          {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
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
                        <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 4, 4]} />
                      </BarChart>
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
                        <Bar dataKey="value" fill="#16a34a" radius={[4, 4, 4, 4]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-500">No data available</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
            {/* KPI Section */}
            {kpiReport && (
              <div className="bg-white p-10 rounded-2xl shadow-lg border border-slate-200">
                <h3 className="text-2xl font-bold text-slate-900 mb-8">KPI Intelligence</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Executive Summary */}
                  {kpiReport.professional_report?.executive_summary && (
                    <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
                      <h4 className="text-sm font-bold text-blue-900 uppercase tracking-widest mb-4">Executive Summary</h4>
                      <p className="text-base text-blue-800 leading-relaxed">{kpiReport.professional_report.executive_summary}</p>
                    </div>
                  )}
                  {/* Key Insights */}
                  {kpiReport.professional_report?.key_insights && (
                    <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200">
                      <h4 className="text-sm font-bold text-emerald-900 uppercase tracking-widest mb-4">Key Insights</h4>
                      <ul className="space-y-2 text-base text-emerald-800">
                        {kpiReport.professional_report.key_insights.slice(0, 3).map((insight, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-emerald-600 font-bold mt-1">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reset Button */}
            <div className="flex justify-center pb-12 pt-8">
               <button onClick={() => { setReportData(null); setKpiReport(null); }} className="flex items-center gap-3 text-slate-600 hover:text-slate-900 font-bold text-sm uppercase tracking-wider transition-all hover:gap-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 0118 0z" />
                </svg>
                Back to Selection
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-900 to-blue-900 border-t-2 border-blue-700 py-8 px-8 text-slate-300 text-xs font-semibold text-center">
        <p>© 2026 Bank of Bhutan | Acquiring Intelligence Platform | All rights reserved</p>
      </footer>
    </div>
  );
};

export default App;
