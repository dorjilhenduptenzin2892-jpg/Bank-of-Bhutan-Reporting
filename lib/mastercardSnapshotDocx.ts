import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import type { MastercardAnalytics } from '../services/mastercardAnalytics';

function buildHeaderCell(text: string) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })]
  });
}

function buildCell(text: string) {
  return new TableCell({ children: [new Paragraph(text)] });
}

export async function generateMastercardSnapshotDocxBlob(analytics: MastercardAnalytics): Promise<Blob> {
  const sections: Array<Paragraph | Table> = [];

  sections.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: 'Mastercard Acquiring Business Snapshot', bold: true })]
    }),
    new Paragraph({ text: `Reporting Range: ${analytics.rangeLabel}` }),
    new Paragraph({ text: '' })
  );

  sections.push(
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Executive Snapshot', bold: true })] })
  );

  sections.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            buildHeaderCell('Mastercard Volume'),
            buildHeaderCell('Mastercard Count'),
            buildHeaderCell('YTD Growth (Volume)'),
            buildHeaderCell('Revenue Share')
          ]
        }),
        new TableRow({
          children: [
            buildCell(analytics.mastercard.volume.toLocaleString()),
            buildCell(analytics.mastercard.count.toLocaleString()),
            buildCell(`${analytics.ytd.volumeGrowth.toFixed(1)}%`),
            buildCell(`${analytics.mastercard.shareRevenue.toFixed(1)}%`)
          ]
        })
      ]
    }),
    new Paragraph({ text: '' })
  );

  sections.push(
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Growth Trends', bold: true })] }),
    ...analytics.yoy.map((point) =>
      new Paragraph({
        text: `${point.year}: Volume ${point.volume.toLocaleString()} (${point.volumeGrowth.toFixed(1)}% YoY), Count ${point.count.toLocaleString()} (${point.countGrowth.toFixed(1)}% YoY)`
      })
    ),
    new Paragraph({ text: '' })
  );

  sections.push(
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Market Position & Revenue Contribution', bold: true })] })
  );

  sections.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            buildHeaderCell('Scheme'),
            buildHeaderCell('Volume Share'),
            buildHeaderCell('Count Share'),
            buildHeaderCell('Revenue Share')
          ]
        }),
        ...analytics.marketShare.byScheme.map((scheme) =>
          new TableRow({
            children: [
              buildCell(scheme.scheme),
              buildCell(`${scheme.shareVolume.toFixed(1)}%`),
              buildCell(`${scheme.shareCount.toFixed(1)}%`),
              buildCell(`${scheme.shareRevenue.toFixed(1)}%`)
            ]
          })
        )
      ]
    }),
    new Paragraph({ text: '' })
  );

  sections.push(
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Merchant Ecosystem', bold: true })] }),
    new Paragraph({ text: `Mastercard Acceptance Footprint: ${analytics.merchant.total.toLocaleString()} merchants` }),
    new Paragraph({ text: '' })
  );

  if (analytics.sectors.top.length > 0) {
    sections.push(
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: 'Sector Penetration (Top Sectors)', bold: true })] }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              buildHeaderCell('Sector'),
              buildHeaderCell('Mastercard Volume'),
              buildHeaderCell('Merchant Count'),
              buildHeaderCell('Penetration %')
            ]
          }),
          ...analytics.sectors.top.map((sector) =>
            new TableRow({
              children: [
                buildCell(sector.sector),
                buildCell(sector.volume.toLocaleString()),
                buildCell(sector.merchantCount.toLocaleString()),
                buildCell(`${sector.penetration.toFixed(1)}%`)
              ]
            })
          )
        ]
      }),
      new Paragraph({ text: '' })
    );
  }

  if (analytics.insights.length > 0) {
    sections.push(
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Strategic Insights', bold: true })] }),
      ...analytics.insights.map((insight) => new Paragraph({ text: `• ${insight}` })),
      new Paragraph({ text: '' })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sections
      }
    ]
  });

  return Packer.toBlob(doc);
}
