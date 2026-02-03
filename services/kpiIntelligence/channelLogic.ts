/**
 * Channel-Specific Intelligence Logic
 * Implements POS, ATM, and IPG-specific analysis and patterns
 */

import { StandardizedDecline, ReportType, ReportData } from '../../types';
import { getDeclineEntry } from './declineKnowledgeBase';
import { ResponsibilityDistribution } from './responsibilityModel';

export interface ChannelIntelligence {
  channel: ReportType;
  specific_patterns: string[];
  risk_areas: string[];
  optimization_opportunities: string[];
  performance_indicators: Record<string, number | string>;
}

/**
 * Analyze channel-specific patterns and behaviors
 */
export function analyzeChannelSpecificPatterns(
  reportData: ReportData,
  responsibility: ResponsibilityDistribution,
  channelType: ReportType
): ChannelIntelligence {
  const patterns: string[] = [];
  const riskAreas: string[] = [];
  const opportunities: string[] = [];
  const indicators: Record<string, number | string> = {
    channel: channelType,
    success_rate: `${reportData.successRate.toFixed(2)}%`,
    failure_rate: `${reportData.failureRate.toFixed(2)}%`,
    total_transactions: reportData.totalTransactions
  };

  if (channelType === 'POS') {
    analyzePOSPatterns(reportData, responsibility, patterns, riskAreas, opportunities, indicators);
  } else if (channelType === 'ATM') {
    analyzeATMPatterns(reportData, responsibility, patterns, riskAreas, opportunities, indicators);
  } else if (channelType === 'IPG') {
    analyzeIPGPatterns(reportData, responsibility, patterns, riskAreas, opportunities, indicators);
  }

  return {
    channel: channelType,
    specific_patterns: patterns,
    risk_areas: riskAreas,
    optimization_opportunities: opportunities,
    performance_indicators: indicators
  };
}

/**
 * POS-Specific Analysis
 */
function analyzePOSPatterns(
  reportData: ReportData,
  responsibility: ResponsibilityDistribution,
  patterns: string[],
  riskAreas: string[],
  opportunities: string[],
  indicators: Record<string, number | string>
) {
  patterns.push('Point-of-sale transactions reflect merchant behavior, terminal capabilities, and real-time authorization.');

  // Merchant configuration
  if (responsibility.merchant_percent > 15) {
    patterns.push('Merchant terminal configuration and integration practices significantly influence decline patterns.');
    riskAreas.push('Terminal firmware currency and configuration standards');
    riskAreas.push('EMV chip and contactless transaction handling');
  }

  // EMV/Chip patterns
  const chipErrors = reportData.businessFailures?.find(f => f.description?.toLowerCase().includes('chip'));
  if (chipErrors && chipErrors.volume) {
    const chipPercent = (chipErrors.volume / responsibility.total_decline_volume) * 100;
    if (chipPercent > 5) {
      patterns.push(`EMV chip-related issues account for ${chipPercent.toFixed(1)}% of declines.`);
      riskAreas.push('Terminal chip reader compatibility and maintenance');
      opportunities.push('Implement chip reader diagnostic and replacement programs');
    }
  }

  // Velocity/fraud patterns
  if (responsibility.issuer_percent > 55) {
    patterns.push('Issuer fraud monitoring and velocity rules drive a majority of POS declines.');
    opportunities.push('Coordinate with issuers on velocity rule calibration to reduce false declines');
  }

  // Contactless
  if (reportData.successRate > 98) {
    patterns.push('High success rate suggests effective contactless and chip transaction processing.');
    indicators['contactless_impact'] = 'Positive (likely enabled)';
  }

  // MCC patterns
  patterns.push('Merchant category (MCC) and transaction type influence issuer risk scoring and authorization outcomes.');
  opportunities.push('Analyze MCC-specific decline patterns to identify high-risk merchant categories');

  indicators['primary_risk_driver'] = 'Issuer Authorization & Configuration';
  indicators['key_success_factor'] = 'Terminal Management & Merchant Training';
}

/**
 * ATM-Specific Analysis
 */
function analyzeATMPatterns(
  reportData: ReportData,
  responsibility: ResponsibilityDistribution,
  patterns: string[],
  riskAreas: string[],
  opportunities: string[],
  indicators: Record<string, number | string>
) {
  patterns.push('ATM transactions involve real-time cardholder authentication (PIN) and issuer authorization.');

  // PIN patterns
  const pinErrors = reportData.businessFailures?.find(f => f.description?.toLowerCase().includes('pin'));
  if (pinErrors && pinErrors.volume) {
    const pinPercent = (pinErrors.volume / responsibility.total_decline_volume) * 100;
    patterns.push(`PIN-related declines represent ${pinPercent.toFixed(1)}% of ATM transactions.`);
    if (pinPercent > 15) {
      riskAreas.push('High cardholder PIN entry error rate');
      opportunities.push('Enhance ATM screen guidance and retry logic');
    }
  }

  // Withdrawal limits
  const insufficientFunds = reportData.businessFailures?.find(f =>
    f.description?.toLowerCase().includes('insufficient')
  );
  if (insufficientFunds && insufficientFunds.volume) {
    const ifPercent = (insufficientFunds.volume / responsibility.total_decline_volume) * 100;
    if (ifPercent > 20) {
      patterns.push(`Insufficient funds declines represent ${ifPercent.toFixed(1)}% of transactions.`);
      indicators['cardholder_liquidity_impact'] = 'Significant';
    }
  }

  // Host availability
  const hostDown = reportData.technicalFailures?.find(f => f.description?.toLowerCase().includes('inoperative'));
  if (hostDown && hostDown.volume) {
    const hostPercent = (hostDown.volume / responsibility.total_decline_volume) * 100;
    if (hostPercent > 5) {
      riskAreas.push('Issuer host unavailability during transaction processing');
      opportunities.push('Strengthen issuer-acquirer SLA agreements on host availability');
    }
  }

  // Network connectivity
  if (responsibility.network_percent > 15) {
    patterns.push('Network and scheme connectivity impact ATM transaction routing and authorization.');
    opportunities.push('Implement redundant network paths and failover mechanisms');
  }

  indicators['primary_risk_driver'] = 'Cardholder Behavior & Host Availability';
  indicators['key_success_factor'] = 'Network Reliability & Issuer Coordination';
}

/**
 * IPG-Specific Analysis
 */
function analyzeIPGPatterns(
  reportData: ReportData,
  responsibility: ResponsibilityDistribution,
  patterns: string[],
  riskAreas: string[],
  opportunities: string[],
  indicators: Record<string, number | string>
) {
  patterns.push(
    'Internet Payment Gateway transactions involve multi-layer authentication (3DS), merchant integration, and cardholder device behavior.'
  );

  // 3DS authentication
  const auth3DS = reportData.businessFailures?.find(f => f.description?.toLowerCase().includes('3ds'));
  if (auth3DS && auth3DS.volume) {
    const auth3DSPercent = (auth3DS.volume / responsibility.total_decline_volume) * 100;
    patterns.push(`3D Secure authentication failures account for ${auth3DSPercent.toFixed(1)}% of IPG declines.`);
    if (auth3DSPercent > 8) {
      riskAreas.push('3D Secure authentication friction and cardholder abandonment');
      opportunities.push('Optimize 3DS UX and issuer ACS integration');
      indicators['3ds_friction_level'] = 'High';
    }
  }

  // Gateway timeout/performance
  const timeout = reportData.businessFailures?.find(f => f.description?.toLowerCase().includes('timeout'));
  if (timeout && timeout.volume) {
    const timeoutPercent = (timeout.volume / responsibility.total_decline_volume) * 100;
    if (timeoutPercent > 4) {
      patterns.push(`Gateway processing timeouts account for ${timeoutPercent.toFixed(1)}% of declines.`);
      riskAreas.push('Gateway latency and processing performance');
      opportunities.push('Optimize gateway infrastructure and third-party integrations');
      indicators['gateway_performance'] = 'Needs Optimization';
    }
  }

  // Merchant configuration
  const merchantConfig = reportData.businessFailures?.find(f => f.description?.toLowerCase().includes('merchant'));
  if (merchantConfig && merchantConfig.volume) {
    const merchantPercent = (merchantConfig.volume / responsibility.total_decline_volume) * 100;
    if (merchantPercent > 8) {
      patterns.push(`Merchant configuration issues contribute ${merchantPercent.toFixed(1)}% of declines.`);
      riskAreas.push('Merchant API integration and credential management');
      opportunities.push('Enhance merchant onboarding and integration validation');
    }
  }

  // Device/browser factors
  if (responsibility.cardholder_percent > 25) {
    patterns.push('Cardholder device and browser behavior significantly impacts IPG transaction success.');
    opportunities.push('Develop browser compatibility matrix and device fingerprinting analysis');
    indicators['device_compatibility_factor'] = 'Moderate-to-High';
  }

  // Fraud detection
  if (responsibility.network_percent > 20) {
    patterns.push('Network-level fraud controls (3DS, tokenization) play a substantial role in IPG authorization.');
  }

  indicators['primary_risk_driver'] = 'Authentication & Merchant Integration';
  indicators['key_success_factor'] = 'Cardholder Experience & Gateway Performance';
}
