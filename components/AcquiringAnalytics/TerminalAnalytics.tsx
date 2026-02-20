import React from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsResult, ChannelMetrics } from '../../types/analytics';

interface TerminalAnalyticsProps {
  data: AnalyticsResult | null;
  loading: boolean;
}

const formatNumber = (value: number, decimals = 0) =>
  value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const TerminalAnalytics: React.FC<TerminalAnalyticsProps> = ({ data, loading }) => {
  const terminal = data?.terminal ?? [];

  const chartData = terminal.map((item) => ({
    channel: item.channel,
    success: item.successCount,
    failure: item.failureCount
  }));

  if (loading) {
    return (
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-pulse h-64" />
    );
  }

  if (!data) {
    return (
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <p className="text-sm text-slate-500">Terminal analytics will appear after data upload.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Terminal Type Summary</p>
            <h3 className="text-lg font-bold text-slate-900">Success vs Failure by Channel</h3>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="channel" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="success" name="Success" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="failure" name="Failure" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 sticky top-0">
            <tr className="text-left text-xs uppercase tracking-widest text-slate-500">
              <th className="py-3 px-4">Channel</th>
              <th className="py-3 px-4">Total</th>
              <th className="py-3 px-4">Success</th>
              <th className="py-3 px-4">Failure</th>
              <th className="py-3 px-4">Success %</th>
              <th className="py-3 px-4">Failure %</th>
              <th className="py-3 px-4">BTN Volume</th>
              <th className="py-3 px-4">USD Volume</th>
              <th className="py-3 px-4">INR Volume</th>
              <th className="py-3 px-4">Avg Ticket (BTN)</th>
              <th className="py-3 px-4">Avg Ticket (USD)</th>
              <th className="py-3 px-4">Avg Ticket (INR)</th>
            </tr>
          </thead>
          <tbody>
            {terminal.map((row: ChannelMetrics) => (
              <tr key={row.channel} className="border-t border-slate-100">
                <td className="py-3 px-4 font-semibold text-slate-900">{row.channel}</td>
                <td className="py-3 px-4">{formatNumber(row.totalCount)}</td>
                <td className="py-3 px-4">{formatNumber(row.successCount)}</td>
                <td className="py-3 px-4">{formatNumber(row.failureCount)}</td>
                <td className="py-3 px-4">{formatNumber(row.successRate, 2)}%</td>
                <td className="py-3 px-4">{formatNumber(row.failureRate, 2)}%</td>
                <td className="py-3 px-4">{formatNumber(row.volumes.BTN, 2)}</td>
                <td className="py-3 px-4">{formatNumber(row.volumes.USD, 2)}</td>
                <td className="py-3 px-4">{formatNumber(row.volumes.INR, 2)}</td>
                <td className="py-3 px-4">{formatNumber(row.averageTicket.BTN, 2)}</td>
                <td className="py-3 px-4">{formatNumber(row.averageTicket.USD, 2)}</td>
                <td className="py-3 px-4">{formatNumber(row.averageTicket.INR, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default TerminalAnalytics;
