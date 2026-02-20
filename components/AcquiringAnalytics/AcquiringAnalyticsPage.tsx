import React, { useState } from 'react';
import UploadSection from './UploadSection';
import SummaryCards from './SummaryCards';
import TerminalAnalytics from './TerminalAnalytics';
import CardBrandAnalytics from './CardBrandAnalytics';
import FailureCategoryAnalytics from './FailureCategoryAnalytics';
import TopFailureReasons from './TopFailureReasons';
import ExportButtons from './ExportButtons';
import type { AnalyticsResult } from '../../types/analytics';

const AcquiringAnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'analytics-overview', label: 'Overview' },
    { id: 'analytics-terminal', label: 'Terminal Type' },
    { id: 'analytics-brand', label: 'Card Brand' },
    { id: 'analytics-failure', label: 'Failure Analysis' }
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-6">
      <UploadSection
        onAnalyticsReady={setAnalytics}
        onLoadingChange={setLoading}
      />

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => scrollToSection(tab.id)}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all bg-slate-100 text-slate-600 hover:bg-white"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div id="analytics-overview">
        <SummaryCards data={analytics} loading={loading} />
      </div>

      <div id="analytics-terminal">
        <TerminalAnalytics data={analytics} loading={loading} />
      </div>

      <div id="analytics-brand">
        <CardBrandAnalytics data={analytics} loading={loading} />
      </div>

      <div id="analytics-failure" className="space-y-6">
        <FailureCategoryAnalytics data={analytics} loading={loading} />
        <TopFailureReasons data={analytics} loading={loading} />
      </div>

      <ExportButtons data={analytics} />
    </div>
  );
};

export default AcquiringAnalyticsPage;
