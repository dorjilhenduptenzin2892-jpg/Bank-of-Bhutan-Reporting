import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end('Method Not Allowed');
  }

  const type = (req.query && req.query.type) || (req.body && req.body.type) || 'narrative';

  try {
    if (type === 'cause') {
      const { reason, reportType } = req.body || {};
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Provide a professional, neutral, single-sentence banking explanation for the following ${reportType || 'POS/ATM'} transaction decline reason: "${reason}". Output only the sentence.`,
      });
      return res.status(200).json({ text: response.text?.trim() || '' });
    }

    // Default: narrative generation
    const { data } = req.body || {};
    const prompt = `
      Generate a professional bank-grade management analysis for an ${data.reportType} Acquiring Service report.
      Detected Date Range: ${data.dateRange}
      Success Rate: ${data.successRate.toFixed(2)}%
      Failure Rate: ${data.failureRate.toFixed(2)}%

      Top Business Failures:
      ${data.businessFailures.map((f: any) => `- ${f.description} (${f.volume} txns)`).join('\n')}

      Top Technical Failures:
      ${data.technicalFailures.map((f: any) => `- ${f.description} (${f.volume} txns)`).join('\n')}

      Structure Requirements:
      1. Output a narrative consisting of two distinct sections.
      2. Section 1 Heading: "Business Decline Analysis"
         - Use a numbered list (1., 2., 3., etc.) for points.
         - Summarize major contributors.
         - Explicitly mention and highlight key response names (e.g., DO NOT HONOUR, INSUFFICIENT FUNDS) in uppercase.
      3. Section 2 Heading: "Technical Decline Analysis"
         - Use a numbered list (1., 2., 3., etc.) for points.
         - Summarize technical stability.

      Strict Rules:
      - Formal banking tone.
      - No emojis.
      - No casual language.
      - NO RECOMMENDATIONS.
      - NO MARKDOWN BOLDING. DO NOT USE DOUBLE ASTERISKS (**).
      - NO ASTERISKS (*) or DASHES (-) for lists. Use only numbers (1., 2., 3.).
      - Highlight: Dominant decline reasons, volume trends, and ${data.reportType} system stability.
      - Output only the analysis text.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 2000 } },
    });

    let text = response.text?.trim() || 'Analysis pending manual review.';
    text = text.replace(/\*\*/g, '').replace(/^\s*[\*\-]\s/gm, '1. ');

    return res.status(200).json({ text });
  } catch (err) {
    console.error('GenAI server error:', err);
    return res.status(500).json({ error: 'AI generation failed' });
  }
}
