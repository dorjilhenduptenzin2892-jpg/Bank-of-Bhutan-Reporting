/**
 * Insight Generation Engine
 * Rule-based deterministic insight generation from decline patterns
 */

import { StandardizedDecline, ReportData, ReportType } from '../../types';
import { ResponsibilityDistribution } from './responsibilityModel';
import { getDeclineEntry, DECLINE_KNOWLEDGE_BASE } from './declineKnowledgeBase';

export interface Insight {
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High';
  action_area: string;
}

/**
 * Generate insights from decline patterns and responsibility data
 */
export function generateInsights(
  reportData: ReportData,
  responsibility: ResponsibilityDistribution,
  channelType: ReportType
): Insight[] {
  const insights: Insight[] = [];
  const failures = reportData.businessFailures || [];
  const techFailures = reportData.technicalFailures || [];
  const totalFailures = failures.length + techFailures.length;
  const totalVolume = responsibility.total_decline_volume;

  // 1. ISSUER-DRIVEN INSIGHTS
  if (responsibility.issuer_percent > 50) {
    insights.push({
      title: 'Issuer-Driven Authorization Environment',
      description:
        'The majority of declines are driven by issuer-side authorization decisions, which is typical in international and domestic card-acquiring environments. This reflects issuer fraud controls, velocity rules, and account status management.',
      severity: 'Low',
      action_area: 'Issuer Coordination'
    });
  }

  // 2. TECHNICAL STABILITY INSIGHTS
  const technicalPercent = (techFailures.reduce((s, f) => s + (f.volume || 0), 0) / Math.max(1, totalVolume)) * 100;
  if (technicalPercent < 15) {
    insights.push({
      title: 'Technical Decline Levels Within Normal Range',
      description: `Technical declines account for ${technicalPercent.toFixed(1)}% of failures, indicating stable acquiring infrastructure and reliable host/network connectivity.`,
      severity: 'Low',
      action_area: 'Infrastructure Stability'
    });
  } else if (technicalPercent >= 20 && technicalPercent < 35) {
    insights.push({
      title: 'Elevated Technical Decline Activity',
      description: `Technical declines represent ${technicalPercent.toFixed(1)}% of failures, suggesting potential configuration or connectivity optimization opportunities.`,
      severity: 'Medium',
      action_area: 'Technical Operations'
    });
  } else if (technicalPercent >= 35) {
    insights.push({
      title: 'High Technical Decline Concentration',
      description: `Technical declines account for ${technicalPercent.toFixed(1)}% of failures, indicating infrastructure or configuration issues requiring investigation.`,
      severity: 'High',
      action_area: 'Technical Operations'
    });
  }

  // 3. CARDHOLDER BEHAVIOR INSIGHTS
  if (responsibility.cardholder_percent > 30) {
    insights.push({
      title: 'Cardholder-Related Decline Patterns',
      description:
        'A significant share of declines reflects cardholder behavior and account status (e.g., insufficient funds, incorrect PIN, expired cards). This suggests customer education and awareness opportunities.',
      severity: 'Low',
      action_area: 'Customer Communication'
    });
  }

  // 4. SPECIFIC DECLINE PATTERN INSIGHTS
  if (failures.length > 0) {
    const topDecline = failures[0];
    const topEntry = getDeclineEntry(topDecline.description);

    if (topEntry.category === 'Business' && topDecline.volume && totalVolume > 0) {
      const topPercent = (topDecline.volume / totalVolume) * 100;
      if (topPercent > 25) {
        insights.push({
          title: `${topDecline.description} Dominates Decline Profile`,
          description: `"${topDecline.description}" represents ${topPercent.toFixed(1)}% of all declines. This is a primary focus area for coordination with issuers.`,
          severity: topEntry.severity_score >= 4 ? 'High' : 'Medium',
          action_area: 'Issuer Coordination'
        });
      }
    }
  }

  // 5. CHANNEL-SPECIFIC INSIGHTS
  if (channelType === 'IPG') {
    const auth3DS = failures.find(f => f.description && f.description.toLowerCase().includes('3ds'));
    const gatewayTimeout = failures.find(f => f.description && f.description.toLowerCase().includes('gateway'));

    if (auth3DS && auth3DS.volume && (auth3DS.volume / totalVolume) * 100 > 10) {
      insights.push({
        title: '3D Secure Authentication Challenges in IPG',
        description:
          'IPG transactions are experiencing notable 3D Secure authentication failures, suggesting customer experience or issuer configuration issues.',
        severity: 'Medium',
        action_area: 'IPG Integration'
      });
    }

    if (gatewayTimeout && gatewayTimeout.volume && (gatewayTimeout.volume / totalVolume) * 100 > 5) {
      insights.push({
        title: 'Gateway Processing Timeouts Detected',
        description:
          'Transaction processing timeouts suggest network latency or gateway performance issues requiring infrastructure review.',
        severity: 'Medium',
        action_area: 'Gateway Operations'
      });
    }
  }

  if (channelType === 'ATM') {
    const pinErrors = failures.find(f => f.description && f.description.toLowerCase().includes('pin'));
    if (pinErrors && pinErrors.volume && (pinErrors.volume / totalVolume) * 100 > 15) {
      insights.push({
        title: 'High PIN-Related Decline Rate in ATM',
        description:
          'PIN entry errors represent a significant portion of ATM declines. Customer awareness on PIN security and entry procedures may reduce this rate.',
        severity: 'Low',
        action_area: 'Customer Communication'
      });
    }
  }

  // 6. EXTERNAL INFRASTRUCTURE INSIGHTS
  if (responsibility.external_percent > 15) {
    insights.push({
      title: 'External Infrastructure Factors',
      description:
        'External infrastructure issues (network, external service availability) account for a measurable share of declines. Coordination with network operators may optimize connectivity.',
      severity: 'Medium',
      action_area: 'Network Coordination'
    });
  }

  // 7. MERCHANT/INTEGRATION INSIGHTS
  if (responsibility.merchant_percent > 20) {
    insights.push({
      title: 'Merchant Configuration and Integration Factors',
      description:
        'Merchant-side configuration and integration issues contribute notably to the decline profile. Terminal and POS integration standards should be reviewed.',
      severity: 'Medium',
      action_area: 'Merchant Management'
    });
  }

  // 8. NETWORK-DRIVEN INSIGHTS
  if (responsibility.network_percent > 20) {
    insights.push({
      title: 'Scheme-Level Network Factors',
      description:
        'Network and scheme-level factors (validation, routing, fraud controls) account for a material share of declines, reflecting industry-wide processing standards.',
      severity: 'Low',
      action_area: 'Network Monitoring'
    });
  }

  // 9. SUCCESS RATE BENCHMARKING
  if (reportData.successRate >= 98) {
    insights.push({
      title: 'Excellent Transaction Success Rate',
      description: `Success rate of ${reportData.successRate.toFixed(2)}% indicates robust processing stability and healthy transaction throughput.`,
      severity: 'Low',
      action_area: 'Performance'
    });
  } else if (reportData.successRate < 93) {
    insights.push({
      title: 'Below-Average Transaction Success Rate',
      description: `Success rate of ${reportData.successRate.toFixed(2)}% is below typical benchmarks, indicating potential system or coordination issues.`,
      severity: 'High',
      action_area: 'System Operations'
    });
  }

  return insights;
}

/**
 * Prioritize insights by severity and relevance
 */
export function prioritizeInsights(insights: Insight[]): Insight[] {
  const severityRank = { High: 0, Medium: 1, Low: 2 };
  return [...insights].sort(
    (a, b) => severityRank[a.severity as keyof typeof severityRank] - severityRank[b.severity as keyof typeof severityRank]
  );
}
