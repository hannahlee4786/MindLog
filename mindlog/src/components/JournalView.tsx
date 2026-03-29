"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface Entry {
  _id: string;
  userId: string;
  transcription: string;
  type: string;
  stressScore?: number;
  createdAt: string;
  tags?: string[];
  logOutput?: {
    emotionalInference: string;
    affirmation: string;
    songRecommendation: {
      title: string;
      artist: string;
    };
  };
}

export default function JournalView() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "7days" | "30days" | "high" | "low">("all");
  const [currentTranscription, setCurrentTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);

  useEffect(() => {
    handlePendingAudio();
    fetchEntries();
  }, []);

  const handlePendingAudio = async () => {
    const pendingAudioBase64 = sessionStorage.getItem("pendingAudioBlob");
    if (pendingAudioBase64) {
      setIsTranscribing(true);
      setTranscriptionError(null);

      try {
        // Convert base64 back to blob
        const byteCharacters = atob(pendingAudioBase64.split(",")[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const audioBlob = new Blob([byteArray], { type: "audio/webm" });

        // Send to transcription API
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Transcription failed");
        }

        const result = await response.json();
        const transcription = result.text || result.transcription || "";
        setCurrentTranscription(transcription);

        // Clear from session storage
        sessionStorage.removeItem("pendingAudioBlob");
      } catch (err) {
        setTranscriptionError("Failed to transcribe audio. Please try again.");
        console.error("Transcription error:", err);
      } finally {
        setIsTranscribing(false);
      }
    }
  };

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const userId = localStorage.getItem("mindlog_user_id");
      const response = await fetch(`/api/entries?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries || []);
      }
    } catch (error) {
      console.error("Failed to fetch entries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredEntries = () => {
    const now = new Date();
    return entries.filter((entry) => {
      const entryDate = new Date(entry.createdAt);
      const daysDiff = Math.floor(
        (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (filter === "7days") return daysDiff <= 7;
      if (filter === "30days") return daysDiff <= 30;
      if (filter === "high") return (entry.stressScore || 0) >= 7;
      if (filter === "low") return (entry.stressScore || 0) < 5;
      return true;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const filteredEntries = getFilteredEntries();

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-4xl font-bold text-foreground mb-8">Journal</h1>

      {/* Current Session - Display if transcribing or transcription available */}
      {(isTranscribing || currentTranscription) && (
        <div className="mb-8 bg-card rounded-lg shadow-md border border-border overflow-hidden">
          <div className="p-6 space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Today's Entry</h2>

            {isTranscribing && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary mr-3" />
                <span className="text-foreground/70">Transcribing your message...</span>
              </div>
            )}

            {transcriptionError && (
              <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                <p className="text-sm text-destructive">{transcriptionError}</p>
              </div>
            )}

            {currentTranscription && (
              <div className="space-y-4">
                {/* Your Message */}
                <div className="bg-primary/10 border border-primary rounded-lg p-4">
                  <p className="text-sm text-foreground/60 font-medium mb-2">YOUR MESSAGE</p>
                  <p className="text-foreground leading-relaxed">{currentTranscription}</p>
                </div>

                {/* Stress Score */}
                <div className="bg-chart-1/10 border border-chart-1 rounded-lg p-4">
                  <p className="text-sm text-foreground/60 font-medium mb-2">TODAY'S STRESS LEVEL</p>
                  <div className="flex items-end gap-3">
                    <div className="text-4xl font-bold text-chart-1">7.3</div>
                    <div className="text-sm text-foreground/70 mb-1">/ 10 (High stress)</div>
                  </div>
                </div>

                {/* Affirmation */}
                <div className="bg-secondary/10 border border-secondary rounded-lg p-4">
                  <p className="text-sm text-foreground/60 font-medium mb-2">YOUR AFFIRMATION FOR TODAY</p>
                  <p className="text-lg text-foreground italic leading-relaxed">
                    "I am stronger than my challenges, and today I choose to move forward with compassion for myself."
                  </p>
                </div>

                {/* Summary */}
                <div className="bg-accent/10 border border-accent rounded-lg p-4">
                  <p className="text-sm text-foreground/60 font-medium mb-2">WHAT WE HEARD</p>
                  <p className="text-foreground/80 leading-relaxed">
                    You're working through some meaningful challenges right now. It sounds like you're carrying a lot, but you're also being thoughtful and reflective about your situation. These are signs of your resilience and emotional maturity.
                  </p>
                </div>

                {/* Things to Be Grateful For */}
                <div className="bg-chart-4/10 border border-chart-4 rounded-lg p-4">
                  <p className="text-sm text-foreground/60 font-medium mb-3">THINGS TO BE GRATEFUL FOR</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3 text-foreground/80">
                      <span className="text-chart-4 font-bold mt-0.5">•</span>
                      <span>Your ability to reflect and communicate your feelings openly</span>
                    </li>
                    <li className="flex items-start gap-3 text-foreground/80">
                      <span className="text-chart-4 font-bold mt-0.5">•</span>
                      <span>Taking time to check in with yourself and your emotions</span>
                    </li>
                    <li className="flex items-start gap-3 text-foreground/80">
                      <span className="text-chart-4 font-bold mt-0.5">•</span>
                      <span>Your strength in navigating difficult moments with grace</span>
                    </li>
                    <li className="flex items-start gap-3 text-foreground/80">
                      <span className="text-chart-4 font-bold mt-0.5">•</span>
                      <span>The support systems around you that help you through tough times</span>
                    </li>
                  </ul>
                </div>

                {/* Soundtrack */}
                <div className="bg-chart-3/10 border border-chart-3 rounded-lg p-4">
                  <p className="text-sm text-foreground/60 font-medium mb-3">YOUR MINDLOG SOUNDTRACK</p>
                  <div className="flex items-center gap-4">
                    {/* Album Cover */}
                    <div className="w-20 h-20 bg-gradient-to-br from-chart-3 via-primary to-chart-1 rounded-lg shadow-md flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-10 h-10 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 3v9.28c-.47-.46-1.12-.75-1.84-.75-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V7h4V3h-5z" />
                      </svg>
                    </div>
                    {/* Song Info */}
                    <div>
                      <p className="font-semibold text-foreground">Rise Up</p>
                      <p className="text-sm text-foreground/70">Andra Day</p>
                      <p className="text-xs text-foreground/50 mt-1">A powerful anthem of resilience and inner strength</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">
              Filters
            </h3>
            <div className="space-y-3">
              {[
                { label: "All Time", value: "all" },
                { label: "Last 7 days", value: "7days" },
                { label: "Last 30 days", value: "30days" },
                { label: "High stress days", value: "high" },
                { label: "Low stress days", value: "low" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value as any)}
                  className={`block w-full text-left px-4 py-2 rounded-lg transition ${
                    filter === option.value
                      ? "bg-primary/20 text-primary font-semibold"
                      : "text-card-foreground/70 hover:bg-card/50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Entries List */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-foreground/70">Loading entries...</p>
            </div>
          ) : filteredEntries.length === 0 && !currentTranscription ? (
            <div className="bg-card rounded-lg shadow-md p-12 text-center">
              <p className="text-foreground/50 text-lg">
                No entries found. Start recording your first journal entry!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredEntries.map((entry) => (
                <div
                  key={entry._id}
                  className="bg-card rounded-lg shadow-md p-6 hover:shadow-lg transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-semibold text-card-foreground">
                      {formatDate(entry.createdAt)}
                    </h3>
                    {entry.stressScore !== null && (
                      <span
                        className={`px-4 py-2 rounded-full text-sm font-semibold ${
                          entry.stressScore! >= 7
                            ? "bg-destructive/20 text-destructive"
                            : entry.stressScore! >= 5
                            ? "bg-chart-2/20 text-chart-2"
                            : "bg-chart-4/20 text-chart-4"
                        }`}
                      >
                        {entry.stressScore! >= 7
                          ? "High stress"
                          : entry.stressScore! >= 5
                          ? "Medium stress"
                          : "Low stress"}{" "}
                        • {entry.stressScore}/10
                      </span>
                    )}
                  </div>

                  {/* Presage Data Score */}
                  {entry.stressScore !== null && entry.stressScore !== undefined && (
                    <div className="mb-4 p-4 bg-chart-1/10 rounded-lg border border-chart-1">
                      <p className="text-sm text-foreground/60 font-medium mb-1">
                        PRESAGE DATA SCORE
                      </p>
                      <p className="text-4xl font-bold text-chart-1">
                        {Math.round(entry.stressScore * 10)} <span className="text-xl">/100</span>
                      </p>
                      <p className="text-xs text-foreground/50 mt-2">
                        Overall stress score based on analyzed presage data.
                      </p>
                    </div>
                  )}

                  {/* Transcription */}
                  <div className="mb-4">
                    <p className="text-foreground/80 leading-relaxed">
                      {entry.transcription}
                    </p>
                  </div>

                  {/* Log Output */}
                  {entry.logOutput && (
                    <div className="space-y-4 border-t border-border pt-4">
                      {/* Affirmation */}
                      <div className="bg-chart-2/10 border border-chart-2 rounded-lg p-4">
                        <p className="text-sm text-foreground/60 font-medium mb-2">
                          DAILY AFFIRMATION
                        </p>
                        <p className="text-lg text-foreground italic">
                          "{entry.logOutput.affirmation}"
                        </p>
                      </div>

                      {/* Summary (using emotional inference) */}
                      <div className="bg-chart-1/10 border border-chart-1 rounded-lg p-4">
                        <p className="text-sm text-foreground/60 font-medium mb-2">
                          SUMMARY
                        </p>
                        <p className="text-foreground/80">
                          {entry.logOutput.emotionalInference}
                        </p>
                      </div>

                      {/* Soundtrack */}
                      {entry.logOutput.songRecommendation && (
                        <div className="bg-chart-3/10 border border-chart-3 rounded-lg p-4">
                          <p className="text-sm text-foreground/60 font-medium mb-2">
                            SOUNDTRACK
                          </p>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-chart-1 to-chart-4 rounded-lg flex items-center justify-center">
                              <svg
                                className="w-6 h-6 text-primary-foreground"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 3v9.28c-.47-.46-1.12-.75-1.84-.75-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V7h4V3h-5z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">
                                {entry.logOutput.songRecommendation.title}
                              </p>
                              <p className="text-sm text-foreground/60">
                                {entry.logOutput.songRecommendation.artist}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
