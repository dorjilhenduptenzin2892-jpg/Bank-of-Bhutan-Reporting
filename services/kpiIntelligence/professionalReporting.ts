/**
 * Professional Banking Reporting Engine
 * Generates Tier-1 bank quality, regulator-ready KPI reports
 * Implements formal, neutral banking language and professional standards
 */

import { ReportData, ReportType } from '../../types';
import { ResponsibilityDistribution } from './responsibilityModel';
import { getDeclineEntry } from './declineKnowledgeBase';
import { Insight } from './insightEngine';
import { Recommendation } from './recommendationEngine';

/**
 * Complete professional report structure
 */
export interface ProfessionalReport {
  executive_overview: string;
  transaction_performance_snapshot: TransactionSnapshot;
  business_decline_profile: DeclineProfile;
  technical_decline_profile: DeclineProfile;
  responsibility_distribution_analysis: ResponsibilityAnalysis;
  key_analytical_insights: string[];
  strategic_observations: string;
  recommendations_summary: RecommendationsSummary;
  regulator_executive_summary: string;
}

export interface TransactionSnapshot {
  period_covered: string;
  success_rate_percent: number;
  failure_rate_percent: number;
  key_observations: string;
}

export interface DeclineProfile {
  key_drivers: string;
  contribution_analysis: string;
  interpretative_insight: string;
}

export interface ResponsibilityAnalysis {
  summary: string;
  entities: Array<{ name: string; percentage: number; description: string; examples?: { description: string; volume: number }[] }>;
  assessment: string;
}

export interface RecommendationsSummary {
  priority_focus_areas: string[];
  continuous_improvement_areas: string[];
}

/**
 * Generate professional, regulator-ready report
 */
export function generateProfessionalReport(
  reportData: ReportData,
  responsibility: ResponsibilityDistribution,
  insights: Insight[],
  recommendations: Recommendation[],
  channelType: ReportType
): ProfessionalReport {
  const channelLabel = getChannelLabel(channelType);

  return {
    executive_overview: generateExecutiveOverview(reportData, channelType),
    transaction_performance_snapshot: generateTransactionSnapshot(reportData),
    business_decline_profile: generateBusinessDeclineProfile(reportData, channelType),
    technical_decline_profile: generateTechnicalDeclineProfile(reportData, responsibility),
    responsibility_distribution_analysis: generateResponsibilityAnalysis(responsibility, [...(reportData.businessFailures || []), ...(reportData.technicalFailures || [])]),
    key_analytical_insights: generateKeyInsights(insights, responsibility, reportData, channelType),
    strategic_observations: generateStrategicObservations(reportData, responsibility, insights, channelType),
    recommendations_summary: generateRecommendationsSummary(recommendations),
    regulator_executive_summary: generateRegulatorSummary(reportData, responsibility, channelType)
  };
}

/**
 * Executive Overview - High-level summary for all stakeholders
 */
function generateExecutiveOverview(reportData: ReportData, channelType: ReportType): string {
  const channelLabel = getChannelLabel(channelType);
  const successRate = reportData.successRate || 0;

  const performance = successRate >= 97
    ? `demonstrates robust transaction processing with strong authorization success metrics`
    : successRate >= 95
    ? `maintains consistent transaction processing with acceptable authorization success rates`
    : successRate >= 92
    ? `reflects stable transaction processing across operational parameters`
    : `operates within functional parameters with opportunity for optimization`;

  return `${channelLabel} acquiring operations during the ${reportData.dateRange} period ${performance}. The decline profile is characterized by patterns consistent with typical card-acquiring environments, reflecting the interaction of issuer authorization policies, cardholder transaction behavior, and network-level factors. Infrastructure stability remains within expected operational ranges.`;
}

/**
 * Transaction Performance Snapshot
 */
function generateTransactionSnapshot(reportData: ReportData): TransactionSnapshot {
  const successRate = reportData.successRate || 0;
  const failureRate = reportData.failureRate || 0;

  let observations = '';
  if (successRate >= 97) {
    observations = `Transaction processing demonstrates strong authorization success. Decline patterns remain well-distributed across multiple factors.`;
  } else if (successRate >= 95) {
    observations = `Transaction processing reflects normal operational patterns. Decline composition indicates stable acquiring environment.`;
  } else {
    observations = `Transaction processing continues within operational parameters. Decline drivers are primarily issuer-driven and cardholder-related.`;
  }

  return {
    period_covered: reportData.dateRange,
    success_rate_percent: successRate,
    failure_rate_percent: failureRate,
    key_observations: observations
  };
}

/**
 * Business Decline Profile - Professional analysis of business-level declines
 */
function generateBusinessDeclineProfile(reportData: ReportData, channelType: ReportType): DeclineProfile {
  const businessFailures = reportData.businessFailures || [];
  const totalFailures = (reportData.businessFailures || []).length + (reportData.technicalFailures || []).length;
  const totalDeclineVolume = businessFailures.reduce((sum, f) => sum + (f.volume || 0), 0);

  // Number of drivers to show: IPG requires up to 10, others default to 3
  const numDrivers = channelType === 'IPG' ? 10 : 3;

  // Top drivers (up to numDrivers)
  const topDrivers = businessFailures.slice(0, numDrivers)
    .map(f => `${f.description} (${f.volume} transactions)`)
    .join('; ');

  const businessPercent = totalDeclineVolume / Math.max(1, reportData.totalTransactions || 1) * 100;

  const keyDrivers = businessFailures.length > 0
    ? `Primary business decline drivers include: ${topDrivers}. These reflect standard authorization and account management factors in acquiring environments.`
    : `Business decline patterns remain minimal with diverse contributing factors.`;

  const contribution = businessFailures.length > 0
    ? `Business declines account for approximately ${businessPercent.toFixed(1)}% of total transaction volume, representing normal operational decline distribution patterns.`
    : `Business decline volume remains low, indicating effective authorization processes.`;

  const interpretativeInsight = `Business decline drivers are primarily attributable to issuer authorization policies (account status verification, fraud controls, velocity limits) and cardholder account factors (insufficient funds, incorrect PIN entries, card expiration). These patterns are consistent with typical acquiring environments and indicate normal operational characteristics rather than system-level concerns.`;

  return {
    key_drivers: keyDrivers,
    contribution_analysis: contribution,
    interpretative_insight: interpretativeInsight
  };
}

/**
 * Technical Decline Profile - Professional analysis of technical declines
 */
function generateTechnicalDeclineProfile(reportData: ReportData, responsibility: ResponsibilityDistribution): DeclineProfile {
  const technicalFailures = reportData.technicalFailures || [];
  const totalDeclineVolume = responsibility.total_decline_volume || 1;
  const techDeclineVolume = technicalFailures.reduce((sum, f) => sum + (f.volume || 0), 0);
  const techPercent = (techDeclineVolume / Math.max(1, totalDeclineVolume)) * 100;

  // Top drivers
  const topDrivers = technicalFailures.slice(0, 3)
    .map(f => `${f.description} (${f.volume} transactions)`)
    .join('; ');

  const keyDrivers = technicalFailures.length > 0
    ? `Primary technical decline drivers include: ${topDrivers}. These reflect host availability, network connectivity, and processing environment characteristics.`
    : `Technical declines remain at minimal levels, indicating robust infrastructure stability.`;

  const contribution = `Technical declines represent ${techPercent.toFixed(1)}% of transaction failures, indicating ${techPercent < 15 ? 'a stable and reliable processing infrastructure' : techPercent < 25 ? 'generally stable infrastructure with opportunity for optimization' : 'infrastructure elements requiring operational review'}.`;

  const infrastructureStatus = techPercent < 15
    ? `Processing environment demonstrates reliable host connectivity, effective network availability, and stable gateway operations. Technical decline levels are well within normal operational parameters.`
    : techPercent < 25
    ? `Processing infrastructure operates within acceptable parameters. Infrastructure monitoring and configuration optimization present opportunities to further stabilize technical decline rates.`
    : `Infrastructure monitoring and configuration review are recommended to optimize technical processing characteristics and host/network availability metrics.`;

  return {
    key_drivers: keyDrivers,
    contribution_analysis: contribution,
    interpretative_insight: infrastructureStatus
  };
}

/**
 * Responsibility Distribution Analysis
 */
function generateResponsibilityAnalysis(responsibility: ResponsibilityDistribution, failures: Array<{ description: string; volume?: number }>): ResponsibilityAnalysis {
  // Helper to encode SVG to base64
  function encodeBase64(str: string): string {
    try {
      if (typeof btoa === 'function') {
        return btoa(unescape(encodeURIComponent(str)));
      }
    } catch (e) {
      // fall through to Buffer
    }
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (typeof Buffer !== 'undefined') return Buffer.from(str).toString('base64');
    } catch (e) {
      // no-op
    }
    return '';
  }

  const entities: Array<{ name: string; percentage: number; description: string; examples?: { description: string; volume: number }[]; pie_svg?: string }> = [];

  if (responsibility.issuer_percent > 0) {
    entities.push({
      name: 'Issuer Authorization Decisions',
      percentage: responsibility.issuer_percent,
      description: 'Authorization policies, fraud controls, account status management, and velocity rules',
      examples: []
    });
  }

  if (responsibility.cardholder_percent > 0) {
    entities.push({
      name: 'Cardholder Behavior & Account Status',
      percentage: responsibility.cardholder_percent,
      description: 'Insufficient funds, incorrect authentication, expired cards, and account mismanagement',
      examples: []
    });
  }

  if (responsibility.network_percent > 0) {
    entities.push({
      name: 'Network & Scheme Factors',
      percentage: responsibility.network_percent,
      description: 'Scheme-level rules, network connectivity, and interchange coordination',
      examples: []
    });
  }

  if (responsibility.merchant_percent > 0) {
    entities.push({
      name: 'Merchant Integration & Configuration',
      percentage: responsibility.merchant_percent,
      description: 'Terminal setup, MCC classification, transaction data formatting, and integration standards',
      examples: []
    });
  }

  if (responsibility.acquirer_percent > 0) {
    entities.push({
      name: 'Acquirer & Processing Infrastructure',
      percentage: responsibility.acquirer_percent,
      description: 'Gateway operations, host availability, processing rules, and system configuration',
      examples: []
    });
  }

  if (responsibility.external_percent > 0) {
    entities.push({
      name: 'External & Environmental Factors',
      percentage: responsibility.external_percent,
      description: 'Network latency, third-party service availability, and external system dependencies',
      examples: []
    });
  }

  const summary = `Decline causation analysis indicates responsibility distribution across multiple acquiring ecosystem entities:`;

  // Map failures to dominant entity examples (collect volumes)
  const entityKeyMap = {
    issuer: 0,
    cardholder: 1,
    network: 2,
    merchant: 3,
    acquirer: 4,
    external: 5
  } as Record<string, number>;

  (failures || []).forEach(f => {
    const entry = getDeclineEntry(f.description || '');
    const weights = [
      { key: 'issuer', v: entry.issuer_weight },
      { key: 'cardholder', v: entry.cardholder_weight },
      { key: 'network', v: entry.network_weight },
      { key: 'merchant', v: entry.merchant_weight },
      { key: 'acquirer', v: entry.acquirer_weight },
      { key: 'external', v: entry.external_weight }
    ];
    weights.sort((a, b) => b.v - a.v);
    const dominant = weights[0].key;
    const idx = entityKeyMap[dominant];
    if (idx !== undefined && entities[idx]) {
      const list = entities[idx].examples || (entities[idx].examples = []);
      const volume = f.volume || 0;
      const existing = list.find(x => x.description === f.description);
      if (existing) {
        existing.volume = Math.max(existing.volume, volume);
      } else {
        list.push({ description: f.description, volume });
      }
    }
  });

  // Limit examples per entity 
  entities.forEach(e => {
    if (e.examples && e.examples.length > 10) e.examples = e.examples.slice(0, 10);
  });

  const assessment = responsibility.issuer_percent > 50
    ? `Issuer-driven factors represent the primary component of decline attribution, reflecting the significant role of issuer authorization policies and risk management strategies in transaction processing outcomes. This distribution is typical in international and domestic acquiring environments.`
    : `Decline attribution is distributed across issuer policies, cardholder factors, and processing environment characteristics, representing a balanced operational profile consistent with typical acquiring patterns.`;

  return {
    summary,
    entities,
    assessment
  };
}

/**
 * Key Analytical Insights - 6-8 professional insights
 */
function generateKeyInsights(
  insights: Insight[],
  responsibility: ResponsibilityDistribution,
  reportData: ReportData,
  channelType: ReportType
): string[] {
  const professional_insights: string[] = [];

  // 1. Issuer-driven insight
  if (responsibility.issuer_percent > 40) {
    professional_insights.push(
      `Issuer-driven authorization decisions represent ${responsibility.issuer_percent.toFixed(1)}% of decline causation, reflecting the dominant role of issuer fraud controls, account verification policies, and velocity management in transaction processing outcomes.`
    );
  }

  // 2. Cardholder insight
  if (responsibility.cardholder_percent > 15) {
    professional_insights.push(
      `Cardholder-related factors account for ${responsibility.cardholder_percent.toFixed(1)}% of declines, including account status, authentication challenges, and transaction limit patterns. These reflect normal cardholder behavior in card-acquiring environments.`
    );
  }

  // 3. Technical stability insight
  const techDeclineVolume = (reportData.technicalFailures || []).reduce((s, f) => s + (f.volume || 0), 0);
  const techPercent = (techDeclineVolume / Math.max(1, responsibility.total_decline_volume)) * 100;
  if (techPercent < 15) {
    professional_insights.push(
      `Technical decline levels remain contained within normal operational ranges at ${techPercent.toFixed(1)}%, indicating stable infrastructure, reliable host connectivity, and effective processing environment management.`
    );
  }

  // 4. Network insight
  if (responsibility.network_percent > 10) {
    professional_insights.push(
      `Network and scheme-level factors contribute ${responsibility.network_percent.toFixed(1)}% to overall decline patterns, reflecting standard scheme coordination and inter-bank processing dynamics.`
    );
  }

  // 5. Channel-specific insight
  if (channelType === 'POS') {
    professional_insights.push(
      `Point-of-sale transaction patterns demonstrate consistent merchant integration characteristics, with decline drivers aligned to authorization policies and cardholder account status factors.`
    );
  } else if (channelType === 'ATM') {
    professional_insights.push(
      `ATM transaction patterns reflect PIN verification protocols, withdrawal limit policies, and host availability characteristics typical of ATM networks.`
    );
  } else if (channelType === 'IPG') {
    professional_insights.push(
      `Internet payment gateway transactions demonstrate operational stability, with declines primarily driven by authentication mechanisms, device compatibility factors, and merchant integration standards.`
    );
  }

  // 6. Performance trend insight
  if (reportData.successRate >= 96) {
    professional_insights.push(
      `Transaction processing success metrics indicate a stable operational trajectory, with authorization patterns consistent with high-performing acquiring environments.`
    );
  }

  return professional_insights.slice(0, 6);
}

/**
 * Strategic Observations - Forward-looking, opportunity-focused commentary
 */
function generateStrategicObservations(
  reportData: ReportData,
  responsibility: ResponsibilityDistribution,
  insights: Insight[],
  channelType: ReportType
): string {
  const observations: string[] = [];

  // Issuer coordination opportunity
  if (responsibility.issuer_percent > 45) {
    observations.push(
      'Continued coordination with issuer institutions on fraud rule optimization, authorization policy alignment, and risk management configuration represents a substantial opportunity for enhanced transaction processing alignment.'
    );
  }

  // Cardholder engagement opportunity
  if (responsibility.cardholder_percent > 20) {
    observations.push(
      'Enhanced cardholder awareness programs addressing card usage optimization, authentication process understanding, and transaction limit awareness may contribute to improved authorization outcomes.'
    );
  }

  // Infrastructure optimization opportunity
  const techDeclineVolume = (reportData.technicalFailures || []).reduce((s, f) => s + (f.volume || 0), 0);
  const techPercent = (techDeclineVolume / Math.max(1, responsibility.total_decline_volume)) * 100;
  if (techPercent > 12) {
    observations.push(
      'Proactive infrastructure monitoring, host configuration optimization, and network performance analytics present opportunities for continued technical processing improvements.'
    );
  } else {
    observations.push(
      'Ongoing monitoring of infrastructure stability through current monitoring frameworks ensures sustained technical decline containment within optimal ranges.'
    );
  }

  // Network coordination
  if (responsibility.network_percent > 12) {
    observations.push(
      'Maintained engagement with network operators and scheme coordinators supports efficient scheme-level coordination and minimizes network-related processing variations.'
    );
  }

  // Merchant optimization (POS specific)
  if (channelType === 'POS' && responsibility.merchant_percent > 8) {
    observations.push(
      'Continued merchant integration standards review, terminal configuration optimization, and MCC classification validation support consistent point-of-sale processing performance.'
    );
  }

  return observations.join(' ');
}

/**
 * Recommendations Summary - Strategic, non-blaming recommendations
 */
function generateRecommendationsSummary(recommendations: Recommendation[]): RecommendationsSummary {
  const priorityFocusAreas: string[] = [];
  const continuousImprovementAreas: string[] = [];

  // Categorize recommendations
  recommendations.forEach(rec => {
    const formatted = `${rec.area}: ${rec.action}`;

    if (rec.priority === 'High') {
      priorityFocusAreas.push(formatted);
    } else {
      continuousImprovementAreas.push(formatted);
    }
  });

  return {
    priority_focus_areas: priorityFocusAreas.slice(0, 4),
    continuous_improvement_areas: continuousImprovementAreas.slice(0, 5)
  };
}

/**
 * Regulator Executive Summary - Tier-1 bank quality, compliant format
 */
function generateRegulatorSummary(reportData: ReportData, responsibility: ResponsibilityDistribution, channelType: ReportType): string {
  const channelLabel = getChannelLabel(channelType);
  const successRate = reportData.successRate || 0;
  const techDeclineVolume = responsibility.total_decline_volume ? 
    (reportData.technicalFailures || []).reduce((s, f) => s + (f.volume || 0), 0) / responsibility.total_decline_volume * 100 : 0;

  return `During the ${reportData.dateRange} period, ${channelLabel.toLowerCase()} acquiring operations demonstrated stable transaction processing characteristics. Overall authorization success rate achieved ${successRate.toFixed(2)}%, reflecting consistent operational performance within established parameters.

Decline patterns were primarily shaped by issuer authorization policies (${responsibility.issuer_percent.toFixed(1)}%), cardholder transaction behavior (${responsibility.cardholder_percent.toFixed(1)}%), and network-level factors (${responsibility.network_percent.toFixed(1)}%). Technical declines represented ${techDeclineVolume.toFixed(1)}% of total failures, indicating a stable processing infrastructure and reliable host/network connectivity.

Processing environment stability is evidenced by consistent authorization outcomes and contained technical decline levels. Observed decline trends are consistent with typical card-acquiring environments and reflect normal operational dynamics across issuer, cardholder, network, and acquiring ecosystem participants.

Ongoing monitoring and stakeholder coordination with issuer institutions, network operators, and merchant partners remain integral to sustaining efficient transaction processing and authorization success metrics. Current operational and infrastructure characteristics present a stable foundation for continued acquiring performance.`;
}

/**
 * Helper function to get channel label
 */
function getChannelLabel(channelType: ReportType): string {
  switch (channelType) {
    case 'POS':
      return 'Point-of-Sale (POS) Acquiring';
    case 'ATM':
      return 'ATM Acquiring';
    case 'IPG':
      return 'Internet Payment Gateway (IPG) Acquiring';
    default:
      return 'Card Acquiring';
  }
}
