import React from 'react';

interface DashboardLayoutProps {
  pageTitle: string;
  pageSubtitle: string;
  activePage: 'KPI' | 'ACQUIRING_ANALYTICS';
  onPageChange: (page: 'KPI' | 'ACQUIRING_ANALYTICS') => void;
  buildLabel?: string;
  filterBar?: React.ReactNode;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  pageTitle,
  pageSubtitle,
  activePage,
  onPageChange,
  buildLabel,
  filterBar,
  children
}) => {
  return (
    <div className="dashboard-root">
      <div className="main-content">
        <header className="dashboard-header">
          <div className="header-left">
            <img src="/bob-logo.svg" alt="Bank of Bhutan" className="brand-logo" />
            <div>
              <p className="header-kicker">Bank of Bhutan Acquiring Reporting</p>
              <h1 className="page-title">{pageTitle}</h1>
              <p className="header-subtitle section-title">{pageSubtitle}</p>
            </div>
          </div>
          <div className="header-right">
            {buildLabel ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 8px',
                  borderRadius: 999,
                  border: '1px solid var(--line)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-secondary)'
                }}
              >
                Build {buildLabel}
              </span>
            ) : null}
            <div className="header-tabs" role="tablist" aria-label="Dashboard pages">
              <button
                role="tab"
                aria-selected={activePage === 'KPI'}
                type="button"
                className={`header-tab ${activePage === 'KPI' ? 'active' : ''}`}
                onClick={() => onPageChange('KPI')}
              >
                KPI Dashboard
              </button>
              <button
                role="tab"
                aria-selected={activePage === 'ACQUIRING_ANALYTICS'}
                type="button"
                className={`header-tab ${activePage === 'ACQUIRING_ANALYTICS' ? 'active' : ''}`}
                onClick={() => onPageChange('ACQUIRING_ANALYTICS')}
              >
                Analytics
              </button>
            </div>
          </div>
        </header>

        {filterBar ? <div className="sticky-filter-wrap">{filterBar}</div> : null}
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
};
