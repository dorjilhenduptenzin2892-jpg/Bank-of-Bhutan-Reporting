import type { BucketKPI } from './kpi';

export interface ComparisonResult {
  from: string;
  to: string;
  success_rate_change: number;
  business_change: number;
  user_change: number;
  technical_change: number;
  insights: string[];
}

function findTopIncrease(
  previous: { code: string; description: string; count: number }[],
  current: { code: string; description: string; count: number }[]
): string | null {
  const prevMap = new Map(previous.map((d) => [`${d.code}::${d.description}`, d.count]));
  let topReason: string | null = null;
  let topDelta = 0;

  current.forEach((item) => {
    const key = `${item.code}::${item.description}`;
    const prevCount = prevMap.get(key) || 0;
    const delta = item.count - prevCount;
    if (delta > topDelta) {
      topDelta = delta;
      topReason = item.description;
    }
  });

  return topReason;
}

export function generateComparisons(buckets: BucketKPI[]): ComparisonResult[] {
  if (buckets.length < 2) return [];
  const results: ComparisonResult[] = [];

  for (let i = 1; i < buckets.length; i += 1) {
    const prev = buckets[i - 1];
    const curr = buckets[i];
    const successDelta = Number((curr.success_rate - prev.success_rate).toFixed(2));
    const businessDelta = curr.business_failures - prev.business_failures;
    const userDelta = curr.user_failures - prev.user_failures;
    const technicalDelta = curr.technical_failures - prev.technical_failures;

    const insights: string[] = [];
    if (successDelta < 0) {
      insights.push(`Success rate declined by ${Math.abs(successDelta).toFixed(2)}% from ${prev.period} to ${curr.period}.`);
    } else if (successDelta > 0) {
      insights.push(`Success rate improved by ${successDelta.toFixed(2)}% from ${prev.period} to ${curr.period}.`);
    }

    if (userDelta > 0) {
      const reason = findTopIncrease(prev.user_declines, curr.user_declines);
      insights.push(
        reason
          ? `User declines increased mainly due to ${reason}.`
          : `User declines increased by ${userDelta}.`
      );
    }

    if (businessDelta > 0) {
      insights.push(`Business declines increased by ${businessDelta}.`);
    }

    if (technicalDelta > 0) {
      insights.push('Technical declines suggest possible issuer or network instability.');
    }

    results.push({
      from: prev.period,
      to: curr.period,
      success_rate_change: successDelta,
      business_change: businessDelta,
      user_change: userDelta,
      technical_change: technicalDelta,
      insights
    });
  }

  return results;
}
