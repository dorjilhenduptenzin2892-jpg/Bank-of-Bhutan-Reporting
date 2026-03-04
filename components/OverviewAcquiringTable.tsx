import React, { useMemo, useState } from 'react';
import type { RawTransaction } from '../lib/bucketing';
import { classifyResponse } from '../lib/classifier';
import type { ReportType } from '../types';

type Channel = 'ATM' | 'POS' | 'IPG';
type DetailKey = 'approved' | 'business' | 'user' | 'technical' | 'grand';

type DetailDef = {
  key: DetailKey;
  label: string;
};

type ScopeCounts = {
  approved: number;
  business: number;
  user: number;
  technical: number;
  grand: number;
};

type MonthBreakdown = {
  monthIndex: number;
  label: string;
  byChannel: Record<Channel, ScopeCounts>;
  totalAcquiring: ScopeCounts;
};

const CHANNELS: Channel[] = ['ATM', 'POS', 'IPG'];
const DETAILS: DetailDef[] = [
  { key: 'approved', label: 'APPROVED - Total' },
  { key: 'business', label: 'BUSINESS DECLINE - Total' },
  { key: 'user', label: 'BUSINESS DECLINE(USER ERROR) - Total' },
  { key: 'technical', label: 'TECHNICAL DECLINE - Total' },
  { key: 'grand', label: 'Grand Total' }
];

const CELL_BORDER = '2px solid #6b7280';

function toValidDate(value: string | Date): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function zeroCounts(): ScopeCounts {
  return { approved: 0, business: 0, user: 0, technical: 0, grand: 0 };
}

function formatInt(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

function formatPct(value: number | null): string {
  if (value === null) return '';
  return Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : '0.00%';
}

function calcCounts(rows: RawTransaction[], channel: Channel): ScopeCounts {
  const counts = zeroCounts();
  const channelRows = rows.filter((tx) => tx.channel === channel);
  for (const tx of channelRows) {
    const category = classifyResponse(channel as ReportType, tx.response_code);
    if (category === 'success') counts.approved += 1;
    if (category === 'business_decline') counts.business += 1;
    if (category === 'user_decline') counts.user += 1;
    if (category === 'technical_decline') counts.technical += 1;
  }
  counts.grand = channelRows.length;
  return counts;
}

function sumCounts(items: ScopeCounts[]): ScopeCounts {
  return items.reduce(
    (acc, item) => ({
      approved: acc.approved + item.approved,
      business: acc.business + item.business,
      user: acc.user + item.user,
      technical: acc.technical + item.technical,
      grand: acc.grand + item.grand
    }),
    zeroCounts()
  );
}

function getByKey(counts: ScopeCounts, key: DetailKey): number {
  if (key === 'approved') return counts.approved;
  if (key === 'business') return counts.business;
  if (key === 'user') return counts.user;
  if (key === 'technical') return counts.technical;
  return counts.grand;
}

function pctOnTotal(value: number, total: number): number {
  if (total <= 0) return 0;
  return value / total;
}

type Props = {
  transactions: RawTransaction[];
};

const OverviewAcquiringTable: React.FC<Props> = ({ transactions }) => {
  const [showMonthlyBreakdown, setShowMonthlyBreakdown] = useState(false);

  const model = useMemo(() => {
    const knownRows = transactions.filter((tx) => tx.channel === 'ATM' || tx.channel === 'POS' || tx.channel === 'IPG');
    const datedRows = knownRows
      .map((tx) => ({ tx, date: toValidDate(tx.transaction_datetime) }))
      .filter((item) => item.date !== null) as Array<{ tx: RawTransaction; date: Date }>;

    let yearLabel = 'All Data';
    let monthLabel = 'All Data';
    let yearRows: RawTransaction[] = knownRows;
    let monthRows: RawTransaction[] = knownRows;
    let monthBreakdown: MonthBreakdown[] = [];

    if (datedRows.length > 0) {
      const maxYear = Math.max(...datedRows.map((item) => item.date.getFullYear()));
      const yearDatedRows = datedRows.filter((item) => item.date.getFullYear() === maxYear);
      const maxMonth = Math.max(...yearDatedRows.map((item) => item.date.getMonth()));

      yearLabel = String(maxYear);
      monthLabel = new Date(maxYear, maxMonth, 1).toLocaleString('en-US', { month: 'short' });
      yearRows = yearDatedRows.map((item) => item.tx);
      monthRows = yearDatedRows.filter((item) => item.date.getMonth() === maxMonth).map((item) => item.tx);

      const monthSet = new Set<number>(yearDatedRows.map((item) => item.date.getMonth()));
      const months = [...monthSet].sort((a, b) => a - b);
      monthBreakdown = months.map((monthIndex) => {
        const rows = yearDatedRows.filter((item) => item.date.getMonth() === monthIndex).map((item) => item.tx);
        const byChannel = {
          ATM: calcCounts(rows, 'ATM'),
          POS: calcCounts(rows, 'POS'),
          IPG: calcCounts(rows, 'IPG')
        };
        return {
          monthIndex,
          label: new Date(maxYear, monthIndex, 1).toLocaleString('en-US', { month: 'short' }),
          byChannel,
          totalAcquiring: sumCounts([byChannel.ATM, byChannel.POS, byChannel.IPG])
        };
      });
    }

    const yearByChannel = {
      ATM: calcCounts(yearRows, 'ATM'),
      POS: calcCounts(yearRows, 'POS'),
      IPG: calcCounts(yearRows, 'IPG')
    };
    const monthByChannel = {
      ATM: calcCounts(monthRows, 'ATM'),
      POS: calcCounts(monthRows, 'POS'),
      IPG: calcCounts(monthRows, 'IPG')
    };

    const yearTotalAcquiring = sumCounts([yearByChannel.ATM, yearByChannel.POS, yearByChannel.IPG]);
    const monthTotalAcquiring = sumCounts([monthByChannel.ATM, monthByChannel.POS, monthByChannel.IPG]);

    return {
      yearLabel,
      monthLabel,
      yearByChannel,
      monthByChannel,
      yearTotalAcquiring,
      monthTotalAcquiring,
      monthBreakdown,
      hasMultipleMonths: monthBreakdown.length > 1
    };
  }, [transactions]);

  const renderDualScopeRows = (
    channelLabel: string,
    yearCounts: ScopeCounts,
    monthCounts: ScopeCounts,
    isTotalAcquiring: boolean
  ) => {
    const yearFailureTotal = yearCounts.business + yearCounts.user + yearCounts.technical;
    const monthFailureTotal = monthCounts.business + monthCounts.user + monthCounts.technical;

    return DETAILS.map((detail, idx) => {
      const yearValue = getByKey(yearCounts, detail.key);
      const monthValue = getByKey(monthCounts, detail.key);

      const yearPctOnTotal = pctOnTotal(yearValue, yearCounts.grand);
      const monthPctOnTotal = pctOnTotal(monthValue, monthCounts.grand);

      let yearPctToFailure: number | null = null;
      let monthPctToFailure: number | null = null;

      if (!isTotalAcquiring) {
        if (detail.key === 'grand') {
          yearPctToFailure = 1;
          monthPctToFailure = 1;
        } else if (detail.key !== 'approved') {
          yearPctToFailure = pctOnTotal(yearValue, yearFailureTotal);
          monthPctToFailure = pctOnTotal(monthValue, monthFailureTotal);
        }
      }

      return (
        <tr key={`${channelLabel}-${detail.key}`}>
          <td style={{ padding: '4px 6px', border: CELL_BORDER, fontWeight: idx === 0 ? 600 : 400, whiteSpace: 'normal', wordBreak: 'break-word' }}>
            {idx === 0 ? channelLabel : ''}
          </td>
          <td style={{ padding: '4px 6px', border: CELL_BORDER, whiteSpace: 'normal', wordBreak: 'break-word' }}>{detail.label}</td>
          <td style={{ padding: '4px 6px', border: CELL_BORDER, textAlign: 'right' }}>{formatInt(yearValue)}</td>
          <td style={{ padding: '4px 6px', border: CELL_BORDER, textAlign: 'right' }}>{formatPct(yearPctOnTotal)}</td>
          <td style={{ padding: '4px 6px', border: CELL_BORDER, textAlign: 'right' }}>{formatPct(yearPctToFailure)}</td>
          <td style={{ padding: '4px 6px', border: CELL_BORDER, textAlign: 'right' }} />
          <td style={{ padding: '4px 6px', border: CELL_BORDER, textAlign: 'right' }}>{formatInt(monthValue)}</td>
          <td style={{ padding: '4px 6px', border: CELL_BORDER, textAlign: 'right' }}>{formatPct(monthPctOnTotal)}</td>
          <td style={{ padding: '4px 6px', border: CELL_BORDER, textAlign: 'right' }}>{formatPct(monthPctToFailure)}</td>
          <td style={{ padding: '4px 6px', border: CELL_BORDER, textAlign: 'right' }} />
        </tr>
      );
    });
  };

  const renderSingleScopeRows = (channelLabel: string, counts: ScopeCounts, isTotalAcquiring: boolean) => {
    const failureTotal = counts.business + counts.user + counts.technical;
    return DETAILS.map((detail, idx) => {
      const value = getByKey(counts, detail.key);
      const pctTotal = pctOnTotal(value, counts.grand);

      let pctFailure: number | null = null;
      if (!isTotalAcquiring) {
        if (detail.key === 'grand') {
          pctFailure = 1;
        } else if (detail.key !== 'approved') {
          pctFailure = pctOnTotal(value, failureTotal);
        }
      }

      return (
        <tr key={`${channelLabel}-${detail.key}`}>
          <td style={{ padding: '4px 6px', border: CELL_BORDER, fontWeight: idx === 0 ? 600 : 400, whiteSpace: 'normal', wordBreak: 'break-word' }}>
            {idx === 0 ? channelLabel : ''}
          </td>
          <td style={{ padding: '4px 6px', border: CELL_BORDER, whiteSpace: 'normal', wordBreak: 'break-word' }}>{detail.label}</td>
          <td style={{ padding: '4px 6px', border: CELL_BORDER, textAlign: 'right' }}>{formatInt(value)}</td>
          <td style={{ padding: '4px 6px', border: CELL_BORDER, textAlign: 'right' }}>{formatPct(pctTotal)}</td>
          <td style={{ padding: '4px 6px', border: CELL_BORDER, textAlign: 'right' }}>{formatPct(pctFailure)}</td>
          <td style={{ padding: '4px 6px', border: CELL_BORDER, textAlign: 'right' }} />
        </tr>
      );
    });
  };

  return (
    <section style={{ marginBottom: 24, maxWidth: 1040 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Overview (Acquiring Business)</h3>
      <div style={{ overflowX: 'auto', border: CELL_BORDER, borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 840, fontSize: 11, lineHeight: 1.25 }}>
          <colgroup>
            <col style={{ width: '78px' }} />
            <col style={{ width: '170px' }} />
            <col style={{ width: '76px' }} />
            <col style={{ width: '90px' }} />
            <col style={{ width: '112px' }} />
            <col style={{ width: '112px' }} />
            <col style={{ width: '76px' }} />
            <col style={{ width: '90px' }} />
            <col style={{ width: '112px' }} />
            <col style={{ width: '112px' }} />
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={2} style={{ position: 'sticky', top: 0, background: '#f3f4f6', textAlign: 'left', padding: '4px 6px', border: CELL_BORDER }}>Channel</th>
              <th rowSpan={2} style={{ position: 'sticky', top: 0, background: '#f3f4f6', textAlign: 'left', padding: '4px 6px', border: CELL_BORDER }}>Details</th>
              <th colSpan={4} style={{ position: 'sticky', top: 0, background: '#f3f4f6', textAlign: 'center', padding: '4px 6px', border: CELL_BORDER }}>{model.yearLabel}</th>
              <th colSpan={4} style={{ position: 'sticky', top: 0, background: '#f3f4f6', textAlign: 'center', padding: '4px 6px', border: CELL_BORDER }}>{model.monthLabel}</th>
            </tr>
            <tr>
              <th style={{ position: 'sticky', top: 24, background: '#f3f4f6', textAlign: 'right', padding: '4px 6px', border: CELL_BORDER }}>Total</th>
              <th style={{ position: 'sticky', top: 24, background: '#f3f4f6', textAlign: 'right', padding: '4px 6px', border: CELL_BORDER }}>% on total</th>
              <th style={{ position: 'sticky', top: 24, background: '#f3f4f6', textAlign: 'right', padding: '4px 6px', border: CELL_BORDER }}>% to Total Failure</th>
              <th style={{ position: 'sticky', top: 24, background: '#f3f4f6', textAlign: 'right', padding: '4px 6px', border: CELL_BORDER }}>Rank (Total Failure)</th>
              <th style={{ position: 'sticky', top: 24, background: '#f3f4f6', textAlign: 'right', padding: '4px 6px', border: CELL_BORDER }}>Total</th>
              <th style={{ position: 'sticky', top: 24, background: '#f3f4f6', textAlign: 'right', padding: '4px 6px', border: CELL_BORDER }}>% on total</th>
              <th style={{ position: 'sticky', top: 24, background: '#f3f4f6', textAlign: 'right', padding: '4px 6px', border: CELL_BORDER }}>% to Total Failure</th>
              <th style={{ position: 'sticky', top: 24, background: '#f3f4f6', textAlign: 'right', padding: '4px 6px', border: CELL_BORDER }}>Rank (Total Failure)</th>
            </tr>
          </thead>
          <tbody>
            {CHANNELS.map((channel) => (
              <React.Fragment key={channel}>
                {renderDualScopeRows(channel, model.yearByChannel[channel], model.monthByChannel[channel], false)}
              </React.Fragment>
            ))}
            {renderDualScopeRows('Total Acquiring', model.yearTotalAcquiring, model.monthTotalAcquiring, true)}
          </tbody>
        </table>
      </div>

      {model.hasMultipleMonths && (
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={() => setShowMonthlyBreakdown((prev) => !prev)}
            style={{
              border: CELL_BORDER,
              background: '#f3f4f6',
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            {showMonthlyBreakdown ? 'Hide Month-by-Month Overview' : 'Show Month-by-Month Overview'}
          </button>

          {showMonthlyBreakdown && (
            <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
              {model.monthBreakdown.map((month) => (
                <div key={month.monthIndex} style={{ overflowX: 'auto', border: CELL_BORDER, borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 640, fontSize: 11, lineHeight: 1.25 }}>
                    <colgroup>
                      <col style={{ width: '78px' }} />
                      <col style={{ width: '180px' }} />
                      <col style={{ width: '84px' }} />
                      <col style={{ width: '94px' }} />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '120px' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th rowSpan={2} style={{ background: '#f3f4f6', textAlign: 'left', padding: '4px 6px', border: CELL_BORDER }}>Channel</th>
                        <th rowSpan={2} style={{ background: '#f3f4f6', textAlign: 'left', padding: '4px 6px', border: CELL_BORDER }}>Details</th>
                        <th colSpan={4} style={{ background: '#f3f4f6', textAlign: 'center', padding: '4px 6px', border: CELL_BORDER }}>{month.label}</th>
                      </tr>
                      <tr>
                        <th style={{ background: '#f3f4f6', textAlign: 'right', padding: '4px 6px', border: CELL_BORDER }}>Total</th>
                        <th style={{ background: '#f3f4f6', textAlign: 'right', padding: '4px 6px', border: CELL_BORDER }}>% on total</th>
                        <th style={{ background: '#f3f4f6', textAlign: 'right', padding: '4px 6px', border: CELL_BORDER }}>% to Total Failure</th>
                        <th style={{ background: '#f3f4f6', textAlign: 'right', padding: '4px 6px', border: CELL_BORDER }}>Rank (Total Failure)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CHANNELS.map((channel) => (
                        <React.Fragment key={`${month.monthIndex}-${channel}`}>
                          {renderSingleScopeRows(channel, month.byChannel[channel], false)}
                        </React.Fragment>
                      ))}
                      {renderSingleScopeRows('Total Acquiring', month.totalAcquiring, true)}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default OverviewAcquiringTable;