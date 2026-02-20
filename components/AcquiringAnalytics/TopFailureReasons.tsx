import React, { useMemo, useState } from 'react';
import { getTopFailureReasons } from '../../utils/analyticsProcessor';
import type { AnalyticsResult, FailureReasonFilters } from '../../types/analytics';

interface TopFailureReasonsProps {
  data: AnalyticsResult | null;
  loading: boolean;
}

const formatNumber = (value: number, decimals = 0) =>
  value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const TopFailureReasons: React.FC<TopFailureReasonsProps> = ({ data, loading }) => {
  const [filters, setFilters] = useState<FailureReasonFilters>({
    channel: 'ALL',
    brand: 'ALL',
    category: 'ALL'
  });

  const topReasons = useMemo(() => {
    if (!data) return [];
    return getTopFailureReasons(data, filters);
  }, [data, filters]);

  if (loading) {
    return <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-pulse h-64" />;
  }

  if (!data) {
    return (
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <p className="text-sm text-slate-500">Failure reasons will appear after data upload.</p>
      </section>
    );
  }

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Top Failure Reasons</p>
          <h3 className="text-lg font-bold text-slate-900">Top 10 Decline Drivers</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={filters.channel}
            onChange={(e) => setFilters((prev) => ({ ...prev, channel: e.target.value as FailureReasonFilters['channel'] }))}
            className="text-xs border border-slate-200 rounded px-3 py-2"
          >
            <option value="ALL">All Channels</option>
            <option value="POS">POS</option>
            <option value="ATM">ATM</option>
            <option value="IPG">IPG</option>
          </select>
          <select
            value={filters.brand}
            onChange={(e) => setFilters((prev) => ({ ...prev, brand: e.target.value as FailureReasonFilters['brand'] }))}
            className="text-xs border border-slate-200 rounded px-3 py-2"
          >
            <option value="ALL">All Brands</option>
            <option value="Visa">Visa</option>
            <option value="MasterCard">MasterCard</option>
            <option value="AMEX">AMEX</option>
          </select>
          <select
            value={filters.category}
            onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value as FailureReasonFilters['category'] }))}
            className="text-xs border border-slate-200 rounded px-3 py-2"
          >
            <option value="ALL">All Categories</option>
            <option value="Business">Business</option>
            <option value="Technical">Technical</option>
            <option value="User">User</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 sticky top-0">
            <tr className="text-left text-xs uppercase tracking-widest text-slate-500">
              <th className="py-3 px-4">Reason</th>
              <th className="py-3 px-4">Count</th>
              <th className="py-3 px-4">Share %</th>
            </tr>
          </thead>
          <tbody>
            {topReasons.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-center text-sm text-slate-500">
                  No failure reasons available for the selected filters.
                </td>
              </tr>
            )}
            {topReasons.map((row) => (
              <tr key={row.reason} className="border-t border-slate-100">
                <td className="py-3 px-4 font-semibold text-slate-900">{row.reason}</td>
                <td className="py-3 px-4">{formatNumber(row.count)}</td>
                <td className="py-3 px-4">{formatNumber(row.share, 2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default TopFailureReasons;
