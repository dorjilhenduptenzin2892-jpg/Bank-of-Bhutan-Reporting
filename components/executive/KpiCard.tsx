import React from 'react';

interface KpiCardProps {
  label: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'flat';
}

const trendStyles: Record<NonNullable<KpiCardProps['trend']>, { icon: string; className: string }> = {
  up: { icon: '▲', className: 'bg-emerald-50 text-emerald-600' },
  down: { icon: '▼', className: 'bg-rose-50 text-rose-600' },
  flat: { icon: '●', className: 'bg-slate-100 text-slate-600' }
};

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, subtitle, trend = 'flat' }) => {
  const trendStyle = trendStyles[trend];
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{label}</p>
        <div className={`h-9 w-9 rounded-full flex items-center justify-center ${trendStyle.className}`}>{trendStyle.icon}</div>
      </div>
      <p className="text-3xl font-bold text-slate-900 mt-3">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-2">{subtitle}</p>}
    </div>
  );
};

export default KpiCard;
