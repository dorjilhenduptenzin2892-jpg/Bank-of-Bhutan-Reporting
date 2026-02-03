/**
 * KPI Intelligence Integration
 * Integrates KPI Intelligence Engine into main application workflow
 */

import { ReportData } from '../types';
import { analyzeKPIIntelligence, KPIIntelligenceReport } from './kpiIntelligence';
import { formatKPIReportForUI, FormattedKPIReport } from './kpiIntelligence/reportFormatter';

/**
 * Process report data through KPI Intelligence Engine
 * and return comprehensive analysis
 */
export async function enrichReportWithKPIIntelligence(reportData: ReportData): Promise<{
  original_report: ReportData;
  kpi_intelligence: KPIIntelligenceReport;
  formatted_report: FormattedKPIReport;
}> {
  try {
    // Run KPI Intelligence Engine
    const kpiReport = analyzeKPIIntelligence(reportData);

    // Format for UI display
    const formattedReport = formatKPIReportForUI(kpiReport);

    return {
      original_report: reportData,
      kpi_intelligence: kpiReport,
      formatted_report: formattedReport
    };
  } catch (error) {
    console.error('KPI Intelligence analysis failed:', error);
    throw new Error(`KPI Intelligence processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Export enriched report as text for documentation
 */
export function exportKPIReportAsText(report: KPIIntelligenceReport): string {
  const lines: string[] = [];

  lines.push('╔════════════════════════════════════════════════════════════════════════════════╗');
  lines.push('║                 KPI INTELLIGENCE ANALYSIS REPORT                              ║');
  lines.push('║              Advanced Acquiring Analytics Engine v1.0                          ║');
  lines.push('╚════════════════════════════════════════════════════════════════════════════════╝');
  lines.push('');

  lines.push(`Report Type:     ${report.report_type}`);
  lines.push(`Period:          ${report.period}`);
  lines.push(`Generated:       ${report.generated_date}`);
  lines.push('');

  // Executive Summary
  lines.push('─'.repeat(88));
  lines.push('EXECUTIVE SUMMARY');
  lines.push('─'.repeat(88));
  lines.push('');
  lines.push(report.executive_summary.overall_assessment);
  lines.push('');
  lines.push(report.executive_summary.performance_statement);
  lines.push('');

  // Responsibility Distribution
  lines.push('─'.repeat(88));
  lines.push('RESPONSIBILITY DISTRIBUTION & DECLINE ANALYSIS');
  lines.push('─'.repeat(88));
  lines.push('');

  report.ranked_entities.forEach((entity, idx) => {
    const barLength = Math.round(entity.percentage / 2);
    const bar = '█'.repeat(barLength) + '░'.repeat(50 - barLength);
    lines.push(`${idx + 1}. ${entity.entity.padEnd(25)} [${bar}] ${entity.percentage.toFixed(1)}%`);
  });
  lines.push('');

  lines.push(report.executive_summary.responsibility_distribution);
  lines.push('');

  // Infrastructure Assessment
  lines.push('─'.repeat(88));
  lines.push('INFRASTRUCTURE & TECHNICAL ASSESSMENT');
  lines.push('─'.repeat(88));
  lines.push('');
  lines.push(report.executive_summary.infrastructure_stability);
  lines.push('');

  // Key Insights
  if (report.insights.length > 0) {
    lines.push('─'.repeat(88));
    lines.push('KEY INSIGHTS & FINDINGS');
    lines.push('─'.repeat(88));
    lines.push('');

    report.insights.forEach((insight, idx) => {
      const severityIcon = {
        High: '⚠️  ',
        Medium: '⚡  ',
        Low: 'ℹ️  '
      }[insight.severity];

      lines.push(`${severityIcon}[${insight.severity.toUpperCase()}] ${insight.title}`);
      lines.push(`   Area: ${insight.action_area}`);
      lines.push(`   ${insight.description}`);
      lines.push('');
    });
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    lines.push('─'.repeat(88));
    lines.push('STRATEGIC RECOMMENDATIONS');
    lines.push('─'.repeat(88));
    lines.push('');

    const highPriority = report.recommendations.filter(r => r.priority === 'High');
    const mediumPriority = report.recommendations.filter(r => r.priority === 'Medium');

    if (highPriority.length > 0) {
      lines.push('HIGH PRIORITY ACTIONS:');
      highPriority.forEach((rec, idx) => {
        lines.push(`  ${idx + 1}. [${rec.area}] ${rec.action}`);
        lines.push(`     Stakeholders: ${rec.stakeholders.join(', ')}`);
        lines.push('');
      });
    }

    if (mediumPriority.length > 0) {
      lines.push('MEDIUM PRIORITY ACTIONS:');
      mediumPriority.forEach((rec, idx) => {
        lines.push(`  ${idx + 1}. [${rec.area}] ${rec.action}`);
        lines.push('');
      });
    }
  }

  // Channel Intelligence
  lines.push('─'.repeat(88));
  lines.push(`${report.report_type} CHANNEL-SPECIFIC INTELLIGENCE`);
  lines.push('─'.repeat(88));
  lines.push('');

  if (report.channel_intelligence.specific_patterns.length > 0) {
    lines.push('Key Patterns:');
    report.channel_intelligence.specific_patterns.forEach(pattern => {
      lines.push(`  • ${pattern}`);
    });
    lines.push('');
  }

  if (report.channel_intelligence.risk_areas.length > 0) {
    lines.push('Risk Areas:');
    report.channel_intelligence.risk_areas.forEach(risk => {
      lines.push(`  • ${risk}`);
    });
    lines.push('');
  }

  if (report.channel_intelligence.optimization_opportunities.length > 0) {
    lines.push('Optimization Opportunities:');
    report.channel_intelligence.optimization_opportunities.forEach(opp => {
      lines.push(`  • ${opp}`);
    });
    lines.push('');
  }

  // Outlook
  lines.push('─'.repeat(88));
  lines.push('OUTLOOK & IMPLICATIONS');
  lines.push('─'.repeat(88));
  lines.push('');
  lines.push(report.executive_summary.outlook);
  lines.push('');

  // Summary
  lines.push('─'.repeat(88));
  lines.push('SUMMARY NARRATIVE');
  lines.push('─'.repeat(88));
  lines.push('');
  lines.push(report.summary_narrative);
  lines.push('');

  lines.push('╔════════════════════════════════════════════════════════════════════════════════╗');
  lines.push('║  Report generated by Advanced KPI Intelligence Engine - Acquiring Analytics   ║');
  lines.push('║  For regulatory, compliance, and strategic planning purposes.                 ║');
  lines.push('╚════════════════════════════════════════════════════════════════════════════════╝');

  return lines.join('\n');
}
