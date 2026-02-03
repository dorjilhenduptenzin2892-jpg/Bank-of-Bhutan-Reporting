/**
 * Executive Summary Engine
 * Generates professional, regulator-ready executive narratives
 * Implements Tier-1 banking language standards and regulatory compliance
 */

import { ReportData, ReportType } from '../../types';
import { ResponsibilityDistribution } from './responsibilityModel';
import { Insight } from './insightEngine';
import { Recommendation } from './recommendationEngine';
import { generateProfessionalReport } from './professionalReporting';

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
 * Uses professional banking language and Tier-1 compliance standards
 */
export function generateExecutiveSummary(
  reportData: ReportData,
  responsibility: ResponsibilityDistribution,
  topInsights: Insight[],
  channelType: ReportType,
  recommendations?: Recommendation[]
): ExecutiveSummary {
  // Generate professional report for reference
  const professionalReport = generateProfessionalReport(
    reportData,
    responsibility,
    topInsights,
    recommendations || [],
    channelType
  );

  const successRate = reportData.successRate || 0;
  const failureRate = reportData.failureRate || 0;

  // Overall Assessment - Professional, neutral
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
  const outlook = generateOutlook(successRate, responsibility, channelType);

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
 * Generate overall assessment statement using professional banking language
 */
function generateOverallAssessment(successRate: number, failureRate: number, channelType: ReportType): string {
  const channel = channelType === 'POS' ? 'Point-of-sale acquiring' : channelType === 'ATM' ? 'ATM acquiring' : 'Internet payment gateway';

  if (successRate >= 98) {
    return `${channel} operations demonstrate robust transaction processing with authorization success metrics exceeding 98%. Processing environment stability remains within optimal operational parameters.`;
  } else if (successRate >= 96) {
    return `${channel} operations maintain consistent transaction processing performance with authorization success rate of ${successRate.toFixed(2)}%. Decline patterns reflect normal acquiring environment characteristics.`;
  } else if (successRate >= 94) {
    return `${channel} operations reflect stable transaction processing with authorization success rate of ${successRate.toFixed(2)}%. Decline drivers remain distributed across issuer policies and cardholder factors.`;
  } else {
    return `${channel} operations continue within established operational parameters with authorization success rate of ${successRate.toFixed(2)}%. Decline attribution reflects typical acquiring environment dynamics.`;
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
 * Generate infrastructure stability statement with professional language
 */
function generateInfrastructureStatement(responsibility: ResponsibilityDistribution, reportData: ReportData): string {
  const techDeclineVolume = (reportData.technicalFailures || []).reduce((s, f) => s + (f.volume || 0), 0);
  const techPercent = (techDeclineVolume / Math.max(1, responsibility.total_decline_volume)) * 100;

  if (techPercent < 13) {
    return `Technical declines represent ${techPercent.toFixed(1)}% of transaction failures, indicating stable infrastructure, reliable host connectivity, and effective network availability. Processing environment demonstrates consistent operational stability.`;
  } else if (techPercent < 22) {
    return `Technical declines account for ${techPercent.toFixed(1)}% of transaction failures. Infrastructure operates within normal operational parameters with opportunities for optimization through configuration and monitoring enhancements.`;
  } else if (techPercent < 32) {
    return `Technical declines represent ${techPercent.toFixed(1)}% of transaction failures, indicating processing environment elements requiring operational review and infrastructure monitoring optimization.`;
  } else {
    return `Technical declines account for ${techPercent.toFixed(1)}% of transaction failures, indicating infrastructure and configuration factors requiring investigation and remediation planning.`;
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
 * Generate outlook statement with professional, forward-looking language
 */
function generateOutlook(successRate: number, responsibility: ResponsibilityDistribution, channelType: ReportType): string {
  const outlook: string[] = [];

  if (successRate >= 96) {
    outlook.push(
      'Current performance trajectory indicates stable, sustainable transaction processing. Continued monitoring of authorization patterns and decline distribution will maintain established performance standards.'
    );
  } else {
    outlook.push(
      'Ongoing operational monitoring and stakeholder coordination are recommended to maintain transaction processing stability. Focus areas include issuer partnership optimization, merchant integration standards, and infrastructure performance tracking.'
    );
  }

  if (responsibility.issuer_percent > 55) {
    outlook.push(
      'Strengthened coordination with issuer institutions on authorization policy alignment, fraud rule optimization, and risk management configuration will support continued operational efficiency.'
    );
  }

  if (responsibility.cardholder_percent > 22) {
    outlook.push(
      'Enhanced cardholder communication programs addressing card usage optimization, authentication process understanding, and account management best practices may contribute to improved authorization outcomes.'
    );
  }

  if (responsibility.network_percent > 12) {
    outlook.push(
      'Continued engagement with network operators and scheme coordinators ensures efficient scheme-level coordination and minimizes network-related processing variations.'
    );
  }

  if (channelType === 'POS') {
    outlook.push(
      'Merchant integration standards review and terminal configuration optimization will support sustained point-of-sale processing performance.'
    );
  } else if (channelType === 'ATM') {
    outlook.push(
      'ATM network monitoring and host availability coordination will maintain ATM transaction processing stability.'
    );
  } else if (channelType === 'IPG') {
    outlook.push(
      'Internet payment gateway performance monitoring and 3DS authentication optimization will support continued IPG processing efficiency.'
    );
  }

  return outlook.join(' ');
}
