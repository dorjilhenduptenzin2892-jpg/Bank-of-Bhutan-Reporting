
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ImageRun } from 'docx';
import saveAs from 'file-saver';
import { ReportData } from '../types';
import { KPIIntelligenceReport } from './kpiIntelligence';

export async function generateDocx(data: ReportData, kpiReport?: KPIIntelligenceReport) {
  const DEFAULT_FONT = "Calibri";
  const DEFAULT_SIZE = 22; // 11pt
  const HEADING_SIZE = 24;
  const TITLE_SIZE = 32;

  console.log('Starting document creation...');
  console.log('Creating document with reportData:', data);
  console.log('KPI Report present:', !!kpiReport);

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
          new Paragraph({ text: "", spacing: { after: 400 } }),

          // 7. KPI INTELLIGENCE SECTION
          ...(kpiReport ? [
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun({ text: "KPI Intelligence & Analysis", bold: true, size: HEADING_SIZE + 4, font: DEFAULT_FONT })],
            }),
            new Paragraph({ text: "", spacing: { after: 200 } }),

            // 7a. RESPONSIBILITY DISTRIBUTION
            new Paragraph({
              heading: HeadingLevel.HEADING_3,
              children: [new TextRun({ text: "Responsibility Distribution Analysis", bold: true, size: HEADING_SIZE + 2, font: DEFAULT_FONT })],
            }),
              // Insert pie diagram (SVG -> PNG) if available
              ...(kpiReport?.professional_report?.responsibility_distribution_analysis?.pie_svg ? [
                // Placeholder marker for overall pie; will be replaced at runtime
                new Paragraph({ children: [new TextRun({ text: "__PIE_OVERALL__" })] })
              ] : []),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Entity", bold: true, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Responsibility %", bold: true, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                  ],
                }),
                ...(kpiReport?.professional_report?.responsibility_distribution_analysis?.entities || []).map((entity: any) => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: entity.name, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${(entity.percentage).toFixed(1)}%`, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: entity.description, font: DEFAULT_FONT, size: DEFAULT_SIZE })] })] }),
                  ],
                })),
              ],
            }),
            new Paragraph({ text: "", spacing: { after: 200 } }),
            ...(kpiReport?.professional_report?.responsibility_distribution_analysis?.assessment ? [
              new Paragraph({
                children: [new TextRun({ text: kpiReport.professional_report.responsibility_distribution_analysis.assessment, size: DEFAULT_SIZE, font: DEFAULT_FONT, italics: true })],
                spacing: { before: 120, after: 200 }
              }),
            ] : []),

            // Show example response descriptions grouped by entity
            ...(kpiReport?.professional_report?.responsibility_distribution_analysis?.entities || []).map((entity: any, idx: number) => {
              const markerParagraph = entity.pie_svg ? new Paragraph({ children: [new TextRun({ text: `__PIE_ENTITY_${idx}__` })] }) : null;
              const header = new Paragraph({
                children: [new TextRun({ text: entity.name, bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
                spacing: { before: 120 }
              });
              const examplesParagraph = (entity.examples && entity.examples.length) ? new Paragraph({
                children: [new TextRun({ text: `Examples: ${entity.examples.map((ex: any) => ex.description || ex).join('; ')}`, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
                spacing: { before: 60, after: 80 }
              }) : null;

              const parts = [] as any[];
              if (markerParagraph) parts.push(markerParagraph);
              parts.push(header);
              if (examplesParagraph) parts.push(examplesParagraph);
              return parts;
            }).flat(),

            // 7b. KEY INSIGHTS
            new Paragraph({
              heading: HeadingLevel.HEADING_3,
              children: [new TextRun({ text: "Key Insights", bold: true, size: HEADING_SIZE + 2, font: DEFAULT_FONT })],
            }),
            ...(kpiReport.insights || []).slice(0, 5).map((insight: any) => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `• ${insight.title}`,
                    bold: true,
                    size: DEFAULT_SIZE,
                    font: DEFAULT_FONT,
                  })
                ],
                spacing: { before: 120 }
              }),
              new Paragraph({
                children: [new TextRun({ text: insight.description, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
                spacing: { before: 80, after: 120 }
              }),
            ]).flat(),
            new Paragraph({ text: "", spacing: { after: 200 } }),

            // 7c. RECOMMENDATIONS
            new Paragraph({
              heading: HeadingLevel.HEADING_3,
              children: [new TextRun({ text: "Key Recommendations", bold: true, size: HEADING_SIZE + 2, font: DEFAULT_FONT })],
            }),
            ...(kpiReport.recommendations || []).slice(0, 5).map((rec: any) => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${rec.priority.toUpperCase()} - ${rec.area}`,
                    bold: true,
                    size: DEFAULT_SIZE,
                    font: DEFAULT_FONT,
                  })
                ],
                spacing: { before: 120 }
              }),
              new Paragraph({
                children: [new TextRun({ text: `Action: ${rec.action}`, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
                spacing: { before: 80 }
              }),
              new Paragraph({
                children: [new TextRun({ text: `Rationale: ${rec.rationale}`, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
                spacing: { before: 80, after: 120 }
              }),
            ]).flat(),
            new Paragraph({ text: "", spacing: { after: 200 } }),

            // 7d. EXECUTIVE SUMMARY
            new Paragraph({
              heading: HeadingLevel.HEADING_3,
              children: [new TextRun({ text: "Executive Summary", bold: true, size: HEADING_SIZE + 2, font: DEFAULT_FONT })],
            }),
            ...(kpiReport.executive_summary ? [
              new Paragraph({
                children: [new TextRun({ text: "Overall Assessment", bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
                spacing: { before: 120 }
              }),
              new Paragraph({
                children: [new TextRun({ text: kpiReport.executive_summary.overall_assessment, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
                spacing: { before: 80, after: 120 }
              }),
              new Paragraph({
                children: [new TextRun({ text: "Performance Statement", bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
                spacing: { before: 120 }
              }),
              new Paragraph({
                children: [new TextRun({ text: kpiReport.executive_summary.performance_statement, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
                spacing: { before: 80, after: 120 }
              }),
              new Paragraph({
                children: [new TextRun({ text: "Infrastructure Stability", bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
                spacing: { before: 120 }
              }),
              new Paragraph({
                children: [new TextRun({ text: kpiReport.executive_summary.infrastructure_stability, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
                spacing: { before: 80, after: 120 }
              }),
              new Paragraph({
                children: [new TextRun({ text: "Key Findings", bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
                spacing: { before: 120 }
              }),
              new Paragraph({
                children: [new TextRun({ text: kpiReport.executive_summary.key_findings, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
                spacing: { before: 80, after: 120 }
              }),
              new Paragraph({
                children: [new TextRun({ text: "Outlook", bold: true, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
                spacing: { before: 120 }
              }),
              new Paragraph({
                children: [new TextRun({ text: kpiReport.executive_summary.outlook, size: DEFAULT_SIZE, font: DEFAULT_FONT })],
                spacing: { before: 80, after: 200 }
              }),
            ] : []),
          ] : []),
        ],
      },
    ],
  });

  try {
    // If KPI pie SVG is present, convert it to PNG and insert into the document
    async function svgDataUrlToPngUint8Array(dataUrl: string): Promise<Uint8Array> {
      return new Promise((resolve, reject) => {
        try {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width || 300;
            canvas.height = img.height || 300;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas not available'));
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
              if (!blob) return reject(new Error('PNG conversion failed'));
              const reader = new FileReader();
              reader.onload = () => {
                resolve(new Uint8Array(reader.result as ArrayBuffer));
              };
              reader.onerror = (e) => reject(e);
              reader.readAsArrayBuffer(blob);
            }, 'image/png');
          };
          img.onerror = (e) => reject(new Error('SVG load error'));
          img.src = dataUrl;
        } catch (err) {
          reject(err);
        }
      });
    }

    // Replace markers for overall and per-entity pies with converted PNG ImageRuns
    try {
      const section = (doc.sections && doc.sections[0] && doc.sections[0].children) as any[];
      if (section && kpiReport?.professional_report?.responsibility_distribution_analysis) {
        // Prepare marker -> SVG map
        const overallSvg = kpiReport.professional_report.responsibility_distribution_analysis.pie_svg;
        const entities = kpiReport.professional_report.responsibility_distribution_analysis.entities || [];
        const markerMap: Record<string, string> = {};
        if (overallSvg) markerMap['__PIE_OVERALL__'] = overallSvg;
        entities.forEach((ent: any, i: number) => {
          if (ent.pie_svg) markerMap[`__PIE_ENTITY_${i}__`] = ent.pie_svg;
        });

        for (let i = 0; i < section.length; i++) {
          const p = section[i];
          try {
            if (!(p && p.root && p.root[0] && p.root[0].options && p.root[0].options.children)) continue;
            const text = p.root[0].options.children.map((c: any) => c.text || '').join('').trim();
            if (!text) continue;
            const svgForMarker = markerMap[text];
            if (svgForMarker) {
              try {
                const pngBytes = await svgDataUrlToPngUint8Array(svgForMarker);
                const imgParagraph = new Paragraph({
                  children: [new ImageRun({ data: pngBytes, transformation: { width: 420, height: 300 } })],
                  spacing: { after: 200 }
                });
                section.splice(i, 1, imgParagraph);
                // advance index past inserted paragraph
              } catch (e) {
                console.warn('Failed to convert/insert pie for marker', text, e);
              }
            }
          } catch (_) { /* continue */ }
        }
      }
    } catch (e) {
      console.warn('Failed to process pie markers:', e);
    }
    console.log('Converting document to blob...');
    const blob = await Packer.toBlob(doc);
    console.log('Blob created successfully, size:', blob.size);
    
    const safeYear = data.year.replace(/[^0-9]/g, '');
    const filename = `${data.reportType}_Acquiring_Report_${safeYear}_${Date.now()}.docx`;
    console.log('Saving file as:', filename);
    
    saveAs(blob, filename);
    console.log('File save triggered successfully');
  } catch (blobErr: any) {
    console.error('Error during blob creation or file save:', blobErr);
    throw new Error(`Document generation failed: ${blobErr.message}`);
  }
}
