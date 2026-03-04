
import React, { useMemo } from "react";
import { colors, typography, spacing } from "../../theme/theme";

type KpiType = "success" | "decline" | "business" | "technical";

const kpiColors = {
  success: colors.success,
  decline: colors.decline,
  business: colors.warning,
  technical: colors.accent,
};

interface KpiCardProps {
  title: string;
  value: string | number;
  trend?: number; // e.g., +2.5 or -1.3
  type: KpiType;
  subtitle?: string;
  sparklinePoints?: number[];
  loading?: boolean;
  tooltip?: string;
}

const buildSparkline = (points: number[]) => {
  if (!points || !points.length) return '';
  const max = Math.max(...points);
  const min = Math.min(...points);
  const spread = max - min || 1;
  return points
    .map((value, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 100 - ((value - min) / spread) * 100;
      return `${x},${y}`;
    })
    .join(' ');
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  trend,
  type,
  subtitle,
  sparklinePoints = [],
  loading,
  tooltip,
}) => {
  const sparkline = useMemo(() => buildSparkline(sparklinePoints), [sparklinePoints]);
  return (
    <div
      className="kpi-card"
      style={{
        borderTop: `4px solid ${kpiColors[type]}`,
        background: "var(--card-bg)",
        boxShadow: "var(--shadow-soft)",
        borderRadius: 12,
        padding: spacing(3),
        minWidth: 220,
        position: "relative",
        transition: "box-shadow 0.2s",
      }}
      title={tooltip}
    >
      <div style={{ ...typography.sectionTitle, color: "var(--text-secondary)" }}>{title}</div>
      <div style={{ ...typography.kpiNumber, margin: `${spacing(1)} 0` }}>
        {loading ? <div className="skeleton kpi" /> : value}
        {trend !== undefined && (
          <span
            style={{
              color: trend > 0 ? colors.success : colors.decline,
              fontSize: 16,
              marginLeft: 8,
              verticalAlign: "middle",
            }}
          >
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      {subtitle && (
        <div style={{ color: "var(--text-tertiary)", fontSize: 13 }}>{subtitle}</div>
      )}
      {sparkline && (
        <div style={{ position: "absolute", bottom: 12, right: 12 }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" width={60} height={18}>
            <polyline points={sparkline} fill="none" stroke={kpiColors[type]} strokeWidth="2" />
          </svg>
        </div>
      )}
    </div>
  );
};
