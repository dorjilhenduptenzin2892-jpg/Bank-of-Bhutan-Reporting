/**
 * Recommendation Engine
 * Generates realistic, non-blaming recommendations across operational areas
 */

import { ReportData, ReportType } from '../../types';
import { ResponsibilityDistribution } from './responsibilityModel';

export interface Recommendation {
  area: string;
  priority: 'High' | 'Medium' | 'Low';
  action: string;
  rationale: string;
  stakeholders: string[];
}

/**
 * Generate recommendations based on decline patterns and responsibility distribution
 */
export function generateRecommendations(
  reportData: ReportData,
  responsibility: ResponsibilityDistribution,
  channelType: ReportType
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // 1. ISSUER COORDINATION
  if (responsibility.issuer_percent > 45) {
    recommendations.push({
      area: 'Issuer Coordination',
      priority: 'High',
      action:
        'Establish quarterly alignment sessions with key issuer partners to review decline patterns, fraud rules, and authorization policies. Focus on optimizing rule configurations to reduce false declines.',
      rationale: `Issuer decisions account for ${responsibility.issuer_percent.toFixed(1)}% of declines. Proactive coordination can improve cardholder experience without compromising fraud prevention.`,
      stakeholders: ['Acquiring Bank', 'Issuer Banks', 'Card Schemes']
    });
  }

  // 2. TECHNICAL OPTIMIZATION
  const techPercent = (reportData.technicalFailures?.reduce((s, f) => s + (f.volume || 0), 0) || 0) / Math.max(1, responsibility.total_decline_volume);
  if (techPercent > 0.15) {
    recommendations.push({
      area: 'Technical Operations',
      priority: 'High',
      action:
        'Conduct comprehensive audit of terminal configurations, gateway integration, and message formatting standards. Address identified gaps through merchant training and system optimization.',
      rationale: `Technical declines represent ${(techPercent * 100).toFixed(1)}% of failures. Systematic configuration review will improve processing stability.`,
      stakeholders: ['Acquiring Bank IT', 'Gateway Providers', 'Terminal Vendors', 'Merchants']
    });
  }

  // 3. CARDHOLDER COMMUNICATION
  if (responsibility.cardholder_percent > 20) {
    recommendations.push({
      area: 'Customer Communication',
      priority: 'Medium',
      action:
        'Develop cardholder awareness campaigns on PIN security, transaction limits, account status management, and authentication processes. Distribute through issuer networks and merchant channels.',
      rationale: `Cardholder-related factors account for ${responsibility.cardholder_percent.toFixed(1)}% of declines. Education initiatives reduce preventable declines.`,
      stakeholders: ['Issuer Banks', 'Acquiring Bank Marketing', 'Merchants']
    });
  }

  // 4. MERCHANT INTEGRATION
  if (responsibility.merchant_percent > 15) {
    recommendations.push({
      area: 'Merchant Management',
      priority: 'Medium',
      action:
        'Enhance merchant and IPG integration standards through standardized onboarding, certification programs, and periodic validation. Provide technical support and best practice documentation.',
      rationale: `Merchant configuration factors contribute ${responsibility.merchant_percent.toFixed(1)}% of declines. Standardization and support reduce integration-related failures.`,
      stakeholders: ['Acquiring Bank', 'Merchants', 'Gateway Providers', 'Integrators']
    });
  }

  // 5. NETWORK MONITORING
  if (responsibility.network_percent > 12) {
    recommendations.push({
      area: 'Network Coordination',
      priority: 'Medium',
      action:
        'Establish proactive monitoring of scheme-level validation rules, routing changes, and network communications. Maintain regular liaison with card scheme technical representatives.',
      rationale: `Network-level factors account for ${responsibility.network_percent.toFixed(1)}% of declines. Coordinated monitoring enables rapid response to scheme changes.`,
      stakeholders: ['Acquiring Bank', 'Card Schemes', 'Network Operators']
    });
  }

  // 6. EXTERNAL INFRASTRUCTURE
  if (responsibility.external_percent > 8) {
    recommendations.push({
      area: 'External Infrastructure',
      priority: 'Medium',
      action:
        'Strengthen SLA agreements and connectivity monitoring with external service providers. Implement failover and redundancy measures to minimize external dependency impacts.',
      rationale: `External factors contribute ${responsibility.external_percent.toFixed(1)}% of declines. Infrastructure resilience reduces external exposure.`,
      stakeholders: ['Acquiring Bank IT', 'Network Operators', 'External Service Providers']
    });
  }

  // CHANNEL-SPECIFIC RECOMMENDATIONS

  // IPG-Specific
  if (channelType === 'IPG') {
    const auth3DS = reportData.businessFailures?.find(f => f.description?.toLowerCase().includes('3ds'));
    if (auth3DS && auth3DS.volume && (auth3DS.volume / responsibility.total_decline_volume) > 0.08) {
      recommendations.push({
        area: 'IPG Authentication',
        priority: 'High',
        action:
          'Review 3D Secure implementation with issuer partners. Optimize ACS (Access Control Server) integration and strengthen cardholder authentication UX to reduce friction.',
        rationale:
          '3D Secure failures represent a notable IPG decline source. Enhanced coordination with issuers improves authentication success rates.',
        stakeholders: ['Acquiring Bank', 'Issuer Banks', 'Payment Gateways', 'Merchants']
      });
    }

    const gatewayTimeout = reportData.businessFailures?.find(f =>
      f.description?.toLowerCase().includes('timeout')
    );
    if (gatewayTimeout && gatewayTimeout.volume && (gatewayTimeout.volume / responsibility.total_decline_volume) > 0.04) {
      recommendations.push({
        area: 'Gateway Performance',
        priority: 'Medium',
        action:
          'Analyze gateway processing latency, database performance, and third-party API integration times. Implement caching, load balancing, and performance optimization.',
        rationale:
          'Gateway timeouts degrade cardholder experience and increase decline rates. Performance tuning reduces timeout-related failures.',
        stakeholders: ['Acquiring Bank IT', 'Gateway Providers', 'Merchants']
      });
    }
  }

  // ATM-Specific
  if (channelType === 'ATM') {
    const pinErrors = reportData.businessFailures?.find(f => f.description?.toLowerCase().includes('pin'));
    if (pinErrors && pinErrors.volume && (pinErrors.volume / responsibility.total_decline_volume) > 0.12) {
      recommendations.push({
        area: 'ATM Customer Experience',
        priority: 'Low',
        action:
          'Enhance ATM screen prompts and user guidance for PIN entry. Consider implementing PIN retry limits and cardholder notifications in accordance with security standards.',
        rationale:
          'PIN-related declines are largely cardholder-driven but can be mitigated through improved terminal UX and user guidance.',
        stakeholders: ['ATM Operators', 'Issuer Banks', 'Acquiring Bank']
      });
    }
  }

  // POS-Specific
  if (channelType === 'POS') {
    recommendations.push({
      area: 'Terminal Management',
      priority: 'Medium',
      action:
        'Conduct regular certification and training for merchant staff on terminal operation, EMV chip processing, and contactless transaction handling. Ensure firmware and configuration are current.',
      rationale:
        'Terminal configuration and merchant training reduce processing errors and improve cardholder experience at the point of sale.',
      stakeholders: ['Acquiring Bank', 'Terminal Vendors', 'Merchants']
    });
  }

  // CONTINUOUS MONITORING
  recommendations.push({
    area: 'Continuous Monitoring',
    priority: 'High',
    action:
      'Implement automated decline pattern monitoring and alert systems. Schedule monthly KPI reviews and quarterly decline trend analysis with stakeholders.',
    rationale: 'Proactive monitoring enables rapid detection and response to emerging issues, minimizing impact on transaction processing.',
    stakeholders: ['Acquiring Bank', 'All Stakeholders']
  });

  return recommendations;
}

/**
 * Prioritize recommendations by impact and stakeholder alignment
 */
export function prioritizeRecommendations(recommendations: Recommendation[]): Recommendation[] {
  const priorityRank = { High: 0, Medium: 1, Low: 2 };
  return [...recommendations].sort(
    (a, b) =>
      priorityRank[a.priority as keyof typeof priorityRank] -
      priorityRank[b.priority as keyof typeof priorityRank]
  );
}
