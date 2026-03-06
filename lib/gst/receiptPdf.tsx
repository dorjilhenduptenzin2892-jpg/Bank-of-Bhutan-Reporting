import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import type { GstTransactionRow } from './pdfParser';

export interface DailySummaryRow {
  dateLabel: string;
  txnCount: number;
  gross: number;
  mdr: number;
  gst: number;
  net: number;
}

export interface ReceiptInput {
  merchantId: string;
  merchantName: string;
  channelType: 'POS' | 'IPG';
  bilCurrCode: string;
  bilCurrLabel: string;
  gstPct: number;
  mdrPct: number;
  gross: number;
  mdrAmount: number;
  gstAmount: number;
  totalDeduction: number;
  netPayable: number;
  periodLabel: string;
  generatedAt: Date;
  dailyRows: DailySummaryRow[];
  transactions: GstTransactionRow[];
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 120,
    paddingBottom: 72,
    paddingHorizontal: 34,
    fontSize: 10,
    lineHeight: 1.35,
    color: '#111827',
    position: 'relative',
  },
  header: {
    position: 'absolute',
    top: 12,
    left: 34,
    right: 34,
    alignItems: 'flex-start',
  },
  headerImage: { width: 450, height: 75.6 },
  headerDept: { marginTop: 4, marginLeft: 4, fontSize: 10, fontWeight: 700, color: '#111827' },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 10, marginBottom: 12 },
  sectionTitle: { marginTop: 8, marginBottom: 6, fontSize: 11, fontWeight: 700 },
  infoBlock: { marginBottom: 12 },
  infoRow: { flexDirection: 'row', marginBottom: 2 },
  infoLabel: { width: 140, fontWeight: 600 },
  infoValue: { fontWeight: 400 },
  summaryTable: { marginBottom: 10 },
  summaryHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#d1d5db', fontWeight: 700 },
  summaryRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingVertical: 4 },
  summaryCell: { flex: 1, fontSize: 10 },
  summaryCellBold: { flex: 1, fontSize: 10, fontWeight: 700 },
  small: { fontSize: 9, color: '#374151' },
  declaration: { marginTop: 12, marginBottom: 18, fontSize: 10 },
  signBlock: { marginTop: 32, marginBottom: 10, textAlign: 'left' },
  signLabel: { fontWeight: 600, marginBottom: 2 },
  signOrg: { fontSize: 10 },
  tableHeader: { flexDirection: 'row', borderWidth: 1, borderColor: '#374151', backgroundColor: '#f3f4f6' },
  tableRow: { flexDirection: 'row', borderWidth: 1, borderTopWidth: 0, borderColor: '#374151' },
  cell: { paddingVertical: 4, paddingHorizontal: 5, fontSize: 9, borderRightWidth: 1, borderColor: '#374151' },
  cellLast: { borderRightWidth: 0 },
  totalRow: { flexDirection: 'row', borderWidth: 1, borderTopWidth: 0, borderColor: '#374151', backgroundColor: '#f9fafb' },
  totalLabel: { fontSize: 9, fontWeight: 700 },
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 34,
    right: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerImage: { width: 337.2, height: 23.4 },
  footerPage: { fontSize: 9, color: '#374151' },
  contentTop: { marginTop: 8 },
});

const money = (code: string, amount: number) => `${code} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatYmd = (date?: Date | null, fallback?: string) => {
  if (!date || Number.isNaN(date.getTime())) return fallback || '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const formatMonthLabel = (date: Date) => date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
const GST_NUMBER = 'C10035414';

const HEADER_IMAGE_SRC = '/gst/receipt-header.png';
const FOOTER_IMAGE_SRC = '/gst/receipt-footer.png';

// Header for all pages
const drawHeader = (input: ReceiptInput, pageNum: number) => (
  <View style={styles.header} fixed>
    <Image style={styles.headerImage} src={HEADER_IMAGE_SRC} />
    <Text style={styles.headerDept}>Digital Banking Services Department</Text>
  </View>
);

// Footer for all pages
const drawFooter = (input: ReceiptInput) => (
  <View style={styles.footer} fixed>
    <Image style={styles.footerImage} src={FOOTER_IMAGE_SRC} />
    <Text
      style={styles.footerPage}
      render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
    />
  </View>
);
const ReceiptDocument: React.FC<{ input: ReceiptInput }> = ({ input }) => {
  const groups = (() => {
    const map = new Map<string, GstTransactionRow[]>();
    for (const row of input.transactions || []) {
      if (!row.reqDate || Number.isNaN(row.reqDate.getTime())) continue;
      const key = `${row.reqDate.getFullYear()}-${String(row.reqDate.getMonth() + 1).padStart(2, '0')}`;
      const arr = map.get(key) || [];
      arr.push(row);
      map.set(key, arr);
    }
    if (!map.size) map.set('ALL', input.transactions || []);
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  })();
  // Table style for certificate summary and merchant info
  const certTable = {
    borderWidth: 1,
    borderColor: '#374151',
    borderStyle: 'solid',
    marginBottom: 12,
  };
  const certRow = {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#374151',
    borderStyle: 'solid',
    alignItems: 'center',
  };
  const certCell = {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 10,
    borderRightWidth: 1,
    borderColor: '#374151',
    borderStyle: 'solid',
  };
  const certCellLast = {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 10,
  };

  return (
    <Document>
      {groups.map(([key, txns]) => {
        const validTxns = txns.filter((t) => t && Number.isFinite(t.apprAmt));
        const totalAppr = validTxns.reduce((sum, row) => sum + (row.apprAmt || 0), 0);
        const totalMdr = totalAppr * (input.mdrPct / 100);
        const totalGst = totalMdr * (input.gstPct / 100);
        const totalNet = totalAppr - (totalMdr + totalGst);
        const settlementMonth =
          key === 'ALL'
            ? input.generatedAt.toLocaleString('en-US', { month: 'long', year: 'numeric' })
            : formatMonthLabel(new Date(`${key}-01T00:00:00`));

        return (
          <React.Fragment key={key}>
            {/* Certificate */}
            <Page size="A4" style={styles.page}>
              {drawHeader(input, 1)}
              <View style={styles.contentTop}>
                <Text style={{ ...styles.title, textAlign: 'left', marginBottom: 10 }}>Merchant Monthly GST Deduction Certificate</Text>

                <View style={certTable}>
                  <View style={certRow}>
                    <Text style={certCell}>Settlement Month</Text>
                    <Text style={certCellLast}>{settlementMonth}</Text>
                  </View>
                  <View style={certRow}>
                    <Text style={certCell}>Merchant Name</Text>
                    <Text style={certCellLast}>{input.merchantName || 'N/A'}</Text>
                  </View>
                  <View style={certRow}>
                    <Text style={certCell}>Merchant ID (MID)</Text>
                    <Text style={certCellLast}>{input.merchantId}</Text>
                  </View>
                  <View style={certRow}>
                    <Text style={certCell}>GST Number</Text>
                    <Text style={certCellLast}>{GST_NUMBER}</Text>
                  </View>
                  <View style={certRow}>
                    <Text style={certCell}>Terminal Types</Text>
                    <Text style={certCellLast}>{input.channelType}</Text>
                  </View>
                  <View style={[certRow, { backgroundColor: '#f3f4f6' }]}> 
                    <Text style={{ ...certCell, fontWeight: 700 }}>Particulars</Text>
                    <Text style={{ ...certCellLast, fontWeight: 700 }}>Amount ({input.bilCurrLabel})</Text>
                  </View>
                  <View style={certRow}>
                    <Text style={certCell}>Total Transaction</Text>
                    <Text style={certCellLast}>{money(input.bilCurrLabel, totalAppr)}</Text>
                  </View>
                  <View style={certRow}>
                    <Text style={certCell}>Total Bank Commission (MDR {input.mdrPct.toFixed(2)}%)</Text>
                    <Text style={certCellLast}>{money(input.bilCurrLabel, totalMdr)}</Text>
                  </View>
                  <View style={certRow}>
                    <Text style={certCell}>Total GST on Commission ({input.gstPct.toFixed(2)}%)</Text>
                    <Text style={certCellLast}>{money(input.bilCurrLabel, totalGst)}</Text>
                  </View>
                  <View style={certRow}>
                    <Text style={certCell}>Total Deduction</Text>
                    <Text style={certCellLast}>{money(input.bilCurrLabel, totalMdr + totalGst)}</Text>
                  </View>
                  <View style={certRow}>
                    <Text style={{ ...certCell, fontWeight: 700 }}>Net Amount Paid to Merchant</Text>
                    <Text style={{ ...certCellLast, fontWeight: 700 }}>{money(input.bilCurrLabel, totalNet)}</Text>
                  </View>
                </View>

                <View style={styles.declaration}>
                  <Text style={styles.sectionTitle}>Declaration</Text>
                  <Text>
                    This is to certify that GST amounting to <Text style={{ fontWeight: 700 }}>{input.bilCurrLabel} {totalGst.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} </Text>
                    has been deducted for the above settlement month.
                  </Text>
                  <Text>
                    The GST collected is remitted to the relevant authority.
                    This certificate may be used by the merchant as proof of GST deduction.
                  </Text>
                </View>

                <View style={styles.signBlock}>
                  <Text style={styles.signLabel}>Authorized Signatory</Text>
                  <Text style={styles.signOrg}>For Bank of Bhutan Ltd</Text>
                </View>
              </View>
              {drawFooter(input)}
            </Page>

            {/* Annexure */}
            <Page size="A4" style={styles.page}>
              {drawHeader(input, 2)}
              <View style={styles.contentTop}>
                <Text style={styles.title}>Annexure A - Transaction Details</Text>
                <Text style={styles.subtitle}>Billing Currency: {input.bilCurrLabel} (code {input.bilCurrCode})</Text>

                <View style={styles.tableHeader}>
                  <Text style={[styles.cell, { width: '12%' }]}>Req Date</Text>
                  <Text style={[styles.cell, { width: '14%' }]}>RRN</Text>
                  <Text style={[styles.cell, { width: '10%' }]}>Appr Code</Text>
                  <Text style={[styles.cell, { width: '18%' }]}>Card No</Text>
                  <Text style={[styles.cell, { width: '14%', textAlign: 'right' }]}>Appr Amt</Text>
                  <Text style={[styles.cell, { width: '10%', textAlign: 'right' }]}>MDR</Text>
                  <Text style={[styles.cell, { width: '10%', textAlign: 'right' }]}>GST</Text>
                  <Text style={[styles.cell, styles.cellLast, { width: '12%', textAlign: 'right' }]}>Net</Text>
                </View>

                {validTxns
                  .slice()
                  .sort((a, b) => (a.reqDate?.getTime() || 0) - (b.reqDate?.getTime() || 0))
                  .map((row, idx) => (
                    <View style={styles.tableRow} key={`${row.rrn}-${row.reqDateRaw}-${idx}`}>
                      <Text style={[styles.cell, { width: '12%' }]}>{formatYmd(row.reqDate, row.reqDateRaw)}</Text>
                      <Text style={[styles.cell, { width: '14%' }]}>{row.rrn || ''}</Text>
                      <Text style={[styles.cell, { width: '10%' }]}>{row.apprCode || ''}</Text>
                      <Text style={[styles.cell, { width: '18%' }]}>{row.cardNo || ''}</Text>
                      <Text style={[styles.cell, { width: '14%', textAlign: 'right' }]}>{fmt(row.apprAmt)}</Text>
                      <Text style={[styles.cell, { width: '10%', textAlign: 'right' }]}>{fmt(row.apprAmt * (input.mdrPct / 100))}</Text>
                      <Text style={[styles.cell, { width: '10%', textAlign: 'right' }]}>{fmt(row.apprAmt * (input.mdrPct / 100) * (input.gstPct / 100))}</Text>
                      <Text style={[styles.cell, styles.cellLast, { width: '12%', textAlign: 'right' }]}>
                        {fmt(row.apprAmt - (row.apprAmt * (input.mdrPct / 100) + row.apprAmt * (input.mdrPct / 100) * (input.gstPct / 100)))}
                      </Text>
                    </View>
                  ))}

                <View style={styles.totalRow}>
                  <Text style={[styles.cell, { width: '12%' }]} />
                  <Text style={[styles.cell, { width: '14%' }]} />
                  <Text style={[styles.cell, { width: '10%' }]} />
                  <Text style={[styles.cell, { width: '18%' }, styles.totalLabel]}>Total</Text>
                  <Text style={[styles.cell, { width: '14%', textAlign: 'right' }, styles.totalLabel]}>{fmt(totalAppr)}</Text>
                  <Text style={[styles.cell, { width: '10%', textAlign: 'right' }, styles.totalLabel]}>{fmt(totalMdr)}</Text>
                  <Text style={[styles.cell, { width: '10%', textAlign: 'right' }, styles.totalLabel]}>{fmt(totalGst)}</Text>
                  <Text style={[styles.cell, styles.cellLast, { width: '12%', textAlign: 'right' }, styles.totalLabel]}>{fmt(totalNet)}</Text>
                </View>
              </View>
              {drawFooter(input)}
            </Page>
          </React.Fragment>
        );
      })}
    </Document>
  );
};

export const generateGstReceiptPdfBlob = async (input: ReceiptInput): Promise<Blob> => {
  const instance = pdf(<ReceiptDocument input={input} />);
  return instance.toBlob();
};
