
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50" style={{ fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 shadow-2xl border-b-4 border-blue-500 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            {/* BOB Logo - Large and Prominent */}
            <div className="flex-shrink-0 h-24 w-32 rounded-xl overflow-hidden bg-gradient-to-br from-white to-blue-50 p-2 shadow-2xl hover:shadow-blue-500/50 hover:shadow-2xl transition-all transform hover:scale-105">
              <img src="/bob-logo.svg" alt="Bank of Bhutan" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight leading-tight text-white" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>BANK Of Bhutan</h1>
              <p className="text-blue-300 text-base font-bold tracking-widest uppercase">Acquiring Reporting System</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <div className="h-12 w-[2px] bg-gradient-to-b from-transparent via-slate-600 to-transparent"></div>
            <div className="text-right">
              <p className="text-xs uppercase text-slate-400 font-semibold tracking-widest">Terminal Status</p>
              <p className="text-sm text-emerald-400 font-medium flex items-center gap-2 justify-end mt-1">
                <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></span>
                SYSTEM ACTIVE
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
        {!reportData && !loading && (
          <div className="max-w-3xl mx-auto mt-12 animate-in fade-in zoom-in duration-500">
            <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200">
              <div className="p-12 text-center bg-gradient-to-b from-slate-50 to-white">
                <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Generate Management Report</h2>
                <p className="text-slate-500 text-lg mb-8 max-w-lg mx-auto leading-relaxed">
                  Select your analysis track and upload transaction ledger.
                </p>

                <div className="flex justify-center gap-4 mb-10 flex-wrap">
                  <button 
                    onClick={() => handleTypeChange('POS')}
                    className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${reportType === 'POS' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >
                    POS Analysis
                  </button>
                  <button 
                    onClick={() => handleTypeChange('ATM')}
                    className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${reportType === 'ATM' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >
                    ATM Analysis
                  </button>
                  <button 
                    onClick={() => handleTypeChange('IPG')}
                    className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${reportType === 'IPG' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >
                    IPG Analysis
                  </button>
                </div>

                <div className="relative group">
                  <input type="file" id="file-upload" className="hidden" accept=".xlsx" onChange={handleFileUpload} />
                  <label htmlFor="file-upload" className="block w-full border-4 border-dashed border-slate-200 rounded-3xl p-16 cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all group active:scale-[0.98]">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <span className="text-xl font-black text-slate-800 mb-2">Upload {reportType} Ledger</span>
                      <span className="text-slate-400 font-medium text-sm">Drag & drop Microsoft Excel (.xlsx)</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            {error && (
              <div className="mt-6 p-5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-4">
                <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-rose-900 font-bold">Processing Error</p>
                  <p className="text-rose-700 text-sm">{error}</p>
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
            <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Synthesizing {reportType} Report</h2>
            <p className="text-slate-400 font-bold tracking-[0.2em] uppercase text-xs">{loadingStep}</p>
          </div>
        )}

        {reportData && !loading && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-end justify-between bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden relative">
              <div className="relative z-10">
                <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 text-[11px] font-black rounded-full mb-4 uppercase tracking-[0.15em]">{reportData.reportType} Dataset</span>
                <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-2">{reportData.dateRange}</h2>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Transactions: {reportData.totalTransactions.toLocaleString()}</p>
              </div>
              <button onClick={handleDownload} className="bg-slate-900 hover:bg-black text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-4 shadow-2xl transition-all hover:-translate-y-1 active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export .DOCX
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200 flex flex-col items-center">
                <h3 className="w-full text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-10 border-b border-slate-50 pb-4">Auth Metrics</h3>
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
                    <span className="text-5xl font-black text-slate-900 tracking-tighter">{reportData.successRate.toFixed(1)}%</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Health</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Key Declines</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase">
                        <th className="px-10 py-5">Decline Reason</th>
                        <th className="px-10 py-5 text-right">Volume</th>
                        <th className="px-10 py-5">Typical Cause</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.businessFailures.slice(0, 5).map((f, i) => (
                        <tr key={i} className="hover:bg-blue-50/20">
                          <td className="px-10 py-6 text-sm font-black text-slate-900">{f.description}</td>
                          <td className="px-10 py-6 text-sm font-mono font-black text-slate-700 text-right">{f.volume.toLocaleString()}</td>
                          <td className="px-10 py-6 text-xs text-slate-500 italic">{f.typicalCause}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-[3rem] shadow-2xl p-12 relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="text-3xl font-black italic tracking-tighter uppercase mb-8">Executive Summary</h3>
                <div className="space-y-6 max-w-4xl border-l border-white/10 pl-10">
                  {reportData.narrative.split('\n').filter(p => p.trim()).map((para, i) => (
                    <p key={i} className="text-slate-300 text-lg leading-relaxed">{para}</p>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-center pb-24 pt-12">
               <button onClick={() => { setReportData(null); setKpiReport(null); }} className="flex items-center gap-3 text-slate-400 hover:text-slate-900 font-black text-[11px] uppercase tracking-[0.25em] transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 0118 0z" />
                </svg>
                Back to Selection
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-10 px-8 mt-auto text-slate-400 text-[10px] font-bold tracking-widest uppercase text-center">
        <p>©dorjilhenduptenzin</p>
      </footer>
    </div>
  );
};

export default App;
