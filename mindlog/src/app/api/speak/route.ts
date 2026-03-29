import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// Sarah — Mature, Reassuring, Confident (available on free plan)
const VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const response = await elevenlabs.textToSpeech.convert(VOICE_ID, {
      text,
      modelId: "eleven_multilingual_v2",
      voiceSettings: {
        stability: 0.5,
        similarityBoost: 0.75,
      },
    });

    const stream = (response as any).data ?? response;

    // Collect stream into buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error: any) {
    console.error("TTS error:", JSON.stringify(error?.body ?? error?.message ?? error, null, 2));
    return NextResponse.json({ error: "Failed to generate speech", detail: error?.message }, { status: 500 });
  }
}
