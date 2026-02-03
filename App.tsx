
import React, { useState } from 'react';
import { processExcel } from './services/excelProcessor';
import { generateDocx } from './services/docGenerator';
import { generateNarrative } from './services/geminiService';
import { ReportData, ReportType } from './types';
import { KPIIntelligenceReport } from './services/kpiIntelligence';
import { ResponsiveContainer, Cell, PieChart, Pie, Tooltip } from 'recharts';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [kpiReport, setKpiReport] = useState<KPIIntelligenceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<ReportType>('POS');

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
      
      setLoadingStep('Generating AI-powered narrative analysis...');
      const narrative = await generateNarrative(result.reportData);
      
      const finalData = { ...result.reportData, narrative };
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

  const pieData = reportData ? [
    { name: 'Success', value: reportData.successRate, color: '#10b981' },
    { name: 'Failure', value: reportData.failureRate, color: '#ef4444' }
  ] : [];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-6 shadow-2xl border-b-4 border-blue-600 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            {/* BOB Logo */}
            <div className="flex-shrink-0 h-24 w-32 rounded-xl overflow-hidden bg-gradient-to-br from-white to-blue-50 p-2 shadow-2xl hover:shadow-blue-400/50 transition-all transform hover:scale-105">
              <img src="/bob-logo.svg" alt="Bank of Bhutan" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight leading-tight text-white" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", letterSpacing: '-0.5px' }}>BANK Of Bhutan</h1>
              <p className="text-blue-200 text-sm font-semibold tracking-wider uppercase mt-1">Acquiring Intelligence Platform</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <div className="h-12 w-[2px] bg-gradient-to-b from-transparent via-blue-500 to-transparent opacity-40"></div>
            <div className="text-right">
              <p className="text-xs uppercase text-blue-200 font-semibold tracking-widest">System Status</p>
              <p className="text-sm text-emerald-300 font-semibold flex items-center gap-2 justify-end mt-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-300 rounded-full animate-pulse"></span>
                OPERATIONAL
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
        {!reportData && !loading && (
          <div className="max-w-3xl mx-auto mt-16 animate-in fade-in zoom-in duration-500">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="p-12 text-center bg-gradient-to-b from-blue-50/50 to-white">
                <h2 className="text-5xl font-black text-slate-900 mb-4" style={{ letterSpacing: '-0.5px' }}>Generate Report</h2>
                <p className="text-slate-600 text-lg mb-10 max-w-lg mx-auto leading-relaxed font-medium">
                  Select transaction channel and upload Excel ledger for intelligent acquiring analysis.
                </p>

                <div className="flex justify-center gap-4 mb-12 flex-wrap">
                  <button 
                    onClick={() => handleTypeChange('POS')}
                    className={`px-8 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wide transition-all ${reportType === 'POS' ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    POS Analysis
                  </button>
                  <button 
                    onClick={() => handleTypeChange('ATM')}
                    className={`px-8 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wide transition-all ${reportType === 'ATM' ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    ATM Analysis
                  </button>
                  <button 
                    onClick={() => handleTypeChange('IPG')}
                    className={`px-8 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wide transition-all ${reportType === 'IPG' ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    IPG Analysis
                  </button>
                </div>

                <div className="relative group">
                  <input type="file" id="file-upload" className="hidden" accept=".xlsx" onChange={handleFileUpload} />
                  <label htmlFor="file-upload" className="block w-full border-3 border-dashed border-blue-300 rounded-2xl p-12 cursor-pointer hover:border-blue-500 hover:bg-blue-50/80 transition-all group active:scale-[0.98]">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <span className="text-2xl font-bold text-slate-800 mb-2">Upload {reportType} Ledger</span>
                      <span className="text-slate-500 font-medium text-base">Drag & drop or click to select (.xlsx)</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            {error && (
              <div className="mt-8 p-5 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-center gap-4 animate-in slide-in-from-top-4 shadow-lg">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-red-900 font-bold text-base">Processing Error</p>
                  <p className="text-red-700 text-sm font-medium mt-1">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="relative h-32 w-32 mb-10">
              <div className="absolute inset-0 rounded-full border-[6px] border-slate-100"></div>
              <div className="absolute inset-0 rounded-full border-[6px] border-blue-600 border-t-transparent animate-spin"></div>
            </div>
            <h2 className="text-4xl font-bold text-slate-900 mb-3" style={{ letterSpacing: '-0.5px' }}>Analyzing {reportType} Data</h2>
            <p className="text-slate-500 font-semibold text-base">{loadingStep}</p>
          </div>
        )}

        {reportData && !loading && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header Card */}
            <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-end justify-between bg-white p-10 rounded-2xl shadow-lg border border-slate-200">
              <div className="flex-1">
                <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg mb-4 uppercase tracking-wider">{reportData.reportType} Channel</span>
                <h2 className="text-5xl font-black text-slate-900 mb-2" style={{ letterSpacing: '-0.5px' }}>{reportData.dateRange}</h2>
                <p className="text-sm font-semibold text-slate-600">Total Transactions: <span className="font-black text-slate-900">{reportData.totalTransactions.toLocaleString()}</span></p>
              </div>
              <button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-bold text-base uppercase tracking-wide flex items-center gap-3 shadow-lg transition-all hover:shadow-xl active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Report
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Success Rate Card */}
              <div className="bg-white p-10 rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-10">Success Metrics</h3>
                <div className="relative h-64 w-64 mb-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={80} paddingAngle={8} stroke="none">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black text-slate-900">{reportData.successRate.toFixed(1)}%</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Success</span>
                  </div>
                </div>
              </div>

              {/* Key Declines Table */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Top Decline Reasons</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-widest">Reason</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-widest text-right">Count</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-widest">Typical Cause</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.businessFailures.slice(0, 5).map((f, i) => (
                        <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">{f.description}</td>
                          <td className="px-6 py-4 text-sm font-black text-slate-700 text-right">{f.volume.toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{f.typicalCause}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Summary Section */}
            {reportData.narrative && (
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl shadow-xl p-10">
                <h3 className="text-2xl font-bold mb-6">Report Summary</h3>
                <div className="space-y-4 text-base leading-relaxed text-blue-50">
                  {reportData.narrative.split('\n').filter(p => p.trim()).map((para, i) => (
                    <p key={i} className="font-medium">{para}</p>
                  ))}
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
