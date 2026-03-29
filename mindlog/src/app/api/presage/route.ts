import { NextResponse } from "next/server";

export const runtime = "nodejs";

type PresagePayload = {
  sessionId?: string;
  timestamp?: string;
  buffer?: unknown;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PresagePayload;

    if (!body.sessionId || !body.timestamp || body.buffer == null) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing sessionId, timestamp, or buffer",
        },
        { status: 400 }
      );
    }

    console.log("Presage payload received:", {
      sessionId: body.sessionId,
      timestamp: body.timestamp,
    });

    return NextResponse.json(
      {
        ok: true,
        received: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Presage route error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body",
      },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      message: "Presage route is alive",
    },
    { status: 200 }
  );
}