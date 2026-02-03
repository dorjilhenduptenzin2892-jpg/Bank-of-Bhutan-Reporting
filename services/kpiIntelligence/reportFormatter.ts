/**
 * KPI Intelligence Report Formatter
 * Formats KPI reports for display in React components
 */

import { KPIIntelligenceReport } from './index';

export interface FormattedKPIReport {
  summary_section: {
    title: string;
    key_metrics: Record<string, string | number>;
    assessment: string;
  };
  responsibility_section: {
    title: string;
    distribution: Array<{ entity: string; percentage: number; volume: number }>;
    narrative: string;
  };
  insights_section: {
    title: string;
    critical: Array<{ title: string; description: string }>;
    observations: Array<{ title: string; description: string }>;
  };
  recommendations_section: {
    title: string;
    actions: Array<{ priority: string; area: string; action: string }>;
  };
  channel_section: {
    title: string;
    patterns: string[];
    risks: string[];
    opportunities: string[];
  };
  outlook_section: {
    title: string;
    outlook: string;
  };
}

/**
 * Format KPI Intelligence Report for UI display
 */
export function formatKPIReportForUI(report: KPIIntelligenceReport): FormattedKPIReport {
  return {
    summary_section: {
      title: '📊 Executive Summary',
      key_metrics: {
        Channel: report.report_type,
        'Success Rate': `${report.responsibility_distribution.total_decline_volume > 0 ? (100 - (report.responsibility_distribution.total_decline_volume / (report.responsibility_distribution.total_decline_volume * 100 / (100 - 50)))) : 100}%`,
        'Decline Volume': report.responsibility_distribution.total_decline_volume,
        Period: report.period,
        'Generated': report.generated_date
      },
      assessment: report.executive_summary.overall_assessment
    },

    responsibility_section: {
      title: '🎯 Responsibility Distribution',
      distribution: report.ranked_entities.map(entity => ({
        entity: entity.entity,
        percentage: entity.percentage,
        volume: entity.volume
      })),
      narrative: report.executive_summary.responsibility_distribution
    },

    insights_section: {
      title: '💡 Key Insights & Findings',
      critical: report.insights
        .filter(i => i.severity === 'High')
        .map(i => ({ title: i.title, description: i.description })),
      observations: report.insights
        .filter(i => i.severity !== 'High')
        .map(i => ({ title: i.title, description: i.description }))
    },

    recommendations_section: {
      title: '✅ Recommended Actions',
      actions: report.recommendations.map(rec => ({
        priority: rec.priority,
        area: rec.area,
        action: rec.action
      }))
    },

    channel_section: {
      title: `🔍 ${getChannelName(report.report_type)} Channel Intelligence`,
      patterns: report.channel_intelligence.specific_patterns.slice(0, 4),
      risks: report.channel_intelligence.risk_areas.slice(0, 3),
      opportunities: report.channel_intelligence.optimization_opportunities.slice(0, 3)
    },

    outlook_section: {
      title: '🔮 Outlook & Implications',
      outlook: report.executive_summary.outlook
    }
  };
}

/**
 * Get readable channel name
 */
function getChannelName(reportType: string): string {
  const names: Record<string, string> = {
    POS: 'Point-of-Sale (POS)',
    ATM: 'Automated Teller Machine (ATM)',
    IPG: 'Internet Payment Gateway (IPG)'
  };
  return names[reportType] || reportType;
}

/**
 * Generate responsibility chart data for visualization
 */
export function generateResponsibilityChartData(report: KPIIntelligenceReport) {
  return report.ranked_entities.map(entity => ({
    name: entity.entity,
    value: entity.percentage,
    fill:
      entity.percentage > 40 ? '#ef4444' : entity.percentage > 25 ? '#f97316' : entity.percentage > 15 ? '#eab308' : '#10b981'
  }));
}

/**
 * Generate severity badge styles
 */
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'High':
      return '#dc2626'; // Red
    case 'Medium':
      return '#ea580c'; // Orange
    case 'Low':
      return '#16a34a'; // Green
    default:
      return '#6b7280'; // Gray
  }
}

/**
 * Generate summary cards for dashboard
 */
export function generateKPISummaryCards(report: KPIIntelligenceReport) {
  return [
    {
      title: 'Dominant Factor',
      value: report.ranked_entities[0]?.entity || 'N/A',
      percentage: report.ranked_entities[0]?.percentage || 0,
      trend: 'stable'
    },
    {
      title: 'Decline Volume',
      value: report.responsibility_distribution.total_decline_volume.toLocaleString(),
      percentage: 0,
      trend: 'neutral'
    },
    {
      title: 'Critical Insights',
      value: report.insights.filter(i => i.severity === 'High').length,
      percentage: 0,
      trend: report.insights.filter(i => i.severity === 'High').length > 0 ? 'negative' : 'positive'
    },
    {
      title: 'Action Items',
      value: report.recommendations.length,
      percentage: 0,
      trend: 'neutral'
    }
  ];
}
