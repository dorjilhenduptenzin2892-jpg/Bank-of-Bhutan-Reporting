/**
 * Executive Summary Engine
 * Generates professional, regulator-safe executive narratives
 */

import { ReportData, ReportType } from '../../types';
import { ResponsibilityDistribution } from './responsibilityModel';
import { Insight } from './insightEngine';

export interface ExecutiveSummary {
  overall_assessment: string;
  performance_statement: string;
  responsibility_distribution: string;
  infrastructure_stability: string;
  key_findings: string;
  outlook: string;
}

/**
 * Generate executive summary for central bank / regulator review
 */
export function generateExecutiveSummary(
  reportData: ReportData,
  responsibility: ResponsibilityDistribution,
  topInsights: Insight[],
  channelType: ReportType
): ExecutiveSummary {
  const successRate = reportData.successRate || 0;
  const failureRate = reportData.failureRate || 0;

  // Overall Assessment
  const overallAssessment = generateOverallAssessment(successRate, failureRate, channelType);

  // Performance Statement
  const performanceStatement = generatePerformanceStatement(
    successRate,
    failureRate,
    reportData.dateRange,
    channelType
  );

  // Responsibility Distribution
  const responsibilityStatement = generateResponsibilityStatement(responsibility);

  // Infrastructure Stability
  const infrastructureStatement = generateInfrastructureStatement(responsibility, reportData);

  // Key Findings
  const keyFindings = generateKeyFindings(topInsights);

  // Outlook
  const outlook = generateOutlook(successRate, responsibility);

  return {
    overall_assessment: overallAssessment,
    performance_statement: performanceStatement,
    responsibility_distribution: responsibilityStatement,
    infrastructure_stability: infrastructureStatement,
    key_findings: keyFindings,
    outlook
  };
}

/**
 * Generate overall assessment statement
 */
function generateOverallAssessment(successRate: number, failureRate: number, channelType: ReportType): string {
  const channel = channelType === 'POS' ? 'POS acquiring' : channelType === 'ATM' ? 'ATM acquiring' : 'IPG';

  if (successRate >= 98) {
    return `${channel} operations demonstrate strong transaction processing performance, with success rates exceeding 98%. The platform exhibits robust stability and effective authorization mechanisms.`;
  } else if (successRate >= 95) {
    return `${channel} operations maintain acceptable transaction processing performance at ${successRate.toFixed(2)}% success rate. Processing is generally stable with manageable decline levels.`;
  } else if (successRate >= 90) {
    return `${channel} operations are functioning at ${successRate.toFixed(2)}% success rate, within operational parameters but indicating areas for optimization.`;
  } else {
    return `${channel} operations currently operate at ${successRate.toFixed(2)}% success rate, below optimal levels. Decline management and process optimization require attention.`;
  }
}

/**
 * Generate performance statement
 */
function generatePerformanceStatement(
  successRate: number,
  failureRate: number,
  dateRange: string,
  channelType: ReportType
): string {
  const channelName = channelType === 'POS' ? 'point-of-sale' : channelType === 'ATM' ? 'ATM' : 'internet payment gateway';

  return `During the ${dateRange} period, ${channelName} transaction processing achieved a success rate of ${successRate.toFixed(2)}%, with a corresponding failure rate of ${failureRate.toFixed(2)}%. This performance reflects normal operational patterns in the card-acquiring environment and indicates stable processing infrastructure.`;
}

/**
 * Generate responsibility distribution statement
 */
function generateResponsibilityStatement(responsibility: ResponsibilityDistribution): string {
  const lines: string[] = [];

  lines.push('Decline causation analysis indicates the following distribution of responsibility:');

  if (responsibility.issuer_percent > 40) {
    lines.push(
      `• Issuer-side authorization decisions: ${responsibility.issuer_percent.toFixed(1)}% (dominant factor)`
    );
  }

  if (responsibility.cardholder_percent > 15) {
    lines.push(
      `• Cardholder-related factors: ${responsibility.cardholder_percent.toFixed(1)}% (significant contributor)`
    );
  }

  if (responsibility.network_percent > 10) {
    lines.push(
      `• Network and scheme-level factors: ${responsibility.network_percent.toFixed(1)}% (material component)`
    );
  }

  if (responsibility.acquirer_percent > 15) {
    lines.push(
      `• Acquirer and infrastructure factors: ${responsibility.acquirer_percent.toFixed(1)}% (secondary factor)`
    );
  }

  if (responsibility.merchant_percent > 10) {
    lines.push(
      `• Merchant integration and configuration: ${responsibility.merchant_percent.toFixed(1)}% (operational element)`
    );
  }

  if (responsibility.external_percent > 5) {
    lines.push(
      `• External infrastructure and connectivity: ${responsibility.external_percent.toFixed(1)}% (minor factor)`
    );
  }

  lines.push(
    responsibility.narrative ||
      'This distribution reflects normal operational patterns across multiple processing entities.'
  );

  return lines.join(' ');
}

/**
 * Generate infrastructure stability statement
 */
function generateInfrastructureStatement(responsibility: ResponsibilityDistribution, reportData: ReportData): string {
  const techDeclineVolume = (reportData.technicalFailures || []).reduce((s, f) => s + (f.volume || 0), 0);
  const techPercent = (techDeclineVolume / Math.max(1, responsibility.total_decline_volume)) * 100;

  if (techPercent < 15) {
    return `Technical declines represent ${techPercent.toFixed(1)}% of transaction failures, indicating stable infrastructure, reliable connectivity, and effective host/network availability. Processing stability is within normal operational parameters.`;
  } else if (techPercent < 25) {
    return `Technical declines account for ${techPercent.toFixed(1)}% of failures. While within operational parameters, this level suggests opportunities for infrastructure optimization and configuration review.`;
  } else {
    return `Technical declines represent ${techPercent.toFixed(1)}% of transaction failures, indicating infrastructure or configuration issues that warrant investigation and remediation planning.`;
  }
}

/**
 * Generate key findings from top insights
 */
function generateKeyFindings(insights: Insight[]): string {
  if (insights.length === 0) {
    return 'No material deviations from expected transaction processing patterns were identified.';
  }

  const topThree = insights.slice(0, 3);
  const lines = topThree.map(
    (insight, idx) => `${idx + 1}. ${insight.title}: ${insight.description}`
  );

  return lines.join(' ');
}

/**
 * Generate outlook statement
 */
function generateOutlook(successRate: number, responsibility: ResponsibilityDistribution): string {
  const outlook: string[] = [];

  if (successRate >= 96) {
    outlook.push(
      'The current trajectory indicates stable, sustainable transaction processing. Continued monitoring of decline patterns and issuer coordination will maintain performance standards.'
    );
  } else {
    outlook.push(
      'Ongoing monitoring and process optimization are recommended to maintain transaction processing stability. Focus areas include issuer coordination, configuration review, and infrastructure performance.'
    );
  }

  if (responsibility.issuer_percent > 60) {
    outlook.push(
      'Strengthened coordination with issuer partners on fraud rule optimization and authorization policy alignment will support continued performance improvement.'
    );
  }

  if (responsibility.cardholder_percent > 25) {
    outlook.push(
      'Enhanced customer communication on card usage, authentication, and account management may reduce cardholder-related declines.'
    );
  }

  if (responsibility.external_percent > 10) {
    outlook.push(
      'Proactive network monitoring and scheme coordination will minimize external infrastructure impacts on transaction processing.'
    );
  }

  return outlook.join(' ');
}
