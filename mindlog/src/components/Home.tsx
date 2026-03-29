"use client";

import { Mic, Type } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MusicRecommendation } from "./MusicRecommendation";
import { VoiceRecorder } from "./VoiceRecorder";

export function Home() {
  const router = useRouter();
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [stressData, setStressData] = useState<{ level: number; label: string } | null>(null);
  const [isLoadingStress, setIsLoadingStress] = useState(true);
  const audioBlob = useRef<Blob | null>(null);

  useEffect(() => {
    fetchTodayStressData();
  }, []);

  const fetchTodayStressData = async () => {
    try {
      const response = await fetch("/api/entries?limit=1", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        const latestEntry = data.entries?.[0];

        if (latestEntry && latestEntry.stressScore !== undefined) {
          const score = latestEntry.stressScore;
          const label =
            score >= 7 ? "High stress" : score >= 5 ? "Medium stress" : "Low stress";
          setStressData({ level: score, label });
        }
      }
    } catch (error) {
      console.error("Failed to fetch stress data:", error);
    } finally {
      setIsLoadingStress(false);
    }
  };

  const handleBeginSession = async () => {
    // Store the audio blob in session storage if available
    if (audioBlob.current) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        sessionStorage.setItem("pendingAudioBlob", base64);
        router.push("/journal");
      };
      reader.readAsDataURL(audioBlob.current);
    } else {
      router.push("/journal");
    }
  };

  const handleAudioReady = (blob: Blob) => {
    audioBlob.current = blob;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left column - Today's Stress Status */}
        <div className="bg-card rounded-2xl shadow-sm p-6 space-y-6 border border-border">
          <h2 className="text-xl text-foreground">Today's Status</h2>

          {isLoadingStress ? (
            <div className="text-center py-12">
              <p className="text-foreground/70">Loading your stress data...</p>
            </div>
          ) : stressData ? (
            <div className="space-y-4">
              <div className="bg-muted rounded-xl p-8 flex flex-col items-center justify-center space-y-3">
                <div className="text-5xl text-foreground">{stressData.level}</div>
                <div className="text-sm text-muted-foreground">out of 10</div>
                <div className="px-4 py-1.5 rounded-full bg-[#EAAB99]/30 text-foreground border border-[#EAAB99] text-sm font-medium">
                  {stressData.label}
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                From your mobile app check-in
              </p>
              <div className="bg-accent/50 rounded-lg p-4 border border-accent/20">
                <p className="text-accent-foreground text-sm">
                  "How are you feeling about that today?"
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-6 text-center">
              <p className="text-foreground/70">No stress data available yet. Check in on your mobile app.</p>
            </div>
          )}
        </div>

        {/* Right column - Start Session */}
        <div className="space-y-6">
          <div className="bg-card rounded-2xl shadow-sm p-6 space-y-6 border border-border">
            <h2 className="text-xl text-foreground">Start today's MindLog session</h2>

            <div className="space-y-4">
              {inputMode === "text" ? (
                <div className="flex gap-3">
                  <button className="flex-1 py-3 px-4 rounded-lg border-2 border-primary bg-primary/10 text-primary font-medium text-sm hover:opacity-80 transition-colors">
                    Type journal entry
                  </button>
                  <button 
                    onClick={() => setInputMode("voice")}
                    className="flex-1 py-3 px-4 rounded-lg border-2 border-border text-muted-foreground hover:border-primary hover:text-primary flex items-center justify-center gap-2 font-medium text-sm transition-colors"
                  >
                    <Mic className="w-4 h-4" />
                    Speak
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button 
                    onClick={() => setInputMode("text")}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Type className="w-4 h-4" />
                    Or type instead →
                  </button>
                  <VoiceRecorder 
                    onAudioReady={handleAudioReady}
                  />
                </div>
              )}

              <button
                onClick={handleBeginSession}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Begin Session
              </button>

              <p className="text-sm text-muted-foreground text-center">
                MindLog will ask a few gentle questions based on how you're doing today.
              </p>
            </div>

            {stressData && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Your stress today</div>
                  <div className="text-2xl font-medium text-foreground">{stressData.level} / 10</div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-[#EAAB99]" />
                  <span className="text-muted-foreground">{stressData.label}</span>
                </div>
              </div>
            )}
          </div>

          {/* Music Recommendation - shown if stress data available */}
          {stressData && (
            <MusicRecommendation stressLevel={stressData.level} mood={stressData.label.toLowerCase()} />
          )}
        </div>
      </div>
    </div>
  );
}
