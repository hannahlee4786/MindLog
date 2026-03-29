import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";

// Parse the SmartSpectra text-proto buffer into clean metrics
function parsePresageBuffer(raw: string): Record<string, unknown> {
  const metrics: Record<string, unknown> = {};

  // Pulse rate
  const pulseRateMatch = raw.match(/pulse\s*\{[^}]*rate\s*\{[^}]*value:\s*([\d.]+)/s);
  if (pulseRateMatch) {
    metrics.heartRate = parseFloat(pulseRateMatch[1]);
  }

  // Breathing rate
  const breathingRateMatch = raw.match(/breathing\s*\{[^}]*rate\s*\{[^}]*value:\s*([\d.]+)/s);
  if (breathingRateMatch) {
    metrics.breathingRate = parseFloat(breathingRateMatch[1]);
  }

  // Pulse trace values (for HRV approximation)
  const traceValues: number[] = [];
  const traceRegex = /trace\s*\{[^}]*value:\s*([\d.]+)[^}]*stable:\s*true/gs;
  let traceMatch;
  while ((traceMatch = traceRegex.exec(raw)) !== null) {
    traceValues.push(parseFloat(traceMatch[1]));
  }
  if (traceValues.length > 0) {
    metrics.pulseTraceCount = traceValues.length;
  }

  return metrics;
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let sessionId: string | undefined;
    let timestamp: string | undefined;
    let rawBuffer: string | undefined;

    if (contentType.includes("application/json")) {
      // JSON path (future-proofing)
      const body = await req.json();
      sessionId = body.sessionId;
      timestamp = body.timestamp;
      rawBuffer = typeof body.buffer === "string" ? body.buffer : JSON.stringify(body.buffer);
    } else {
      // iPhone sends pipe-delimited text: sessionId=...|timestamp=...|buffer=...
      const text = await req.text();
      console.log("Presage raw body:", text.slice(0, 200));

      const parts: Record<string, string> = {};
      // Split on | but only for the first two pipes (buffer may contain | chars)
      const firstPipe = text.indexOf("|");
      const secondPipe = text.indexOf("|", firstPipe + 1);

      if (firstPipe !== -1 && secondPipe !== -1) {
        const part1 = text.slice(0, firstPipe);
        const part2 = text.slice(firstPipe + 1, secondPipe);
        const part3 = text.slice(secondPipe + 1);

        [part1, part2].forEach((p) => {
          const eq = p.indexOf("=");
          if (eq !== -1) parts[p.slice(0, eq)] = p.slice(eq + 1);
        });

        // part3 is "buffer=<rest>"
        const bufEq = part3.indexOf("=");
        if (bufEq !== -1) parts["buffer"] = part3.slice(bufEq + 1);
      }

      sessionId = parts["sessionId"];
      timestamp = parts["timestamp"];
      rawBuffer = parts["buffer"];
    }

    if (!sessionId || !timestamp || !rawBuffer) {
      return NextResponse.json(
        { ok: false, error: "Missing sessionId, timestamp, or buffer" },
        { status: 400 }
      );
    }

    const sample = parsePresageBuffer(rawBuffer);
    console.log("Presage sample:", sample);

    const { db } = await connectToDatabase();

    // Accumulate samples per sessionId — running sums + count for averaging on read
    await db.collection("presage").updateOne(
      { sessionId },
      {
        $setOnInsert: { sessionId, createdAt: new Date(timestamp) },
        $set: { updatedAt: new Date() },
        $inc: {
          sampleCount: 1,
          ...(sample.heartRate != null    ? { heartRateSum:    sample.heartRate as number }    : {}),
          ...(sample.breathingRate != null ? { breathingRateSum: sample.breathingRate as number } : {}),
        },
      },
      { upsert: true }
    );

    console.log("Presage accumulated for session:", sessionId);

    return NextResponse.json(
      { ok: true, received: true, parsed: sample },
      { status: 200 }
    );
  } catch (error) {
    console.error("Presage route error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to process presage data" },
      { status: 500 }
    );
  }
}

// Returns averaged metrics from the most recent session
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const doc = await db
      .collection("presage")
      .findOne({}, { sort: { updatedAt: -1 } });

    if (!doc || !doc.sampleCount) {
      return NextResponse.json({ ok: true, data: null }, { status: 200 });
    }

    const data: Record<string, unknown> = { sampleCount: doc.sampleCount };
    if (doc.heartRateSum    != null) data.heartRate    = doc.heartRateSum    / doc.sampleCount;
    if (doc.breathingRateSum != null) data.breathingRate = doc.breathingRateSum / doc.sampleCount;

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    console.error("Presage GET error:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch presage data" }, { status: 500 });
  }
}
