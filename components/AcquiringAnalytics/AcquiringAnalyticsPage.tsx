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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-2 md:px-0">
      <div className="max-w-5xl mx-auto space-y-10">
        <UploadSection
          onAnalyticsReady={setAnalytics}
          onLoadingChange={setLoading}
        />

        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-md flex flex-wrap gap-2 justify-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => scrollToSection(tab.id)}
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div id="analytics-overview" className="transition-all duration-300">
          <SummaryCards data={analytics} loading={loading} />
        </div>

        <div id="analytics-terminal" className="transition-all duration-300">
          <TerminalAnalytics data={analytics} loading={loading} />
        </div>

        <div id="analytics-brand" className="transition-all duration-300">
          <CardBrandAnalytics data={analytics} loading={loading} />
        </div>

        <div id="analytics-failure" className="space-y-6 transition-all duration-300">
          <FailureCategoryAnalytics data={analytics} loading={loading} />
          <TopFailureReasons data={analytics} loading={loading} />
        </div>

        <ExportButtons data={analytics} />
      </div>
    </div>
  );
};

export default AcquiringAnalyticsPage;
