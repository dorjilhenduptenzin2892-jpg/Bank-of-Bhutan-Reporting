/**
 * KPI Intelligence Engine - Main Orchestrator
 * Integrates all KPI components and produces comprehensive analysis reports
 * Implements Tier-1 banking language standards and regulatory compliance
 */

import { ReportData, ReportType } from '../../types';
import { calculateResponsibilityDistribution, getRankedEntities, ResponsibilityDistribution } from './responsibilityModel';
import { generateInsights, prioritizeInsights, Insight } from './insightEngine';
import { generateExecutiveSummary, ExecutiveSummary } from './executiveSummary';
import { generateRecommendations, prioritizeRecommendations, Recommendation } from './recommendationEngine';
import { analyzeChannelSpecificPatterns, ChannelIntelligence } from './channelLogic';
import { ProfessionalReport, generateProfessionalReport } from './professionalReporting';

/**
 * Complete KPI Intelligence Report
 */
export interface KPIIntelligenceReport {
  report_type: ReportType;
  period: string;
  generated_date: string;
  responsibility_distribution: ResponsibilityDistribution;
  ranked_entities: ReturnType<typeof getRankedEntities>;
  insights: Insight[];
  executive_summary: ExecutiveSummary;
  channel_intelligence: ChannelIntelligence;
  recommendations: Recommendation[];
  summary_narrative: string;
  professional_report: ProfessionalReport;
}

/**
 * Main KPI Intelligence Engine
 * Orchestrates all analysis and generates comprehensive report
 */
export function analyzeKPIIntelligence(reportData: ReportData): KPIIntelligenceReport {
  // 1. Calculate responsibility distribution
  const responsibility = calculateResponsibilityDistribution(
    reportData.businessFailures || [],
    reportData.totalTransactions || 0
  );

  // 2. Get ranked entities
  const rankedEntities = getRankedEntities(responsibility);

  // 3. Generate insights
  const allInsights = generateInsights(reportData, responsibility, reportData.reportType);
  const insights = prioritizeInsights(allInsights).slice(0, 5); // Top 5 insights

  // 4. Generate recommendations (moved before executive summary)
  const allRecommendations = generateRecommendations(reportData, responsibility, reportData.reportType);
  const recommendations = prioritizeRecommendations(allRecommendations).slice(0, 5); // Top 5 recommendations

  // 5. Generate executive summary
  const executiveSummary = generateExecutiveSummary(reportData, responsibility, insights, reportData.reportType, allRecommendations);

  // 6. Analyze channel-specific patterns
  const channelIntelligence = analyzeChannelSpecificPatterns(reportData, responsibility, reportData.reportType);

  // 7. Generate professional report
  const professionalReport = generateProfessionalReport(
    reportData,
    responsibility,
    insights,
    recommendations,
    reportData.reportType
  );

  // 8. Generate summary narrative
  const summaryNarrative = generateSummaryNarrative(
    reportData,
    responsibility,
    rankedEntities,
    insights,
    channelIntelligence
  );

  return {
    report_type: reportData.reportType,
    period: reportData.dateRange,
    generated_date: new Date().toISOString().split('T')[0],
    responsibility_distribution: responsibility,
    ranked_entities: rankedEntities,
    insights,
    executive_summary: executiveSummary,
    channel_intelligence: channelIntelligence,
    recommendations,
    summary_narrative: summaryNarrative,
    professional_report: professionalReport
  };
}

/**
 * Generate concise summary narrative for reports
 */
function generateSummaryNarrative(
  reportData: ReportData,
  responsibility: ResponsibilityDistribution,
  rankedEntities: ReturnType<typeof getRankedEntities>,
  topInsights: Insight[],
  channelIntel: ChannelIntelligence
): string {
  const lines: string[] = [];
  const channel = getChannelLabel(reportData.reportType);

  // Opening
  lines.push(
    `${channel} Transaction Processing Summary (${reportData.dateRange}):`
  );

  // Performance
  lines.push(
    `Success Rate: ${reportData.successRate.toFixed(2)}% | Failure Rate: ${reportData.failureRate.toFixed(2)}% | Total Transactions: ${reportData.totalTransactions?.toLocaleString()}`
  );

  // Responsibility distribution (top 3 entities)
  lines.push('Primary Decline Drivers:');
  rankedEntities.slice(0, 3).forEach((entity, idx) => {
    lines.push(
      `  ${idx + 1}. ${entity.entity}: ${entity.percentage.toFixed(1)}% (${entity.contribution})`
    );
  });

  // Key patterns
  if (channelIntel.specific_patterns.length > 0) {
    lines.push('Key Patterns:');
    channelIntel.specific_patterns.slice(0, 2).forEach(pattern => {
      lines.push(`  • ${pattern}`);
    });
  }

  // Top insights
  if (topInsights.length > 0) {
    lines.push('Critical Findings:');
    topInsights.slice(0, 2).forEach(insight => {
      lines.push(`  • ${insight.title} [${insight.severity}]`);
    });
  }

  // Outlook
  lines.push(
    responsibility.narrative || 'Transaction processing remains stable with manageable decline levels.'
  );

  return lines.join('\n');
}

/**
 * Get human-readable channel label
 */
function getChannelLabel(channelType: ReportType): string {
  return channelType === 'POS' ? 'Point-of-Sale' : channelType === 'ATM' ? 'ATM' : 'Internet Payment Gateway';
}

/**
 * Export KPI Intelligence Report to JSON
 */
export function serializeReport(report: KPIIntelligenceReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Export KPI Intelligence Report to structured text
 */
export function formatReportAsText(report: KPIIntelligenceReport): string {
  const lines: string[] = [];

  lines.push('═'.repeat(80));
  lines.push('KPI INTELLIGENCE REPORT - ADVANCED ANALYTICS ENGINE');
  lines.push('═'.repeat(80));
  lines.push('');

  // Header
  lines.push(`Channel: ${report.report_type}`);
  lines.push(`Period: ${report.period}`);
  lines.push(`Generated: ${report.generated_date}`);
  lines.push('');

  // Executive Summary
  lines.push('─'.repeat(80));
  lines.push('EXECUTIVE SUMMARY');
  lines.push('─'.repeat(80));
  lines.push(report.executive_summary.overall_assessment);
  lines.push('');
  lines.push(report.executive_summary.performance_statement);
  lines.push('');

  // Responsibility Distribution
  lines.push('─'.repeat(80));
  lines.push('RESPONSIBILITY DISTRIBUTION');
  lines.push('─'.repeat(80));
  lines.push(report.executive_summary.responsibility_distribution);
  lines.push('');

  // Infrastructure
  lines.push('─'.repeat(80));
  lines.push('INFRASTRUCTURE STABILITY');
  lines.push('─'.repeat(80));
  lines.push(report.executive_summary.infrastructure_stability);
  lines.push('');

  // Key Findings
  lines.push('─'.repeat(80));
  lines.push('KEY FINDINGS & INSIGHTS');
  lines.push('─'.repeat(80));
  lines.push(report.executive_summary.key_findings);
  lines.push('');

  // Top Insights
  if (report.insights.length > 0) {
    lines.push('─'.repeat(80));
    lines.push('DETAILED INSIGHTS');
    lines.push('─'.repeat(80));
    report.insights.forEach((insight, idx) => {
      lines.push(`${idx + 1}. ${insight.title} [${insight.severity}]`);
      lines.push(`   Area: ${insight.action_area}`);
      lines.push(`   ${insight.description}`);
      lines.push('');
    });
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    lines.push('─'.repeat(80));
    lines.push('RECOMMENDATIONS');
    lines.push('─'.repeat(80));
    report.recommendations.forEach((rec, idx) => {
      lines.push(`${idx + 1}. ${rec.area} [${rec.priority}]`);
      lines.push(`   Action: ${rec.action}`);
      lines.push(`   Rationale: ${rec.rationale}`);
      lines.push('');
    });
  }

  // Outlook
  lines.push('─'.repeat(80));
  lines.push('OUTLOOK & NEXT STEPS');
  lines.push('─'.repeat(80));
  lines.push(report.executive_summary.outlook);
  lines.push('');

  lines.push('═'.repeat(80));

  return lines.join('\n');
}
