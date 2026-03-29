import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const GeminiMindLogSchema = z.object({
  emotional_inferences: z.array(
    z.object({
      emotion: z.string().describe("Emotion label, e.g. overwhelmed, anxious, hopeful"),
      confidence: z.number().min(0).max(1).describe("Confidence from 0 to 1"),
      evidence: z.string().describe("Short reason based on transcript"),
    })
  ),
  positive_affirmation: z.string().describe("Supportive, validating response"),
  song_recommendation: z.object({
    title: z.string(),
    artist: z.string(),
    reason: z.string(),
  }),
});

type GeminiMindLogResult = z.infer<typeof GeminiMindLogSchema>;

type ElevenLabsTranscript = {
  language_code?: string;
  language_probability?: number;
  text: string;
  words?: Array<unknown>;
  channel_index?: number;
  additional_formats?: Array<unknown>;
  transcription_id?: string;
  entities?: Array<unknown>;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ElevenLabsTranscript;

    if (!body?.text?.trim()) {
      return NextResponse.json(
        { error: "Missing transcript text." },
        { status: 400 }
      );
    }

    const prompt = `
You are MindLog's reflective journaling assistant.

Analyze the user's transcript and return:
1) emotional_inferences: what the user seems to feel, with confidence and short evidence
2) positive_affirmation: a validating, reassuring message that hears them out
3) song_recommendation: one song that matches the mood

Rules:
- Do not diagnose.
- Do not be clinical.
- Be warm, supportive, and concise.
- Base everything only on the transcript.
- Return JSON only.

Transcript:
${body.text}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: zodToJsonSchema(GeminiMindLogSchema),
      },
    });

    const parsed = GeminiMindLogSchema.parse(JSON.parse(response.text)) satisfies GeminiMindLogResult;

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Gemini route error:", error);
    return NextResponse.json(
      { error: "Failed to generate MindLog insights." },
      { status: 500 }
    );
  }
}