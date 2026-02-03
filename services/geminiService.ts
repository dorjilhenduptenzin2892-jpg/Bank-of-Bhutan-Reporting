
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
  return '';
}
