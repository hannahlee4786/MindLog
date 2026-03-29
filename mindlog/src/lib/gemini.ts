import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const LogOutputSchema = z.object({
  song_name: z.string().describe("Song title that matches the mood"),
  artist: z.string().describe("Artist name"),
  album_cover_url: z.string().describe("Wikipedia or well-known URL for album art, or empty string"),
  affirmation: z.string().describe("Short, warm, validating affirmation for the user"),
  summary: z.string().describe("1-2 sentence summary of what the user expressed"),
  gratitude_points: z.array(z.string()).min(2).max(4).describe("2-4 things the user can be grateful for based on what they shared"),
  stress_score: z.number().min(0).max(100).describe("Estimated stress level from 0 (calm) to 100 (very stressed)"),
});

export type LogOutput = z.infer<typeof LogOutputSchema>;

export async function generateLogOutput(
  transcription: string,
  stressScore?: number,
  biometrics?: Record<string, unknown>
): Promise<LogOutput> {
  const prompt = `
You are MindLog's reflective journaling assistant. Analyze the user's journal entry and return a JSON response.

Rules:
- Do not diagnose or be clinical.
- Be warm, supportive, and concise.
- Base everything only on the transcript.
- For album_cover_url: use a real, publicly accessible image URL (e.g. from Wikipedia) or return an empty string.
- stress_score is 0–100 (0 = very calm, 100 = extremely stressed).
- Return JSON only.

Journal entry:
${transcription}
${stressScore != null ? `\nPrevious stress score context: ${stressScore}/10` : ""}
${biometrics ? `\nBiometric data from the user's iPhone (Apple Health) captured around the time of this entry:\n${JSON.stringify(biometrics, null, 2)}\nUse this data to inform the stress_score. Higher heart rate and lower HRV generally indicate higher stress.` : ""}
`;

  // Retry up to 3 times on 429 rate limit
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(LogOutputSchema) as any,
        },
      });

      if (!response.text) throw new Error("Empty response from Gemini");
      return LogOutputSchema.parse(JSON.parse(response.text));
    } catch (err: any) {
      const is429 = err?.status === 429 || JSON.stringify(err).includes("429");
      if (is429 && attempt < 3) {
        await new Promise((r) => setTimeout(r, attempt * 5000)); // 5s, 10s
        continue;
      }
      throw err;
    }
  }
  throw new Error("Gemini failed after retries");
}
