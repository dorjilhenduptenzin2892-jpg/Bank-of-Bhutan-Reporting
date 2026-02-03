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
 * Uses professional banking language and neutral tone
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

  // 1. ISSUER-DRIVEN INSIGHTS - Professional tone
  if (responsibility.issuer_percent > 50) {
    insights.push({
      title: 'Issuer Authorization Environment',
      description:
        `Issuer-side authorization decisions account for ${responsibility.issuer_percent.toFixed(1)}% of decline attribution, reflecting the significant role of issuer fraud controls, account verification policies, and velocity management in transaction processing outcomes. This distribution is consistent with typical card-acquiring environments.`,
      severity: 'Low',
      action_area: 'Issuer Coordination'
    });
  } else if (responsibility.issuer_percent > 35) {
    insights.push({
      title: 'Balanced Issuer and Ecosystem Factors',
      description:
        `Issuer authorization decisions account for ${responsibility.issuer_percent.toFixed(1)}% of declines, with additional contributions from cardholder and network factors. This balanced distribution reflects typical acquiring environment dynamics.`,
      severity: 'Low',
      action_area: 'Issuer Coordination'
    });
  }

  // 2. TECHNICAL STABILITY INSIGHTS - Neutral language
  const technicalPercent = (techFailures.reduce((s, f) => s + (f.volume || 0), 0) / Math.max(1, totalVolume)) * 100;
  if (technicalPercent < 13) {
    insights.push({
      title: 'Technical Decline Levels Within Optimal Range',
      description: `Technical declines account for ${technicalPercent.toFixed(1)}% of transaction failures, indicating stable acquiring infrastructure, reliable host connectivity, and effective network availability characteristics.`,
      severity: 'Low',
      action_area: 'Infrastructure Stability'
    });
  } else if (technicalPercent >= 13 && technicalPercent < 24) {
    insights.push({
      title: 'Technical Decline Activity Within Normal Parameters',
      description: `Technical declines represent ${technicalPercent.toFixed(1)}% of transaction failures. Infrastructure operates within normal operational parameters with opportunities for optimization through continued monitoring and configuration enhancements.`,
      severity: 'Low',
      action_area: 'Technical Operations'
    });
  } else if (technicalPercent >= 24 && technicalPercent < 35) {
    insights.push({
      title: 'Technical Decline Activity Requiring Monitoring',
      description: `Technical declines account for ${technicalPercent.toFixed(1)}% of transaction failures, indicating processing environment elements that benefit from enhanced operational monitoring and infrastructure optimization review.`,
      severity: 'Medium',
      action_area: 'Technical Operations'
    });
  } else {
    insights.push({
      title: 'Technical Decline Activity Requiring Review',
      description: `Technical declines represent ${technicalPercent.toFixed(1)}% of transaction failures, indicating infrastructure and configuration elements requiring operational review and remediation planning.`,
      severity: 'High',
      action_area: 'Technical Operations'
    });
  }

  // 3. CARDHOLDER BEHAVIOR INSIGHTS - Neutral, descriptive
  if (responsibility.cardholder_percent > 30) {
    insights.push({
      title: 'Cardholder Behavior and Account Status Factors',
      description:
        `Cardholder-related factors represent ${responsibility.cardholder_percent.toFixed(1)}% of decline attribution, reflecting account status, authentication patterns, and transaction limit characteristics. These patterns indicate normal cardholder behavior in card-acquiring environments and suggest opportunities for customer engagement and education.`,
      severity: 'Low',
      action_area: 'Customer Communication'
    });
  } else if (responsibility.cardholder_percent > 15) {
    insights.push({
      title: 'Cardholder Factors as Secondary Decline Component',
      description:
        `Cardholder behavior and account factors account for ${responsibility.cardholder_percent.toFixed(1)}% of declines, including insufficient funds, authentication challenges, and card status. These represent normal operational characteristics.`,
      severity: 'Low',
      action_area: 'Customer Communication'
    });
  }

  // 4. SPECIFIC DECLINE PATTERN INSIGHTS - Descriptive, not evaluative
  if (failures.length > 0) {
    const topDecline = failures[0];
    const topEntry = getDeclineEntry(topDecline.description);

    if (topEntry && topDecline.volume && totalVolume > 0) {
      const topPercent = (topDecline.volume / totalVolume) * 100;
      if (topPercent > 20) {
        insights.push({
          title: `${topDecline.description} as Primary Decline Driver`,
          description: `"${topDecline.description}" represents ${topPercent.toFixed(1)}% of decline volume, indicating this as a primary focus area for issuer coordination and authorization policy alignment.`,
          severity: topEntry.severity_score >= 4 ? 'Medium' : 'Low',
          action_area: 'Issuer Coordination'
        });
      }
    }
  }

  // 5. CHANNEL-SPECIFIC INSIGHTS - Professional, descriptive
  if (channelType === 'IPG') {
    const auth3DS = failures.find(f => f.description && f.description.toLowerCase().includes('3ds'));
    const authFail = failures.find(f => f.description && f.description.toLowerCase().includes('authentication'));
    if (auth3DS || authFail) {
      insights.push({
        title: 'Internet Payment Gateway Authentication Patterns',
        description: `IPG transactions demonstrate authentication challenges as a component of decline patterns, reflecting device compatibility, browser characteristics, and 3DS implementation dynamics typical in internet payment environments.`,
        severity: 'Low',
        action_area: 'IPG Operations'
      });
    }
  }

  // 6. NETWORK FACTORS INSIGHT
  if (responsibility.network_percent > 12) {
    insights.push({
      title: 'Network and Scheme-Level Factor Contribution',
      description: `Network and scheme-level factors contribute ${responsibility.network_percent.toFixed(1)}% to overall decline patterns, reflecting standard inter-bank processing dynamics and scheme coordination characteristics.`,
      severity: 'Low',
      action_area: 'Network Coordination'
    });
  }

  return insights.slice(0, 8);
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
