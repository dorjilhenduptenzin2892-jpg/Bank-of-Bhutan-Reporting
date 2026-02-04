import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import type { ReportType } from '../types';
import type { BucketKPI, DeclineRecord } from './kpi';
import type { ComparisonResult } from './comparison';
import type { ManagementNarrative } from './managementNarrative';

function buildHeaderCell(text: string) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })]
  });
}

function buildCell(text: string) {
  return new TableCell({ children: [new Paragraph(text)] });
}

function buildDeclineTable(title: string, declines: DeclineRecord[]) {
  return [
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: title, bold: true })] }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            buildHeaderCell('Code'),
            buildHeaderCell('Description'),
            buildHeaderCell('Count'),
            buildHeaderCell('Share %')
          ]
        }),
        ...declines.map((d) =>
          new TableRow({
            children: [
              buildCell(d.code || 'N/A'),
              buildCell(d.description || 'Unknown'),
              buildCell(d.count.toLocaleString()),
              buildCell(d.percent.toFixed(1))
            ]
          })
        )
      ]
    })
  ];
}

function buildManagementDocument(params: {
  channel: ReportType;
  period: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  dateRange: string;
  buckets: BucketKPI[];
  comparisons: ComparisonResult[];
  executiveSummary: string;
  narrative: ManagementNarrative;
}): Document {
  const { channel, period, dateRange, buckets, comparisons, executiveSummary, narrative } = params;

  const sections: Array<Paragraph | Table> = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: `${channel} ${period} Acquiring Report`, bold: true })]
    }),
    new Paragraph({ text: `Reporting Period: ${dateRange}` }),
    new Paragraph({ text: '' })
  ];

  sections.push(
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Executive Overview', bold: true })] }),
    new Paragraph({ text: narrative.executiveOverview }),
    new Paragraph({ text: '' }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Transaction Performance Analysis', bold: true })] }),
    new Paragraph({ text: narrative.transactionPerformance }),
    new Paragraph({ text: '' }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Decline Structure Analysis', bold: true })] }),
    new Paragraph({ text: narrative.declineCategoryDistribution }),
    new Paragraph({ text: narrative.dominantDrivers }),
    new Paragraph({ text: narrative.declineTrends }),
    new Paragraph({ text: '' }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Scheme-Level Behaviour Analysis', bold: true })] }),
    new Paragraph({ text: narrative.schemeAnalysis }),
    new Paragraph({ text: '' }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Channel-Specific Behavioural Insights', bold: true })] }),
    new Paragraph({ text: narrative.channelInsights }),
    new Paragraph({ text: '' }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Trend Intelligence Summary', bold: true })] }),
    ...narrative.trendIntelligence.map((item) => new Paragraph({ text: `• ${item}` })),
    new Paragraph({ text: '' }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Strategic Observations', bold: true })] }),
    new Paragraph({ text: narrative.strategicObservations }),
    new Paragraph({ text: '' }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Strategic Recommendations', bold: true })] }),
    new Paragraph({ text: 'Priority Focus Areas:' }),
    ...narrative.priorityFocusAreas.map((item) => new Paragraph({ text: `• ${item}` })),
    new Paragraph({ text: '' }),
    new Paragraph({ text: 'Continuous Improvement Areas:' }),
    ...narrative.continuousImprovementAreas.map((item) => new Paragraph({ text: `• ${item}` })),
    new Paragraph({ text: '' }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Formal Management Summary', bold: true })] }),
    new Paragraph({ text: narrative.formalSummary }),
    new Paragraph({ text: '' })
  );

  if (buckets.length > 0) {
    const latest = buckets[buckets.length - 1];
    sections.push(
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Authorization Outcomes', bold: true })] }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              buildHeaderCell('Success %'),
              buildHeaderCell('Business Decline %'),
              buildHeaderCell('User Decline %'),
              buildHeaderCell('Technical Decline %')
            ]
          }),
          new TableRow({
            children: [
              buildCell(latest.success_rate.toFixed(2)),
              buildCell(latest.business_rate.toFixed(2)),
              buildCell(latest.user_rate.toFixed(2)),
              buildCell(latest.technical_rate.toFixed(2))
            ]
          })
        ]
      }),
      new Paragraph({ text: '' })
    );
  }

  buckets.forEach((bucket) => {
    sections.push(
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: `Period: ${bucket.period}`, bold: true })] })
    );

    sections.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              buildHeaderCell('Total Transactions'),
              buildHeaderCell('Success %'),
              buildHeaderCell('Business Decline %'),
              buildHeaderCell('User Decline %'),
              buildHeaderCell('Technical Decline %')
            ]
          }),
          new TableRow({
            children: [
              buildCell(bucket.total.toLocaleString()),
              buildCell(bucket.success_rate.toFixed(2)),
              buildCell(bucket.business_rate.toFixed(2)),
              buildCell(bucket.user_rate.toFixed(2)),
              buildCell(bucket.technical_rate.toFixed(2))
            ]
          })
        ]
      })
    );

    sections.push(new Paragraph({ text: '' }));
    sections.push(...buildDeclineTable('Top 10 Business Declines', bucket.business_declines));
    sections.push(new Paragraph({ text: '' }));
    sections.push(...buildDeclineTable('Top 10 User Declines', bucket.user_declines));
    sections.push(new Paragraph({ text: '' }));
    sections.push(...buildDeclineTable('Top 10 Technical Declines', bucket.technical_declines));
    sections.push(new Paragraph({ text: '' }));
  });

  if (comparisons.length > 0) {
    sections.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Comparative Analysis', bold: true })] }));
    comparisons.forEach((cmp) => {
      cmp.insights.forEach((insight) => {
        sections.push(new Paragraph({ text: `• ${insight}` }));
      });
    });
    sections.push(new Paragraph({ text: '' }));
  }

  sections.push(
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Executive Summary', bold: true })] }),
    new Paragraph({ text: executiveSummary })
  );

  return new Document({
    sections: [
      {
        properties: {},
        children: sections
      }
    ]
  });
}

export async function generateManagementDocxBuffer(params: {
  channel: ReportType;
  period: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  dateRange: string;
  buckets: BucketKPI[];
  comparisons: ComparisonResult[];
  executiveSummary: string;
  narrative?: ManagementNarrative;
}): Promise<Buffer> {
  const narrative = params.narrative || {
    executiveOverview: params.executiveSummary,
    transactionPerformance: params.executiveSummary,
    declineCategoryDistribution: params.executiveSummary,
    dominantDrivers: params.executiveSummary,
    declineTrends: params.executiveSummary,
    schemeAnalysis: params.executiveSummary,
    channelInsights: params.executiveSummary,
    trendIntelligence: [],
    strategicObservations: params.executiveSummary,
    priorityFocusAreas: [],
    continuousImprovementAreas: [],
    formalSummary: params.executiveSummary
  };
  const doc = buildManagementDocument({ ...params, narrative });
  return Packer.toBuffer(doc);
}

export async function generateManagementDocxBlob(params: {
  channel: ReportType;
  period: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  dateRange: string;
  buckets: BucketKPI[];
  comparisons: ComparisonResult[];
  executiveSummary: string;
  narrative?: ManagementNarrative;
}): Promise<Blob> {
  const narrative = params.narrative || {
    executiveOverview: params.executiveSummary,
    transactionPerformance: params.executiveSummary,
    declineCategoryDistribution: params.executiveSummary,
    dominantDrivers: params.executiveSummary,
    declineTrends: params.executiveSummary,
    schemeAnalysis: params.executiveSummary,
    channelInsights: params.executiveSummary,
    trendIntelligence: [],
    strategicObservations: params.executiveSummary,
    priorityFocusAreas: [],
    continuousImprovementAreas: [],
    formalSummary: params.executiveSummary
  };
  const doc = buildManagementDocument({ ...params, narrative });
  return Packer.toBlob(doc);
}
