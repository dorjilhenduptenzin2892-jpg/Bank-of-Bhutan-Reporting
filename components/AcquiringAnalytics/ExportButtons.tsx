// Helper for bar chart width
const getBarWidth = (count: number, max: number) => {
  // Max bar width in PDF points (A4 width minus margins)
  const maxWidth = 180;
  return Math.max(8, (count / max) * maxWidth);
};
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import type { AnalyticsResult, BrandChannelMetrics, ExcludedRowDebug } from '../../types/analytics';
import { getTopFailureReasons } from '../../utils/analyticsProcessor';

interface ExportButtonsProps {
  data: AnalyticsResult | null;
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    fontFamily: 'Helvetica',
    backgroundColor: '#f8fafc',
    color: '#1e293b',
  },
  section: {
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
  },
  header: {
    fontSize: 20,
    marginBottom: 8,
    fontWeight: 900,
    color: '#0f172a',
    letterSpacing: 1,
  },
  subHeader: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: 700,
    color: '#2563eb',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingVertical: 2,
  },
  label: {
    color: '#334155',
    fontWeight: 500,
  },
  value: {
    fontWeight: 700,
    color: '#0f172a',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  summaryText: {
    fontSize: 11,
    color: '#475569',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e0e7ef',
    paddingVertical: 3,
    marginBottom: 2,
  },
  tableHeaderCell: {
    flex: 1,
    fontWeight: 700,
    color: '#1e293b',
    fontSize: 11,
  },
  tableCell: {
    flex: 1,
    fontSize: 11,
    color: '#334155',
    paddingVertical: 1,
  },
});

const formatNumber = (value: number, decimals = 0) =>
  value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const AnalyticsPdf: React.FC<{ data: AnalyticsResult }> = ({ data }) => {
  const topReasons = getTopFailureReasons(data, { channel: 'ALL', brand: 'ALL', category: 'ALL' });
  const today = new Date();
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.header}>Acquiring Transaction Analytics Summary</Text>
          <Text style={styles.summaryText}>Bank of Bhutan · Generated {today.toLocaleDateString()} at {today.toLocaleTimeString()}</Text>
          <View style={styles.divider} />
          <Text style={styles.summaryText}>
            This executive summary provides a comprehensive overview of acquiring transaction performance, including success rates, failure analysis, and key drivers. All figures are based on the latest uploaded data.
          </Text>
          <Text style={[styles.summaryText, { marginTop: 4 }]}>Filters Used: Channel = ALL, Brand = ALL, Category = ALL</Text>
        </View>
        {/* Closing note for professionalism */}
        <View style={{ marginTop: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', borderTopStyle: 'solid' }}>
          <Text style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>
            This report was generated automatically by the Bank of Bhutan Acquiring Analytics Platform. For questions or further analysis, please contact the analytics team.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subHeader}>Overall Summary</Text>
          <View style={styles.row}><Text style={styles.label}>Total Transactions</Text><Text style={styles.value}>{formatNumber(data.overall.totalCount)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Success Count</Text><Text style={styles.value}>{formatNumber(data.overall.successCount)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Failure Count</Text><Text style={styles.value}>{formatNumber(data.overall.failureCount)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Success Rate</Text><Text style={styles.value}>{formatNumber(data.overall.successRate, 2)}%</Text></View>
          <View style={styles.row}><Text style={styles.label}>BTN Volume</Text><Text style={styles.value}>{formatNumber(data.overall.volumes.BTN, 2)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>USD Volume</Text><Text style={styles.value}>{formatNumber(data.overall.volumes.USD, 2)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>INR Volume</Text><Text style={styles.value}>{formatNumber(data.overall.volumes.INR, 2)}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.subHeader}>Terminal Breakdown</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>Channel</Text>
            <Text style={styles.tableHeaderCell}>Total</Text>
            <Text style={styles.tableHeaderCell}>Success</Text>
            <Text style={styles.tableHeaderCell}>Failure</Text>
            <Text style={styles.tableHeaderCell}>Success Rate</Text>
          </View>
          {data.terminal.map((terminal) => (
            <View key={terminal.channel} style={styles.row}>
              <Text style={styles.tableCell}>{terminal.channel}</Text>
              <Text style={styles.tableCell}>{formatNumber(terminal.totalCount)}</Text>
              <Text style={styles.tableCell}>{formatNumber(terminal.successCount)}</Text>
              <Text style={styles.tableCell}>{formatNumber(terminal.failureCount)}</Text>
              <Text style={styles.tableCell}>{formatNumber(terminal.successRate, 2)}%</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.subHeader}>Brand Breakdown</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>Brand</Text>
            <Text style={styles.tableHeaderCell}>Total</Text>
            <Text style={styles.tableHeaderCell}>Success Rate</Text>
          </View>
          {data.brands.map((brand) => (
            <View key={brand.brand} style={styles.row}>
              <Text style={styles.tableCell}>{brand.brand}</Text>
              <Text style={styles.tableCell}>{formatNumber(brand.totalCount)}</Text>
              <Text style={styles.tableCell}>{formatNumber(brand.successRate, 2)}%</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.subHeader}>Failure Category Breakdown</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>Category</Text>
            <Text style={styles.tableHeaderCell}>Count</Text>
            <Text style={styles.tableHeaderCell}>Share %</Text>
          </View>
          {data.failureCategories.overall.map((category) => (
            <View key={category.category} style={styles.row}>
              <Text style={styles.tableCell}>{category.category}</Text>
              <Text style={styles.tableCell}>{formatNumber(category.count)}</Text>
              <Text style={styles.tableCell}>{formatNumber(category.share, 2)}%</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.subHeader}>Top 10 Failure Reasons</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>Reason</Text>
            <Text style={styles.tableHeaderCell}>Count</Text>
            <Text style={styles.tableHeaderCell}>Share %</Text>
          </View>
          {topReasons.map((reason) => (
            <View key={reason.reason} style={styles.row}>
              <Text style={styles.tableCell}>{reason.reason}</Text>
              <Text style={styles.tableCell}>{formatNumber(reason.count)}</Text>
              <Text style={styles.tableCell}>{formatNumber(reason.share, 2)}%</Text>
            </View>
          ))}

          {/* Simple horizontal bar chart for Top 10 Failure Reasons */}
          {topReasons.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#0f172a' }}>Visual: Failure Reasons Distribution</Text>
              {(() => {
                const maxCount = Math.max(...topReasons.map(r => r.count));
                return topReasons.map((reason, idx) => (
                  <View key={reason.reason} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <View style={{ width: 80 }}>
                      <Text style={{ fontSize: 9, color: '#334155' }}>{reason.reason.length > 14 ? reason.reason.slice(0, 13) + '…' : reason.reason}</Text>
                    </View>
                    <View style={{ height: 12, width: getBarWidth(reason.count, maxCount), backgroundColor: '#2563eb', borderRadius: 4, marginRight: 8 }} />
                    <Text style={{ fontSize: 9, color: '#475569', width: 28 }}>{formatNumber(reason.count)}</Text>
                  </View>
                ));
              })()}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
};

const ExportButtons: React.FC<ExportButtonsProps> = ({ data }) => {
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const handleExcelExport = () => {
    if (!data) return;
    setExporting('excel');

    const overallSheet = XLSX.utils.json_to_sheet([
      {
        Metric: 'Total Transactions',
        Value: data.overall.totalCount
      },
      {
        Metric: 'Success Count',
        Value: data.overall.successCount
      },
      {
        Metric: 'Failure Count',
        Value: data.overall.failureCount
      },
      {
        Metric: 'Success Rate %',
        Value: data.overall.successRate
      },
      {
        Metric: 'BTN Volume',
        Value: data.overall.volumes.BTN
      },
      {
        Metric: 'USD Volume',
        Value: data.overall.volumes.USD
      },
      {
        Metric: 'INR Volume',
        Value: data.overall.volumes.INR
      }
    ]);

    const terminalSheet = XLSX.utils.json_to_sheet(
      data.terminal.map((terminal) => ({
        Channel: terminal.channel,
        Total: terminal.totalCount,
        Success: terminal.successCount,
        Failure: terminal.failureCount,
        'Success Rate %': terminal.successRate,
        'Failure Rate %': terminal.failureRate,
        'BTN Volume': terminal.volumes.BTN,
        'USD Volume': terminal.volumes.USD,
        'INR Volume': terminal.volumes.INR,
        'Avg BTN': terminal.averageTicket.BTN,
        'Avg USD': terminal.averageTicket.USD,
        'Avg INR': terminal.averageTicket.INR
      }))
    );

    const brandSheet = XLSX.utils.json_to_sheet(
      data.brands.flatMap((brand) =>
        (Object.values(brand.byChannel) as BrandChannelMetrics[]).map((channel) => ({
          Brand: brand.brand,
          Channel: channel.channel,
          Total: channel.totalCount,
          Success: channel.successCount,
          Failure: channel.failureCount,
          'Success Rate %': channel.successRate,
          'BTN Volume': brand.volumes.BTN,
          'USD Volume': brand.volumes.USD,
          'INR Volume': brand.volumes.INR
        }))
      )
    );

    const failureCategorySheet = XLSX.utils.json_to_sheet(
      data.failureCategories.overall.map((category) => ({
        Category: category.category,
        Count: category.count,
        'Share %': category.share
      }))
    );

    const topReasons = getTopFailureReasons(data, { channel: 'ALL', brand: 'ALL', category: 'ALL' });
    const failureReasonSheet = XLSX.utils.json_to_sheet(
      topReasons.map((reason) => ({
        Reason: reason.reason,
        Count: reason.count,
        'Share %': reason.share
      }))
    );

    // Debug sheet for excluded rows
    let debugSheet;
    if (data.excludedRows && data.excludedRows.length > 0) {
      debugSheet = XLSX.utils.json_to_sheet(
        data.excludedRows.map((item) => ({
          Row: item.rowIndex,
          Reason: item.reason,
          ...item.row
        }))
      );
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, overallSheet, 'Overall Summary');
    XLSX.utils.book_append_sheet(workbook, terminalSheet, 'Terminal Breakdown');
    XLSX.utils.book_append_sheet(workbook, brandSheet, 'Brand Breakdown');
    XLSX.utils.book_append_sheet(workbook, failureCategorySheet, 'Failure Categories');
    XLSX.utils.book_append_sheet(workbook, failureReasonSheet, 'Top Failure Reasons');
    if (debugSheet) {
      XLSX.utils.book_append_sheet(workbook, debugSheet, 'Excluded Rows Debug');
    }

    const fileName = `Acquiring_Analytics_Summary_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    setExporting(null);
  };

  const handlePdfExport = async () => {
    if (!data) return;
    setExporting('pdf');
    const blob = await pdf(<AnalyticsPdf data={data} />).toBlob();
    saveAs(blob, `Acquiring_Analytics_Summary_${new Date().toISOString().slice(0, 10)}.pdf`);
    setExporting(null);
  };

  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-lg transition-all mt-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
        <div>
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-widest mb-1">Export Summary</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Download Executive Files</h3>
          <p className="text-base text-slate-600 mb-2">
            Export the summary to <span className="font-mono">Excel</span> or <span className="font-mono">PDF</span> for distribution.<br />
            <span className="text-emerald-700 font-semibold">Excel export now includes a debug sheet</span> listing excluded rows and reasons.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 items-start md:items-center">
          <button
            type="button"
            onClick={handleExcelExport}
            disabled={!data || exporting !== null}
            className="bg-gradient-to-r from-emerald-600 to-emerald-400 hover:from-emerald-700 hover:to-emerald-500 text-white px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 transition-all duration-150 disabled:opacity-60"
          >
            {exporting === 'excel' ? (
              <span className="flex items-center gap-2"><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Exporting...</span>
            ) : (
              <span className="flex items-center gap-2"><svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> Export Excel</span>
            )}
          </button>
          <button
            type="button"
            onClick={handlePdfExport}
            disabled={!data || exporting !== null}
            className="bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-950 hover:to-slate-800 text-white px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-all duration-150 disabled:opacity-60"
          >
            {exporting === 'pdf' ? (
              <span className="flex items-center gap-2"><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Exporting...</span>
            ) : (
              <span className="flex items-center gap-2"><svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7v4a2 2 0 01-2 2H7a2 2 0 01-2-2V7m4 4v6m4-6v6" /></svg> Export PDF</span>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};

export default ExportButtons;
