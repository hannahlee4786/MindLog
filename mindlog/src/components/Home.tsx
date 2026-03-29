"use client";

import { Mic, Type, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { VoiceRecorder } from "./VoiceRecorder";

export function Home() {
  const router = useRouter();
  const [inputMode, setInputMode] = useState<"text" | "voice">("voice");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAudioReady = async (blob: Blob) => {
    setIsTranscribing(true);
    setTranscript(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Transcription failed");
      const data = await res.json();
      const text = data.text || "";
      if (!text) throw new Error("No speech detected — try again");
      setTranscript(text);
    } catch (err: any) {
      setError(err.message || "Transcription failed");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleBeginSession = async () => {
    if (!transcript) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const userId = localStorage.getItem("mindlog_user_id");
      if (!userId) throw new Error("Not logged in");

      // Save entry to MongoDB
      const entryRes = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, transcription: transcript, type: "voice", stressScore: null }),
      });
      if (!entryRes.ok) throw new Error("Failed to save entry");
      const { entryId } = await entryRes.json();

      // Navigate immediately — don't block on Gemini
      router.push("/journal");

      // Fire logoutput in background after navigation
      fetch("/api/presage")
        .then((r) => r.ok ? r.json() : { data: null })
        .then(({ data: presageData }) =>
          fetch("/api/entries/logoutput", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entryId, biometrics: presageData }),
          })
        )
        .catch(console.error);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      <div className="bg-card rounded-2xl shadow-sm p-6 space-y-6 border border-border">
        <h2 className="text-xl text-foreground">Start today's MindLog session</h2>

        <div className="space-y-4">
          {inputMode === "voice" ? (
            <div className="space-y-3">
              <button
                onClick={() => setInputMode("text")}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Type className="w-4 h-4" />
                Or type instead →
              </button>
              <VoiceRecorder onAudioReady={handleAudioReady} />
            </div>
          ) : (
            <button
              onClick={() => setInputMode("voice")}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 border-border text-muted-foreground hover:border-primary hover:text-primary font-medium text-sm transition-colors"
            >
              <Mic className="w-4 h-4" />
              Start Recording
            </button>
          )}

          {/* Transcription status */}
          {isTranscribing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Transcribing...
            </div>
          )}

          {/* Show transcript preview */}
          {transcript && (
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Transcript</p>
              <p className="text-sm text-foreground leading-relaxed">{transcript}</p>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            onClick={handleBeginSession}
            disabled={!transcript || isSubmitting}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving session...
              </>
            ) : (
              "Begin Session"
            )}
          </button>

          <p className="text-sm text-muted-foreground text-center">
            MindLog will ask a few gentle questions based on how you're doing today.
          </p>
        </div>
      </div>
    </div>
  );
}
