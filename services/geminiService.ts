
import { GoogleGenAI } from "@google/genai";
import { ReportData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export async function generateTypicalCause(reason: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a professional, neutral, single-sentence banking explanation for the following ${process.env.REPORT_TYPE || 'POS/ATM'} transaction decline reason: "${reason}". Output only the sentence.`,
    });
    return response.text?.trim() || "Transaction declined due to a specific business or technical rule set by the issuer.";
  } catch (error) {
    console.error("Gemini Typical Cause error:", error);
    return "The transaction was declined by the processing network for administrative reasons.";
  }
}

export async function generateNarrative(data: ReportData): Promise<string> {
  const prompt = `
    Generate a professional bank-grade management analysis for an ${data.reportType} Acquiring Service report.
    Detected Date Range: ${data.dateRange}
    Success Rate: ${data.successRate.toFixed(2)}%
    Failure Rate: ${data.failureRate.toFixed(2)}%
    
    Top Business Failures:
    ${data.businessFailures.map(f => `- ${f.description} (${f.volume} txns)`).join('\n')}
    
    Top Technical Failures:
    ${data.technicalFailures.map(f => `- ${f.description} (${f.volume} txns)`).join('\n')}

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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2000 }
      }
    });
    
    let text = response.text?.trim() || "Analysis pending manual review.";
    
    // Safety cleanup: remove any asterisks Gemini might have included
    text = text.replace(/\*\*/g, '').replace(/^\s*[\*\-]\s/gm, '1. ');
    
    return text;
  } catch (error) {
    console.error("Gemini Narrative error:", error);
    return "An automated analysis could not be generated at this time.";
  }
}
