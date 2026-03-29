"use client";

import { useState, useEffect } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

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

const NotebookRings = () => (
  <div className="absolute left-0 top-10 bottom-10 flex flex-col justify-evenly w-12 z-20 pointer-events-none">
    {Array(6).fill(0).map((_, i) => (
      <div key={i} className="flex items-center relative -ml-1 drop-shadow-md">
        <div className="w-10 h-3.5 bg-gradient-to-b from-[#e5e5e5] via-[#ffffff] to-[#cccccc] rounded-full shadow-[2px_2px_4px_rgba(0,0,0,0.15)] border border-[#d1d1d1] z-10 relative">
          <div className="absolute top-[2px] left-1 right-1 h-[2px] bg-white/80 rounded-full" />
        </div>
        <div className="w-5 h-5 bg-background rounded-full absolute right-1 shadow-inner border border-black/5 z-0" />
      </div>
    ))}
  </div>
);

export default function JournalView() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);

  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Page flipping within a day
  const [pageIndex, setPageIndex] = useState(0);

  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = async (text: string) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setIsSpeaking(false);
      };
    } catch (err) {
      console.error("TTS error:", err);
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    handlePendingAudio();
    fetchEntries();
  }, []);

  // Reset page index when selected date changes
  useEffect(() => {
    setPageIndex(0);
  }, [selectedDate]);

  const handlePendingAudio = async () => {
    const pendingAudioBase64 = sessionStorage.getItem("pendingAudioBlob");
    if (!pendingAudioBase64) return;

    sessionStorage.removeItem("pendingAudioBlob");
    setIsTranscribing(true);
    setTranscriptionError(null);

    try {
      const byteCharacters = atob(pendingAudioBase64.split(",")[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const audioBlob = new Blob([byteArray], { type: "audio/webm" });

      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch("/api/transcribe", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Transcription failed");

      const result = await response.json();
      const transcription = result.text || result.transcription || "";

      if (transcription) {
        const userId = localStorage.getItem("mindlog_user_id");
        if (userId) {
          const entryRes = await fetch("/api/entries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, transcription, type: "voice", stressScore: null }),
          });
          if (entryRes.ok) {
            const { entryId } = await entryRes.json();
            await fetch("/api/entries/logoutput", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ entryId }),
            });
            fetchEntries();
          }
        }
      }
    } catch (err) {
      setTranscriptionError("Failed to transcribe audio. Please try again.");
      console.error("Transcription error:", err);
    } finally {
      setIsTranscribing(false);
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

  // Calendar helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const entriesByDate = entries.reduce<Record<string, Entry[]>>((acc, entry) => {
    const d = new Date(entry.createdAt).toDateString();
    if (!acc[d]) acc[d] = [];
    acc[d].push(entry);
    return acc;
  }, {});

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const monthName = calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Entries for selected date or all entries sorted desc
  const displayEntries = selectedDate
    ? (entriesByDate[selectedDate] || [])
    : entries;

  const currentEntry = displayEntries[pageIndex] ?? null;

  const stressLabel = (score: number) =>
    score >= 7 ? "High stress" : score >= 5 ? "Medium stress" : "Low stress";

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {isTranscribing && (
        <div className="flex items-center gap-3 mb-6 p-4 bg-card rounded-lg border border-border">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-foreground/70">Transcribing your entry...</span>
        </div>
      )}
      {transcriptionError && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg text-sm text-destructive">
          {transcriptionError}
        </div>
      )}

      <div className="flex gap-6">
        {/* Left sidebar */}
        <div className="w-56 flex-shrink-0 space-y-4">
          {/* Filters */}
          <div className="bg-card rounded-2xl shadow-sm p-5 border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">Filters</h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedDate(null)}
                className={`block w-full text-left px-3 py-1.5 rounded-lg text-sm transition ${
                  selectedDate === null ? "bg-primary/15 text-primary font-medium" : "text-foreground/60 hover:bg-muted"
                }`}
              >
                All entries
              </button>
            </div>
          </div>

          {/* Calendar */}
          <div className="bg-card rounded-2xl shadow-sm p-5 border border-border">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
                className="p-1 rounded hover:bg-muted transition"
              >
                <ChevronLeft className="w-4 h-4 text-foreground/50" />
              </button>
              <span className="text-sm font-semibold text-foreground">{monthName}</span>
              <button
                onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
                className="p-1 rounded hover:bg-muted transition"
              >
                <ChevronRight className="w-4 h-4 text-foreground/50" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 text-center">
              {["S","M","T","W","T","F","S"].map((d, i) => (
                <div key={i} className="text-[10px] font-semibold text-foreground/40 py-1">{d}</div>
              ))}
              {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
              {Array(daysInMonth).fill(0).map((_, i) => {
                const day = i + 1;
                const dateObj = new Date(year, month, day);
                const dateStr = dateObj.toDateString();
                const hasEntries = !!entriesByDate[dateStr];
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === new Date().toDateString();
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`w-7 h-7 mx-auto rounded-full text-xs flex items-center justify-center transition relative
                      ${isSelected ? "bg-primary text-primary-foreground font-semibold" : ""}
                      ${isToday && !isSelected ? "border border-primary text-primary font-semibold" : ""}
                      ${!isSelected && !isToday ? "text-foreground/70 hover:bg-muted" : ""}
                    `}
                  >
                    {day}
                    {hasEntries && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Notebook area */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : displayEntries.length === 0 ? (
            <div className="relative bg-card rounded-2xl shadow-sm border border-border p-12 pl-16 text-center">
              <NotebookRings />
              <p className="text-foreground/40 text-lg">
                {selectedDate ? "No entries for this day." : "No entries yet. Start recording!"}
              </p>
            </div>
          ) : (
            <div className="relative bg-card rounded-2xl shadow-md border border-border pl-16 overflow-hidden">
              <NotebookRings />

              {/* Page header */}
              <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-border">
                <h2 className="text-3xl font-light text-foreground">
                  {new Date(currentEntry!.createdAt).toLocaleDateString("en-US", {
                    month: "long", day: "numeric", year: "numeric"
                  })}
                </h2>
                <div className="flex items-center gap-3">
                  {currentEntry?.stressScore != null && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                      currentEntry.stressScore >= 7
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : currentEntry.stressScore >= 5
                        ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                        : "bg-green-100 text-green-800 border-green-200"
                    }`}>
                      {stressLabel(currentEntry.stressScore)} • {currentEntry.stressScore}/10
                    </span>
                  )}
                  {/* Page arrows */}
                  {displayEntries.length > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
                        disabled={pageIndex === 0}
                        className="p-1.5 rounded-lg hover:bg-muted transition disabled:opacity-30"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-foreground/40">{pageIndex + 1}/{displayEntries.length}</span>
                      <button
                        onClick={() => setPageIndex(Math.min(displayEntries.length - 1, pageIndex + 1))}
                        disabled={pageIndex === displayEntries.length - 1}
                        className="p-1.5 rounded-lg hover:bg-muted transition disabled:opacity-30"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {currentEntry && (
                <div className="px-8 py-6 space-y-6">
                  {/* Stress Score + Soundtrack side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    {currentEntry.stressScore != null && (
                      <div className="bg-muted/50 rounded-xl p-5 border border-border">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-4 h-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wide">Stress Score</p>
                        </div>
                        <p className="text-5xl font-light text-foreground">{currentEntry.stressScore}</p>
                        <p className="text-sm text-foreground/40 mt-1">/ 10</p>
                      </div>
                    )}
                    {currentEntry.logOutput?.songRecommendation && (
                      <div className="bg-muted/50 rounded-xl p-5 border border-border flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-primary/30 to-chart-3/30 rounded-xl flex-shrink-0 flex items-center justify-center">
                          <svg className="w-7 h-7 text-primary" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 3v9.28c-.47-.46-1.12-.75-1.84-.75-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V7h4V3h-5z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wide mb-1">Soundtrack</p>
                          <p className="font-semibold text-foreground text-sm">{currentEntry.logOutput.songRecommendation.title}</p>
                          <p className="text-xs text-foreground/50">{currentEntry.logOutput.songRecommendation.artist}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Affirmation */}
                  {currentEntry.logOutput?.affirmation && (
                    <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Daily Affirmation</p>
                        <button
                          onClick={() => handleSpeak(`${currentEntry.logOutput!.emotionalInference} ${currentEntry.logOutput!.affirmation}`)}
                          disabled={isSpeaking}
                          className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 disabled:opacity-50 transition"
                        >
                          {isSpeaking ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                            </svg>
                          )}
                          {isSpeaking ? "Playing..." : "Listen"}
                        </button>
                      </div>
                      <p className="text-lg italic text-foreground">"{currentEntry.logOutput.affirmation}"</p>
                    </div>
                  )}

                  {/* Summary */}
                  {currentEntry.logOutput?.emotionalInference && (
                    <div className="rounded-xl p-5 border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeWidth={2} />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
                        </svg>
                        <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wide">Summary</p>
                      </div>
                      <p className="text-foreground/80 leading-relaxed">{currentEntry.logOutput.emotionalInference}</p>
                    </div>
                  )}

                  {/* Transcription */}
                  <div className="border-t border-border pt-4">
                    <p className="text-xs font-semibold text-foreground/30 uppercase tracking-wide mb-2">Your words</p>
                    <p className="text-foreground/70 leading-relaxed">{currentEntry.transcription}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
