import React from 'react';
import type { ReportType } from '../../types';
import type { PeriodType } from '../../lib/bucketing';
import { Button } from './Button';

interface FilterState {
  reportType: ReportType;
  period: PeriodType;
  schemeScope: 'ALL' | 'VISA' | 'MASTERCARD' | 'UNIONPAY' | 'RUPAY';
  customStart: string;
  customEnd: string;
}

interface FilterBarProps {
  filters: FilterState;
  dateBounds: { min: string; max: string };
  applying: boolean;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onApply: () => void;
  onReset: () => void;
  onImportClick: () => void;
  onExportClick: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  dateBounds,
  applying,
  onFilterChange,
  onApply,
  onReset,
  onImportClick,
  onExportClick
}) => (
  <section className={`filter-bar ${applying ? 'applying' : ''}`}>
    <div className="filter-grid">
      <label className="filter-field">
        <span>Channel</span>
        <select value={filters.reportType} onChange={(e) => onFilterChange('reportType', e.target.value as ReportType)}>
          <option value="POS">POS</option>
          <option value="ATM">ATM</option>
          <option value="IPG">IPG</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Aggregation</span>
        <select value={filters.period} onChange={(e) => onFilterChange('period', e.target.value as PeriodType)}>
          <option value="DAILY">Daily</option>
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
          <option value="QUARTERLY">Quarterly</option>
          <option value="YEARLY">Yearly</option>
          <option value="CUSTOM">Custom Range</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Scheme</span>
        <select
          value={filters.schemeScope}
          onChange={(e) => onFilterChange('schemeScope', e.target.value as FilterState['schemeScope'])}
        >
          <option value="ALL">All Schemes</option>
          <option value="VISA">Visa</option>
          <option value="MASTERCARD">Mastercard</option>
          <option value="UNIONPAY">UnionPay</option>
          <option value="RUPAY">RuPay</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Start Date</span>
        <input
          type="date"
          value={filters.customStart}
          min={dateBounds.min || undefined}
          max={dateBounds.max || undefined}
          disabled={filters.period !== 'CUSTOM'}
          onChange={(e) => onFilterChange('customStart', e.target.value)}
        />
      </label>
      <label className="filter-field">
        <span>End Date</span>
        <input
          type="date"
          value={filters.customEnd}
          min={dateBounds.min || undefined}
          max={dateBounds.max || undefined}
          disabled={filters.period !== 'CUSTOM'}
          onChange={(e) => onFilterChange('customEnd', e.target.value)}
        />
      </label>
    </div>
    <div className="filter-actions">
      <Button btnType="secondary" onClick={onImportClick}>Import Ledger</Button>
      <Button btnType="primary" onClick={onExportClick}>Download Central Bank Report</Button>
      <Button btnType="ghost" onClick={onReset}>Reset</Button>
      <Button btnType="primary" loading={applying} onClick={onApply}>Apply Filters</Button>
    </div>
  </section>
);

export type { FilterState };
export default FilterBar;
