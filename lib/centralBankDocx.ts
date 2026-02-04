import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType } from 'docx';
import type { ReportData } from '../types';
import type { KPIIntelligenceReport } from '../services/kpiIntelligence';

const DEFAULT_FONT = 'Calibri';
const DEFAULT_SIZE = 22; // 11pt
const HEADING_SIZE = 24;
const TITLE_SIZE = 32;

function buildHeaderCell(text: string) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })]
  });
}

function buildCell(text: string) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })]
  });
}

function buildCentralBankDocument(data: ReportData, kpiReport?: KPIIntelligenceReport): Document {
  const businessFailures = (data.businessFailures || [])
    .filter(f => (f.volume ?? 0) > 0)
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
    .slice(0, 10);
  const technicalFailures = (data.technicalFailures || [])
    .filter(f => (f.volume ?? 0) > 0)
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));

  const children: Array<Paragraph | Table> = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${data.reportType} ACQUIRING SERVICE – ANALYSIS`,
          bold: true,
          size: TITLE_SIZE,
          font: DEFAULT_FONT
        })
      ]
    }),
    new Paragraph({ text: '', spacing: { after: 200 } }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({
          text: `${data.reportType} Analysis (Monthly / Weekly)`,
          bold: true,
          size: HEADING_SIZE + 4,
          font: DEFAULT_FONT
        })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${data.reportType} Success and Failure Rate (${data.year})`,
          size: HEADING_SIZE,
          font: DEFAULT_FONT
        })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: data.dateRange,
          size: HEADING_SIZE,
          font: DEFAULT_FONT
        })
      ]
    }),
    new Paragraph({ text: '', spacing: { after: 300 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            buildHeaderCell('Success Rate'),
            buildHeaderCell('Failure Rate')
          ]
        }),
        new TableRow({
          children: [
            buildCell(`${data.successRate.toFixed(2)}%`),
            buildCell(`${data.failureRate.toFixed(2)}%`)
          ]
        })
      ]
    }),
    new Paragraph({ text: '', spacing: { after: 400 } }),
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: [new TextRun({ text: `Top 10 ${data.reportType} Business Failure`, bold: true, size: HEADING_SIZE + 2, font: DEFAULT_FONT })]
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            buildHeaderCell('Description'),
            buildHeaderCell('Volume'),
            buildHeaderCell('Typical Cause')
          ]
        }),
        ...businessFailures.map(f => new TableRow({
          children: [
            buildCell(f.description),
            buildCell(f.volume.toString()),
            buildCell(f.typicalCause)
          ]
        }))
      ]
    }),
    new Paragraph({ text: '', spacing: { after: 400 } })
  ];

  if (technicalFailures.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: `Top ${data.reportType} Technical Decline`, bold: true, size: HEADING_SIZE + 2, font: DEFAULT_FONT })]
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              buildHeaderCell('Response Description'),
              buildHeaderCell('Count'),
              buildHeaderCell('Typical Cause')
            ]
          }),
          ...technicalFailures.map(f => new TableRow({
            children: [
              buildCell(f.description),
              buildCell(f.volume.toString()),
              buildCell(f.typicalCause)
            ]
          }))
        ]
      }),
      new Paragraph({ text: '', spacing: { after: 400 } })
    );
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: 'KPI Intelligence & Analysis', bold: true, size: HEADING_SIZE + 4, font: DEFAULT_FONT })]
    }),
    new Paragraph({ text: '', spacing: { after: 200 } })
  );

  if (kpiReport) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: 'Response Description Reference', bold: true, size: HEADING_SIZE + 2, font: DEFAULT_FONT })]
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              buildHeaderCell('Entity'),
              buildHeaderCell('Response Descriptions')
            ]
          }),
          ...(kpiReport.professional_report?.responsibility_distribution_analysis?.entities || []).map(entity => new TableRow({
            children: [
              buildCell(entity.name),
              buildCell((entity.examples || []).map(ex => (ex as any).description || ex).join('; '))
            ]
          }))
        ]
      }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: 'Responsibility Distribution Analysis', bold: true, size: HEADING_SIZE + 2, font: DEFAULT_FONT })]
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              buildHeaderCell('Entity'),
              buildHeaderCell('Responsibility %'),
              buildHeaderCell('Description')
            ]
          }),
          ...(kpiReport.professional_report?.responsibility_distribution_analysis?.entities || []).map(entity => new TableRow({
            children: [
              buildCell(entity.name),
              buildCell(`${entity.percentage.toFixed(1)}%`),
              buildCell(entity.description)
            ]
          }))
        ]
      }),
      new Paragraph({ text: '', spacing: { after: 200 } })
    );

    const assessment = kpiReport.professional_report?.responsibility_distribution_analysis?.assessment;
    if (assessment) {
      children.push(new Paragraph({
        children: [new TextRun({ text: assessment, size: DEFAULT_SIZE, font: DEFAULT_FONT, italics: true })],
        spacing: { before: 120, after: 200 }
      }));
    }

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: 'Key Insights', bold: true, size: HEADING_SIZE + 2, font: DEFAULT_FONT })]
      })
    );

    (kpiReport.insights || []).slice(0, 4).forEach((insight) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `• ${insight.title}`, bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
          spacing: { before: 120 }
        }),
        new Paragraph({
          children: [new TextRun({ text: insight.description, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
          spacing: { before: 80, after: 120 }
        })
      );
    });

    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: 'Key Recommendations', bold: true, size: HEADING_SIZE + 2, font: DEFAULT_FONT })]
      })
    );

    (kpiReport.recommendations || []).forEach((rec) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${rec.priority.toUpperCase()} - ${rec.area}`, bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
          spacing: { before: 120 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Action: ${rec.action}`, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
          spacing: { before: 80 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Rationale: ${rec.rationale}`, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
          spacing: { before: 80, after: 120 }
        })
      );
    });

    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: 'Executive Summary', bold: true, size: HEADING_SIZE + 2, font: DEFAULT_FONT })]
      })
    );

    if (kpiReport.executive_summary) {
      const exec = kpiReport.executive_summary;
      children.push(
        new Paragraph({ children: [new TextRun({ text: 'Overall Assessment', bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })], spacing: { before: 120 } }),
        new Paragraph({ children: [new TextRun({ text: exec.overall_assessment, size: DEFAULT_SIZE, font: DEFAULT_FONT })], spacing: { before: 80, after: 120 } }),
        new Paragraph({ children: [new TextRun({ text: 'Performance Statement', bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })], spacing: { before: 120 } }),
        new Paragraph({ children: [new TextRun({ text: exec.performance_statement, size: DEFAULT_SIZE, font: DEFAULT_FONT })], spacing: { before: 80, after: 120 } }),
        new Paragraph({ children: [new TextRun({ text: 'Infrastructure Stability', bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })], spacing: { before: 120 } }),
        new Paragraph({ children: [new TextRun({ text: exec.infrastructure_stability, size: DEFAULT_SIZE, font: DEFAULT_FONT })], spacing: { before: 80, after: 120 } }),
        new Paragraph({ children: [new TextRun({ text: 'Key Findings', bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })], spacing: { before: 120 } }),
        new Paragraph({ children: [new TextRun({ text: exec.key_findings, size: DEFAULT_SIZE, font: DEFAULT_FONT })], spacing: { before: 80, after: 120 } }),
        new Paragraph({ children: [new TextRun({ text: 'Outlook', bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })], spacing: { before: 120 } }),
        new Paragraph({ children: [new TextRun({ text: exec.outlook, size: DEFAULT_SIZE, font: DEFAULT_FONT })], spacing: { before: 80, after: 200 } })
      );
    }
  } else {
    children.push(new Paragraph({ text: 'KPI Intelligence content not available.', spacing: { after: 200 } }));
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: DEFAULT_FONT,
            size: DEFAULT_SIZE
          }
        }
      }
    },
    sections: [
      {
        properties: {},
        children
      }
    ]
  });
}

export async function generateCentralBankDocxBuffer(data: ReportData, kpiReport?: KPIIntelligenceReport): Promise<Buffer> {
  const doc = buildCentralBankDocument(data, kpiReport);
  return Packer.toBuffer(doc);
}

export async function generateCentralBankDocxBlob(data: ReportData, kpiReport?: KPIIntelligenceReport): Promise<Blob> {
  const doc = buildCentralBankDocument(data, kpiReport);
  return Packer.toBlob(doc);
}
