
import { ReportData } from "../types";
import { BUSINESS_CODE_DICTIONARY, TECHNICAL_CODE_DICTIONARY, REASON_NORMALIZATION } from '../constants';

async function callServer(type: 'cause' | 'narrative', body: any): Promise<string | null> {
  try {
    const res = await fetch(`/api/genai?type=${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.text || null;
  } catch (err) {
    console.warn('Server AI call failed', err);
    return null;
  }
}

export async function generateTypicalCause(reason: string): Promise<string> {
  const server = await callServer('cause', { reason });
  if (server) return server;
  if (!reason || !reason.trim()) return 'The transaction was declined by the processing network for administrative reasons.';
  return `Decline reason: ${reason.trim()}.`;
}

export async function generateNarrative(data: ReportData): Promise<string> {
  const server = await callServer('narrative', { data });
  if (server) return server;

  // Concise, professional two-section summary.
  const totalTx = data.totalTransactions || 0;
  const estFailures = Math.max(1, Math.round((data.failureRate / 100) * totalTx));

  const sum = (arr: { volume?: number }[] = []) => arr.reduce((s: number, v) => s + (v.volume || 0), 0);
  const businessSum = sum(data.businessFailures);
  const techSum = sum(data.technicalFailures);

  const topB = (data.businessFailures || []).slice(0, 3);
  const topT = (data.technicalFailures || []).slice(0, 3);

  const fmtPct = (v: number) => `${((v / Math.max(1, estFailures)) * 100).toFixed(1)}%`;

  const formatNames = (arr: { description?: string }[]) => {
    if (!arr || arr.length === 0) return 'N/A';
    return arr.map(a => {
      const key = a.description?.toLowerCase().trim() || '';
      return (REASON_NORMALIZATION[key]?.normalizedDescription || a.description || 'Unknown').toUpperCase();
    }).join(', ');
  };

  const b1 = `1. Dominant contributors: ${formatNames(topB)}.`;
  const b2 = `2. Impact: Top business categories = ${businessSum} txns (${fmtPct(businessSum)}) of estimated failures. Success ${data.successRate.toFixed(2)}%, Failure ${data.failureRate.toFixed(2)}% (${data.dateRange}).`;
  const b3 = (() => {
    const names = formatNames(topB);
    if (names.includes('INSUFFICIENT FUNDS') || names.includes('DO NOT HONOUR')) return '3. Summary: Issuer-level declines are prominent.';
    if (businessSum > estFailures * 0.6) return '3. Summary: Business declines account for the majority of failures.';
    return '3. Summary: No single dominant business pattern detected.';
  })();

  const t1 = `1. Dominant technical contributors: ${formatNames(topT)}.`;
  const t2 = `2. Stability: Technical issues = ${techSum} txns (${fmtPct(techSum)}) of estimated failures, indicating ${techSum < estFailures * 0.1 ? 'generally stable' : 'periodic instability'}.`;
  const t3 = techSum > 0 ? (techSum > estFailures * 0.2 ? '3. Summary: Technical problems are a notable source of failures.' : '3. Summary: Technical issues present but not dominant.') : '3. Summary: No significant technical pattern.';

  const note = 'Generated locally (deterministic summary). Enable server AI for extended narratives.';

  return [
    'Business Decline Analysis',
    b1,
    b2,
    b3,
    '',
    'Technical Decline Analysis',
    t1,
    t2,
    t3,
    '',
    note,
  ].join('\n\n');
}
