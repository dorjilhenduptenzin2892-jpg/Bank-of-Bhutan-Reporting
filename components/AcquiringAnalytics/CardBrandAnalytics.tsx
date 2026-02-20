import React from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsResult, BrandMetrics, Channel } from '../../types/analytics';

interface CardBrandAnalyticsProps {
  data: AnalyticsResult | null;
  loading: boolean;
}

const formatNumber = (value: number, decimals = 0) =>
  value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const CardBrandAnalytics: React.FC<CardBrandAnalyticsProps> = ({ data, loading }) => {
  const brands = data?.brands ?? [];

  if (loading) {
    return <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-pulse h-64" />;
  }

  if (!data) {
    return (
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <p className="text-sm text-slate-500">Card brand analytics will appear after data upload.</p>
      </section>
    );
  }

  const chartData = brands.map((brand) => ({
    brand: brand.brand,
    successRate: brand.successRate
  }));

  const channels: Channel[] = ['POS', 'ATM', 'IPG'];

  return (
    <section className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Card Brand Performance</p>
            <h3 className="text-lg font-bold text-slate-900">Success Rate by Brand</h3>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="brand" />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
              <Legend />
              <Bar dataKey="successRate" name="Success Rate" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {brands.map((brand: BrandMetrics) => (
        <div key={brand.brand} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{brand.brand} Summary</p>
              <h3 className="text-lg font-bold text-slate-900">Brand Performance</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="bg-slate-50 rounded-lg px-4 py-2 text-xs text-slate-600">
                Total: <span className="font-semibold text-slate-900">{formatNumber(brand.totalCount)}</span>
              </div>
              <div className="bg-slate-50 rounded-lg px-4 py-2 text-xs text-slate-600">
                Success Rate: <span className="font-semibold text-slate-900">{formatNumber(brand.successRate, 2)}%</span>
              </div>
              <div className="bg-slate-50 rounded-lg px-4 py-2 text-xs text-slate-600">
                BTN Volume: <span className="font-semibold text-slate-900">{formatNumber(brand.volumes.BTN, 2)}</span>
              </div>
              <div className="bg-slate-50 rounded-lg px-4 py-2 text-xs text-slate-600">
                USD Volume: <span className="font-semibold text-slate-900">{formatNumber(brand.volumes.USD, 2)}</span>
              </div>
              <div className="bg-slate-50 rounded-lg px-4 py-2 text-xs text-slate-600">
                INR Volume: <span className="font-semibold text-slate-900">{formatNumber(brand.volumes.INR, 2)}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-left text-xs uppercase tracking-widest text-slate-500">
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Success</th>
                  <th className="py-3 px-4">Failure</th>
                  <th className="py-3 px-4">Success %</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((channel) => (
                  <tr key={`${brand.brand}-${channel}`} className="border-t border-slate-100">
                    <td className="py-3 px-4 font-semibold text-slate-900">{channel}</td>
                    <td className="py-3 px-4">{formatNumber(brand.byChannel[channel].totalCount)}</td>
                    <td className="py-3 px-4">{formatNumber(brand.byChannel[channel].successCount)}</td>
                    <td className="py-3 px-4">{formatNumber(brand.byChannel[channel].failureCount)}</td>
                    <td className="py-3 px-4">{formatNumber(brand.byChannel[channel].successRate, 2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
};

export default CardBrandAnalytics;
