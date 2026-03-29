"use client";

import { useRef, useState, useEffect } from "react";

interface TranscriptionResult {
  text: string;
  speaker?: string;
  timestamp?: number;
}

interface LogOutput {
  emotionalInference: string;
  affirmation: string;
  songRecommendation: {
    title: string;
    artist: string;
    youtubeLink: string;
    albumCoverUrl?: string;
  };
}

export default function AudioTranscriber() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [logOutput, setLogOutput] = useState<LogOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const storedId = localStorage.getItem("mindlog_user_id");
    if (storedId) {
      setUserId(storedId);
    } else {
      const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("mindlog_user_id", newId);
      setUserId(newId);
    }
  }, []);

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      const response = await fetch("/api/transcribe", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Transcription failed");
      const data = await response.json();
      setTranscription(data);
      await saveEntry(data.text || JSON.stringify(data));
    } catch (err) {
      setError("Failed to transcribe audio. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveEntry = async (transcriptionText: string) => {
    if (!userId) return;
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, transcription: transcriptionText, type: "voice", stressScore: null }),
      });
      if (!res.ok) throw new Error("Failed to save entry");
      const { entryId: id } = await res.json();
      setEntryId(id);
      await generateInsights(id);
    } catch (err) {
      console.error("Entry save error:", err);
    }
  };

  const generateInsights = async (id: string) => {
    setIsGeneratingInsights(true);
    try {
      const res = await fetch("/api/entries/logoutput", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: id }),
      });
      if (!res.ok) throw new Error("Failed to generate insights");
      const output = await res.json();
      setLogOutput(output);
    } catch (err) {
      console.error("Insight generation error:", err);
      setError("Failed to generate insights. Try again later.");
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError("Failed to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Today's Check-In */}
        <div className="bg-card rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-card-foreground mb-6">Today's Check-In</h2>
          
          <div className="bg-muted rounded-lg p-8 text-center mb-6">
            <svg
              className="w-12 h-12 text-foreground/30 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-card-foreground/70 font-medium mb-4">
              Presage Stress Snapshot
            </p>
            <button className="bg-accent hover:bg-accent/80 text-accent-foreground font-semibold py-3 px-6 rounded-lg transition w-full">
              Ready for your 10-second stress snapshot?
            </button>
            <p className="text-xs text-card-foreground/50 mt-4">
              Your webcam is only used once per day for stress snapshots. No video is stored.
            </p>
          </div>

          <p className="text-card-foreground/70 text-sm">
            ✓ Presage stress reading captures if you're feeling tense, tired, or calm
          </p>
        </div>

        {/* Right: Start Session */}
        <div className="bg-card rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-card-foreground mb-6">
            Start today's MindLog session
          </h2>

          {error && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-4">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* Recording Interface */}
          <div className="space-y-4 mb-6">
            <div className="flex gap-3">
              <button
                onClick={startRecording}
                disabled={isRecording || isLoading}
                className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 16.91c-1.48 1.46-3.51 2.36-5.75 2.36 -2.24 0-4.27-.9-5.75-2.36M19 12h2c0 2.04-.8 3.89-2.1 5.27M3 12h2c0-2.04.8-3.89 2.1-5.27" />
                </svg>
                {isRecording ? "Recording..." : "Speak"}
              </button>
              <button
                onClick={stopRecording}
                disabled={!isRecording}
                className="flex-1 bg-destructive hover:bg-destructive/90 disabled:opacity-50 text-destructive-foreground font-semibold py-3 px-4 rounded-lg transition"
              >
                Stop
              </button>
            </div>

            {isLoading && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <p className="text-foreground/70 mt-2">Transcribing your entry...</p>
              </div>
            )}
          </div>

          {/* Transcription Result */}
          {transcription && !isLoading && (
            <div className="bg-secondary/20 border border-secondary rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-secondary mb-2">Your Entry:</h3>
              <p className="text-foreground/70 text-sm leading-relaxed">
                {typeof transcription === "string"
                  ? transcription
                  : transcription.text || JSON.stringify(transcription, null, 2)}
              </p>
            </div>
          )}

          {/* AI Insights */}
          {isGeneratingInsights && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <p className="text-foreground/70 mt-2">Generating AI insights...</p>
            </div>
          )}

          {logOutput && !isGeneratingInsights && (
            <div className="space-y-4">
              <div className="bg-chart-1/10 border border-chart-1 rounded-lg p-4">
                <h3 className="font-semibold text-chart-1 mb-2">
                  How you're feeling:
                </h3>
                <p className="text-foreground/70 text-sm">
                  {logOutput.emotionalInference}
                </p>
              </div>

              <div className="bg-chart-2/10 border border-chart-2 rounded-lg p-4">
                <h3 className="font-semibold text-chart-2 mb-2">
                  Daily Affirmation:
                </h3>
                <p className="text-foreground/70 text-sm italic">
                  "{logOutput.affirmation}"
                </p>
              </div>

              <div className="bg-chart-3/10 border border-chart-3 rounded-lg p-4">
                <h3 className="font-semibold text-chart-3 mb-2">Soundtrack:</h3>
                <p className="text-foreground/70 text-sm font-medium">
                  {logOutput.songRecommendation.title} by{" "}
                  {logOutput.songRecommendation.artist}
                </p>
                <a
                  href={logOutput.songRecommendation.youtubeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 text-sm mt-2 inline-block"
                >
                  Listen on YouTube →
                </a>
              </div>
            </div>
          )}

          <p className="text-xs text-foreground/50 mt-6">
            MindLog will ask a few gentle questions based on how you're doing
            today.
          </p>
        </div>
      </div>
    </div>
  );
}
