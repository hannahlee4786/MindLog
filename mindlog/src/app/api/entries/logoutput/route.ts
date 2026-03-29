import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { generateLogOutput } from "@/lib/gemini";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entryId, biometrics } = body;

    if (!entryId) {
      return NextResponse.json(
        { error: "Missing entryId" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Fetch the entry
    const entry = await db
      .collection("entries")
      .findOne({ _id: new ObjectId(entryId) });

    if (!entry) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      );
    }

    // Generate log output using Gemini
    const logOutput = await generateLogOutput(
      entry.transcription,
      entry.stressScore,
      biometrics ?? undefined
    );

    // Update entry with log output
    await db
      .collection("entries")
      .updateOne(
        { _id: new ObjectId(entryId) },
        { $set: { logOutput, processedAt: new Date() } }
      );

    return NextResponse.json(logOutput, { status: 200 });
  } catch (error) {
    console.error("Log output generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate log output" },
      { status: 500 }
    );
  }
}
