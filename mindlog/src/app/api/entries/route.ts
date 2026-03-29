import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, transcription, type, stressScore } = body;

    if (!userId || !transcription) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    const entry = {
      userId,
      transcription,
      type: type || "voice",
      stressScore: stressScore || null,
      createdAt: new Date(),
      tags: [],
      logOutput: null,
    };

    const result = await db.collection("entries").insertOne(entry);

    return NextResponse.json(
      { success: true, entryId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Entry creation error:", error);
    return NextResponse.json(
      { error: "Failed to create entry" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const entries = await db
      .collection("entries")
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ entries }, { status: 200 });
  } catch (error) {
    console.error("Fetch entries error:", error);
    return NextResponse.json(
      { error: "Failed to fetch entries" },
      { status: 500 }
    );
  }
}
