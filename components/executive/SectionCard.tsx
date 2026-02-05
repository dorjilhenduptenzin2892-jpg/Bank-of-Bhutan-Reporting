import React from 'react';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, subtitle, actions, children }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{subtitle}</p>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>
      {actions}
    </div>
    {children}
  </div>
);

export default SectionCard;
