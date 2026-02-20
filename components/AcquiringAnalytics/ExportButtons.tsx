import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import type { AnalyticsResult, BrandChannelMetrics } from '../../types/analytics';
import { getTopFailureReasons } from '../../utils/analyticsProcessor';

interface ExportButtonsProps {
  data: AnalyticsResult | null;
}

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: 'Helvetica' },
  section: { marginBottom: 16 },
  header: { fontSize: 14, marginBottom: 8, fontWeight: 700 },
  subHeader: { fontSize: 12, marginBottom: 6, fontWeight: 600 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  label: { color: '#475569' },
  value: { fontWeight: 600 }
});

const formatNumber = (value: number, decimals = 0) =>
  value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const AnalyticsPdf: React.FC<{ data: AnalyticsResult }> = ({ data }) => {
  const topReasons = getTopFailureReasons(data, { channel: 'ALL', brand: 'ALL', category: 'ALL' });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.header}>Acquiring Transaction Analytics Summary</Text>
          <Text>Bank of Bhutan · Generated Report</Text>
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
          {data.terminal.map((terminal) => (
            <View key={terminal.channel} style={{ marginBottom: 6 }}>
              <Text style={{ fontWeight: 600 }}>{terminal.channel}</Text>
              <View style={styles.row}><Text style={styles.label}>Total</Text><Text style={styles.value}>{formatNumber(terminal.totalCount)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Success</Text><Text style={styles.value}>{formatNumber(terminal.successCount)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Failure</Text><Text style={styles.value}>{formatNumber(terminal.failureCount)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Success Rate</Text><Text style={styles.value}>{formatNumber(terminal.successRate, 2)}%</Text></View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.subHeader}>Brand Breakdown</Text>
          {data.brands.map((brand) => (
            <View key={brand.brand} style={{ marginBottom: 6 }}>
              <Text style={{ fontWeight: 600 }}>{brand.brand}</Text>
              <View style={styles.row}><Text style={styles.label}>Total</Text><Text style={styles.value}>{formatNumber(brand.totalCount)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Success Rate</Text><Text style={styles.value}>{formatNumber(brand.successRate, 2)}%</Text></View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.subHeader}>Failure Category Breakdown</Text>
          {data.failureCategories.overall.map((category) => (
            <View key={category.category} style={styles.row}>
              <Text style={styles.label}>{category.category}</Text>
              <Text style={styles.value}>{formatNumber(category.count)} ({formatNumber(category.share, 2)}%)</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.subHeader}>Top 10 Failure Reasons</Text>
          {topReasons.map((reason) => (
            <View key={reason.reason} style={styles.row}>
              <Text style={styles.label}>{reason.reason}</Text>
              <Text style={styles.value}>{formatNumber(reason.count)} ({formatNumber(reason.share, 2)}%)</Text>
            </View>
          ))}
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

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, overallSheet, 'Overall Summary');
    XLSX.utils.book_append_sheet(workbook, terminalSheet, 'Terminal Breakdown');
    XLSX.utils.book_append_sheet(workbook, brandSheet, 'Brand Breakdown');
    XLSX.utils.book_append_sheet(workbook, failureCategorySheet, 'Failure Categories');
    XLSX.utils.book_append_sheet(workbook, failureReasonSheet, 'Top Failure Reasons');

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
    <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Export Summary</p>
          <h3 className="text-lg font-bold text-slate-900">Download Executive Files</h3>
          <p className="text-sm text-slate-500 mt-2">Export the summary to Excel or PDF for distribution.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExcelExport}
            disabled={!data || exporting !== null}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm disabled:opacity-60"
          >
            {exporting === 'excel' ? 'Exporting...' : 'Export Excel'}
          </button>
          <button
            type="button"
            onClick={handlePdfExport}
            disabled={!data || exporting !== null}
            className="bg-slate-900 hover:bg-slate-950 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm disabled:opacity-60"
          >
            {exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default ExportButtons;
