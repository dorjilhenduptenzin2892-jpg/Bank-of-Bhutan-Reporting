import React, { useEffect, useMemo, useState } from 'react';
import type { AnalyticsResult } from '../../types/analytics';

interface SummaryCardsProps {
  data: AnalyticsResult | null;
  loading: boolean;
}

const useCountUp = (value: number, duration = 800) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    let rafId: number;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min(1, (timestamp - start) / duration);
      setDisplayValue(value * progress);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value, duration]);

  return displayValue;
};

const formatNumber = (value: number, decimals = 0) =>
  value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const SummaryCards: React.FC<SummaryCardsProps> = ({ data, loading }) => {
  const overall = data?.overall;

  const totalCount = useCountUp(overall?.totalCount ?? 0);
  const successCount = useCountUp(overall?.successCount ?? 0);
  const failureCount = useCountUp(overall?.failureCount ?? 0);
  const successRate = useCountUp(overall?.successRate ?? 0);
  const btnVolume = useCountUp(overall?.volumes.BTN ?? 0);
  const usdVolume = useCountUp(overall?.volumes.USD ?? 0);
  const inrVolume = useCountUp(overall?.volumes.INR ?? 0);

  const cards = useMemo(
    () => [
      { label: 'Total Transactions', value: formatNumber(totalCount) },
      { label: 'Success Count', value: formatNumber(successCount) },
      { label: 'Failure Count', value: formatNumber(failureCount) },
      { label: 'Success Rate', value: `${formatNumber(successRate, 2)}%` },
      { label: 'BTN Volume', value: formatNumber(btnVolume, 2) },
      { label: 'USD Volume', value: formatNumber(usdVolume, 2) },
      { label: 'INR Volume', value: formatNumber(inrVolume, 2) }
    ],
    [btnVolume, failureCount, inrVolume, successCount, successRate, totalCount, usdVolume]
  );

  if (loading) {
    return (
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-pulse h-24" />
        ))}
      </section>
    );
  }

  if (!data) {
    return (
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-start">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Summary</div>
            <div className="text-2xl font-bold text-slate-300">--</div>
          </div>
        ))}
      </section>
    );
  }

  const icons = [
    <svg key="txns" className="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 6h18M3 14h18M3 18h18" /></svg>,
    <svg key="success" className="h-6 w-6 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>,
    <svg key="fail" className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
    <svg key="rate" className="h-6 w-6 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m4 4h1a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v7a2 2 0 002 2h1" /></svg>,
    <svg key="btn" className="h-6 w-6 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z" /></svg>,
    <svg key="usd" className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z" /></svg>,
    <svg key="inr" className="h-6 w-6 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z" /></svg>
  ];

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card, i) => (
        <div key={card.label} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md flex flex-col items-start gap-2 transition-all">
          <div className="flex items-center gap-2 mb-1">
            {icons[i]}
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{card.label}</span>
          </div>
          <div className="text-3xl font-extrabold text-blue-700 animate-fade-in">{card.value}</div>
        </div>
      ))}
    </section>
  );
};

export default SummaryCards;
