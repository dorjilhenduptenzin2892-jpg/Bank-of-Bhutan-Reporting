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
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="h-28 bg-white border border-slate-200 rounded-2xl shadow-sm animate-pulse" />
        ))}
      </section>
    );
  }

  if (!data) {
    return (
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <p className="text-sm text-slate-500">Upload a raw transaction file to generate summary metrics.</p>
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{card.label}</div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{card.value}</div>
        </div>
      ))}
    </section>
  );
};

export default SummaryCards;
