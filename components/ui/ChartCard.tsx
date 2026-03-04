import React from 'react';

interface ChartCardProps {
  kicker: string;
  title: string;
  actions?: React.ReactNode;
  loading?: boolean;
  children: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({ kicker, title, actions, loading = false, children }) => (
  <section className="chart-card">
    <header className="chart-card-header">
      <div>
        <p className="chart-kicker">{kicker}</p>
        <h3 className="chart-title">{title}</h3>
      </div>
      {actions ? <div className="chart-actions">{actions}</div> : null}
    </header>
    <div className="chart-body">
      {loading ? (
        <div className="chart-skeleton" role="status" aria-label="Loading chart">
          <span className="skeleton-bar" />
          <span className="skeleton-bar" />
          <span className="skeleton-bar" />
        </div>
      ) : (
        children
      )}
    </div>
  </section>
);

export default ChartCard;
