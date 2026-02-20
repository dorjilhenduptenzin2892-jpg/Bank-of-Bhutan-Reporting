import React from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsResult, FailureCategorySummary } from '../../types/analytics';

interface FailureCategoryAnalyticsProps {
  data: AnalyticsResult | null;
  loading: boolean;
}

const formatNumber = (value: number, decimals = 0) =>
  value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const FailureCategoryAnalytics: React.FC<FailureCategoryAnalyticsProps> = ({ data, loading }) => {
  if (loading) {
    return <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-pulse h-64" />;
  }

  if (!data) {
    return (
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <p className="text-sm text-slate-500">Failure category analysis will appear after data upload.</p>
      </section>
    );
  }

  const overallCategories = data.failureCategories.overall;
  const chartData = overallCategories.map((item) => ({
    category: item.category,
    count: item.count,
    share: item.share
  }));

  const renderCategoryTable = (rows: FailureCategorySummary[]) => (
    <table className="min-w-full text-sm">
      <thead className="bg-slate-50 sticky top-0">
        <tr className="text-left text-xs uppercase tracking-widest text-slate-500">
          <th className="py-3 px-4">Category</th>
          <th className="py-3 px-4">Count</th>
          <th className="py-3 px-4">Share %</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.category} className="border-t border-slate-100">
            <td className="py-3 px-4 font-semibold text-slate-900">{row.category}</td>
            <td className="py-3 px-4">{formatNumber(row.count)}</td>
            <td className="py-3 px-4">{formatNumber(row.share, 2)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <section className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Failure Category Breakdown</p>
            <h3 className="text-lg font-bold text-slate-900">Overall Category Share</h3>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatNumber(value)} />
              <Legend />
              <Bar dataKey="count" name="Count" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Overall Categories</div>
          {renderCategoryTable(overallCategories)}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">POS Categories</div>
          {renderCategoryTable(data.failureCategories.byChannel.POS)}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">ATM Categories</div>
          {renderCategoryTable(data.failureCategories.byChannel.ATM)}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">IPG Categories</div>
          {renderCategoryTable(data.failureCategories.byChannel.IPG)}
        </div>
      </div>
    </section>
  );
};

export default FailureCategoryAnalytics;
