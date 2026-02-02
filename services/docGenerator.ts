
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType } from 'docx';
import saveAs from 'file-saver';
import { ReportData } from '../types';

export async function generateDocx(data: ReportData) {
  const DEFAULT_FONT = "Calibri";
  const DEFAULT_SIZE = 22; // 11pt
  const HEADING_SIZE = 24;
  const TITLE_SIZE = 32;

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: DEFAULT_FONT,
            size: DEFAULT_SIZE,
          },
        },
      },
    },
    sections: [
      {
        properties: {},
        children: [
          // 1. MAIN TITLE
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `${data.reportType} ACQUIRING SERVICE – ANALYSIS`,
                bold: true,
                size: TITLE_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),
          new Paragraph({ text: "", spacing: { after: 200 } }),

          // 2. SECTION TITLE
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: `${data.reportType} Analysis (Monthly / Weekly)`,
                bold: true,
                size: HEADING_SIZE + 4,
                font: DEFAULT_FONT,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `${data.reportType} Success and Failure Rate (${data.year})`,
                size: HEADING_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: data.dateRange,
                size: HEADING_SIZE,
                font: DEFAULT_FONT,
              }),
            ],
          }),
          new Paragraph({ text: "", spacing: { after: 300 } }),

          // 3. SUCCESS/FAILURE TABLE
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Success Rate", bold: true, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Failure Rate", bold: true, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${data.successRate.toFixed(2)}%`, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${data.failureRate.toFixed(2)}%`, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                ],
              }),
            ],
          }),
          new Paragraph({ text: "", spacing: { after: 400 } }),

          // 4. TOP BUSINESS FAILURE SECTION
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun({ text: `Top ${data.reportType} Business failure`, bold: true, size: HEADING_SIZE + 2, font: DEFAULT_FONT })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Volume", bold: true, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Typical Cause", bold: true, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                ],
              }),
              ...data.businessFailures.map(f => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: f.description, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: f.volume.toString(), font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: f.typicalCause, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                ],
              })),
            ],
          }),
          new Paragraph({ text: "", spacing: { after: 400 } }),

          // 5. TOP TECHNICAL DECLINE SECTION
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun({ text: `Top ${data.reportType} Technical Decline`, bold: true, size: HEADING_SIZE + 2, font: DEFAULT_FONT })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Response Description", bold: true, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Count", bold: true, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Typical Cause", bold: true, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                ],
              }),
              ...data.technicalFailures.map(f => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: f.description, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: f.volume.toString(), font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: f.typicalCause, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                ],
              })),
            ],
          }),
          new Paragraph({ text: "", spacing: { after: 400 } }),

          // 6. ANALYSIS SECTION
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: `Analysis – ${data.dateRange}`, bold: true, size: HEADING_SIZE + 4, font: DEFAULT_FONT })],
          }),
          ...data.narrative.split('\n').map(line => {
            const trimmed = line.trim();
            if (!trimmed) return new Paragraph({ text: "" });

            // Check if this line is a specific analysis heading to be bolded
            const isSectionHeader = trimmed.toLowerCase().includes('business decline analysis') || 
                                    trimmed.toLowerCase().includes('technical decline analysis');

            return new Paragraph({
              children: [
                new TextRun({ 
                  text: trimmed, 
                  size: DEFAULT_SIZE, 
                  font: DEFAULT_FONT,
                  bold: isSectionHeader 
                })
              ],
              spacing: { before: isSectionHeader ? 240 : 120 }
            });
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeYear = data.year.replace(/[^0-9]/g, '');
  saveAs(blob, `${data.reportType}_Acquiring_Report_${safeYear}_${Date.now()}.docx`);
}
