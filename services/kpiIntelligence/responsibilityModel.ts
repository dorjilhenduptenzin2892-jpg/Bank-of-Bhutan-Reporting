/**
 * Responsibility Weight Model
 * Calculates distributed responsibility across entities for decline patterns
 */

import { StandardizedDecline, ReportData } from '../../types';
import { getDeclineEntry } from './declineKnowledgeBase';

export interface ResponsibilityDistribution {
  issuer_percent: number;
  acquirer_percent: number;
  network_percent: number;
  cardholder_percent: number;
  merchant_percent: number;
  external_percent: number;
  total_decline_volume: number;
  narrative: string;
}

export interface EntityResponsibility {
  entity: string;
  percentage: number;
  volume: number;
  contribution: string;
}

/**
 * Calculate responsibility distribution from decline data
 */
export function calculateResponsibilityDistribution(
  failures: StandardizedDecline[],
  totalVolume: number
): ResponsibilityDistribution {
  if (!failures || failures.length === 0) {
    return {
      issuer_percent: 0,
      acquirer_percent: 0,
      network_percent: 0,
      cardholder_percent: 0,
      merchant_percent: 0,
      external_percent: 0,
      total_decline_volume: 0,
      narrative: 'No decline data available for analysis.'
    };
  }

  // Calculate weighted sums
  let issuerSum = 0;
  let acquirerSum = 0;
  let networkSum = 0;
  let cardholderSum = 0;
  let merchantSum = 0;
  let externalSum = 0;
  let totalDeclineVolume = 0;

  failures.forEach(decline => {
    const volume = decline.volume || 0;
    const entry = getDeclineEntry(decline.description);

    issuerSum += volume * entry.issuer_weight;
    acquirerSum += volume * entry.acquirer_weight;
    networkSum += volume * entry.network_weight;
    cardholderSum += volume * entry.cardholder_weight;
    merchantSum += volume * entry.merchant_weight;
    externalSum += volume * entry.external_weight;
    totalDeclineVolume += volume;
  });

  const divisor = Math.max(1, totalDeclineVolume);

  const issuer_percent = (issuerSum / divisor) * 100;
  const acquirer_percent = (acquirerSum / divisor) * 100;
  const network_percent = (networkSum / divisor) * 100;
  const cardholder_percent = (cardholderSum / divisor) * 100;
  const merchant_percent = (merchantSum / divisor) * 100;
  const external_percent = (externalSum / divisor) * 100;

  // Generate narrative
  const narrative = generateResponsibilityNarrative(
    issuer_percent,
    acquirer_percent,
    network_percent,
    cardholder_percent,
    merchant_percent,
    external_percent
  );

  return {
    issuer_percent: Math.round(issuer_percent * 10) / 10,
    acquirer_percent: Math.round(acquirer_percent * 10) / 10,
    network_percent: Math.round(network_percent * 10) / 10,
    cardholder_percent: Math.round(cardholder_percent * 10) / 10,
    merchant_percent: Math.round(merchant_percent * 10) / 10,
    external_percent: Math.round(external_percent * 10) / 10,
    total_decline_volume: totalDeclineVolume,
    narrative
  };
}

/**
 * Generate ranked list of responsible entities
 */
export function getRankedEntities(dist: ResponsibilityDistribution): EntityResponsibility[] {
  return [
    {
      entity: 'Issuer (Authorization)',
      percentage: dist.issuer_percent,
      volume: Math.round(dist.total_decline_volume * (dist.issuer_percent / 100)),
      contribution: getContributionLabel(dist.issuer_percent)
    },
    {
      entity: 'Cardholder Behavior',
      percentage: dist.cardholder_percent,
      volume: Math.round(dist.total_decline_volume * (dist.cardholder_percent / 100)),
      contribution: getContributionLabel(dist.cardholder_percent)
    },
    {
      entity: 'Network/Scheme',
      percentage: dist.network_percent,
      volume: Math.round(dist.total_decline_volume * (dist.network_percent / 100)),
      contribution: getContributionLabel(dist.network_percent)
    },
    {
      entity: 'Acquirer/Terminal',
      percentage: dist.acquirer_percent,
      volume: Math.round(dist.total_decline_volume * (dist.acquirer_percent / 100)),
      contribution: getContributionLabel(dist.acquirer_percent)
    },
    {
      entity: 'External Infrastructure',
      percentage: dist.external_percent,
      volume: Math.round(dist.total_decline_volume * (dist.external_percent / 100)),
      contribution: getContributionLabel(dist.external_percent)
    },
    {
      entity: 'Merchant/Integration',
      percentage: dist.merchant_percent,
      volume: Math.round(dist.total_decline_volume * (dist.merchant_percent / 100)),
      contribution: getContributionLabel(dist.merchant_percent)
    }
  ].filter(e => e.percentage > 0).sort((a, b) => b.percentage - a.percentage);
}

/**
 * Generate human-readable narrative from responsibility percentages
 */
function generateResponsibilityNarrative(
  issuer: number,
  acquirer: number,
  network: number,
  cardholder: number,
  merchant: number,
  external: number
): string {
  const lines: string[] = [];

  if (issuer > 45) {
    lines.push(
      'Issuer-side authorization decisions constitute the primary share of transaction rejections, which is typical in card-acquiring environments.'
    );
  }

  if (cardholder > 25) {
    lines.push('Cardholder-related factors (e.g., insufficient funds, authentication) represent a substantial portion of declines.');
  }

  if (network > 15) {
    lines.push('Network and scheme-level factors contribute materially to the observed decline rate.');
  }

  if (acquirer > 20) {
    lines.push('Acquirer and terminal-related factors, including configuration and integration, play a notable role.');
  }

  if (external > 10) {
    lines.push('External infrastructure and connectivity issues account for a secondary but measurable share of declines.');
  }

  if (merchant > 15) {
    lines.push('Merchant integration and configuration factors contribute to the overall decline profile.');
  }

  if (lines.length === 0) {
    lines.push('Decline distribution reflects normal patterns across multiple operational entities.');
  }

  return lines.join(' ');
}

/**
 * Convert percentage to descriptive label
 */
function getContributionLabel(percent: number): string {
  if (percent === 0) return 'Not applicable';
  if (percent < 5) return 'Minimal';
  if (percent < 15) return 'Minor';
  if (percent < 30) return 'Moderate';
  if (percent < 50) return 'Significant';
  return 'Dominant';
}
