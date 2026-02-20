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
    <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Upload Raw Data</p>
          <h2 className="text-2xl font-bold text-slate-900">Acquiring Transaction Analytics</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-xl">
            Upload the full-year acquiring transaction file (CSV or XLSX). Currency validation is enforced by channel.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Upload Raw Data'}
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

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Rows Loaded</div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{rowsLoaded.toLocaleString()}</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Progress</div>
          <div className="mt-2 h-2 bg-white rounded-full border border-slate-200 overflow-hidden">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs text-slate-500 mt-2">{progress}% complete</div>
        </div>
      </div>

      {loading && (
        <div className="mt-6 flex items-center gap-3 text-sm text-slate-600">
          <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Parsing data and calculating analytics. This may take a few moments for large files.
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}
    </section>
  );
};

export default UploadSection;
