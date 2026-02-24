import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { createAnalyticsAggregator } from '../../utils/analyticsProcessor';
import type { AnalyticsResult, RawAcquiringRow } from '../../types/analytics';

interface UploadSectionProps {
  onAnalyticsReady: (analytics: AnalyticsResult) => void;
  onLoadingChange: (loading: boolean) => void;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onAnalyticsReady, onLoadingChange }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [rowsLoaded, setRowsLoaded] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetStats = () => {
    setProgress(0);
    setRowsLoaded(0);
    setError(null);
  };

  const finalizeAnalytics = (analytics: AnalyticsResult) => {
    setRowsLoaded(analytics.meta.rowsLoaded);
    setProgress(100);
    onAnalyticsReady(analytics);
  };

  const parseCsv = (file: File) => {
    const aggregator = createAnalyticsAggregator();
    let lastProgressUpdate = 0;
    let localRowCount = 0;
    let lastRowsReport = 0;

    Papa.parse<RawAcquiringRow>(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      chunk: (results) => {
        results.data.forEach((row) => {
          aggregator.addRow(row);
        });
        localRowCount += results.data.length;
        if (localRowCount - lastRowsReport > 2000) {
          lastRowsReport = localRowCount;
          setRowsLoaded(localRowCount);
        }

        const cursor = (results.meta as any)?.cursor;
        if (cursor && file.size) {
          const nextProgress = Math.min(99, Math.round((cursor / file.size) * 100));
          if (nextProgress - lastProgressUpdate >= 2) {
            lastProgressUpdate = nextProgress;
            setProgress(nextProgress);
          }
        }
      },
      complete: () => {
        const analytics = aggregator.finalize();
        finalizeAnalytics(analytics);
        setLoading(false);
        onLoadingChange(false);
      },
      error: (err) => {
        setError(err.message || 'Failed to parse CSV file.');
        setLoading(false);
        onLoadingChange(false);
      }
    });
  };

  const parseExcel = async (file: File) => {
    const aggregator = createAnalyticsAggregator();
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error('No sheets found in the Excel file.');
    }

    const rows = XLSX.utils.sheet_to_json<RawAcquiringRow>(sheet, { defval: '' });
    const totalRows = rows.length;
    for (let i = 0; i < totalRows; i += 1) {
      aggregator.addRow(rows[i]);
      if (i % 5000 === 0) {
        setRowsLoaded(i + 1);
        setProgress(Math.min(99, Math.round(((i + 1) / totalRows) * 100)));
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }

    const analytics = aggregator.finalize();
    finalizeAnalytics(analytics);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetStats();
    setLoading(true);
    onLoadingChange(true);

    try {
      if (file.name.toLowerCase().endsWith('.csv')) {
        parseCsv(file);
        return;
      }

      if (file.name.toLowerCase().endsWith('.xlsx')) {
        await parseExcel(file);
        setLoading(false);
        onLoadingChange(false);
        return;
      }

      throw new Error('Unsupported file type. Please upload a CSV or XLSX file.');
    } catch (err: any) {
      setError(err.message || 'Failed to process file.');
      setLoading(false);
      onLoadingChange(false);
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-lg transition-all">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
        <div>
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-widest mb-1">Upload Raw Data</p>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Acquiring Transaction Analytics</h2>
          <p className="text-base text-slate-600 max-w-xl mb-2">
            Upload your full-year acquiring transaction file (<span className="font-mono">.csv</span> or <span className="font-mono">.xlsx</span>).<br />
            <span className="text-blue-700 font-semibold">Currency validation</span> is enforced by channel.<br />
            <span className="text-emerald-700 font-semibold">New:</span> Export includes a debug sheet showing excluded rows and reasons.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start md:items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-all duration-150"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2"><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Processing...</span>
            ) : (
              <span className="flex items-center gap-2"><svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg> Upload Raw Data</span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Rows Loaded</div>
          <div className="text-3xl font-extrabold text-blue-700 mt-2">{rowsLoaded.toLocaleString()}</div>
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Progress</div>
          <div className="mt-2 h-3 bg-white rounded-full border border-slate-200 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs text-slate-500 mt-2">{progress}% complete</div>
        </div>
      </div>

      {loading && (
        <div className="mt-8 flex items-center gap-3 text-base text-blue-700 font-semibold">
          <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Parsing data and calculating analytics. This may take a few moments for large files.
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-base text-red-700 font-semibold shadow-sm flex items-center gap-2">
          <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
          {error}
        </div>
      )}
    </section>
  );
};

export default UploadSection;
