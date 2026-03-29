"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { MusicRecommendation } from "./MusicRecommendation";
import { VoiceRecorder } from "./VoiceRecorder";

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
}

export function Session() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content:
        "I see today's stress is a bit higher than your weekly average. Want to start with what's on your mind, or what's on your to-do list?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const stressLevel = 7.3;
  const weeklyAverage = 5.8;
  const sessionThemes = ["work", "school", "deadlines"];
  const currentMood = "overwhelmed";

  const handleSend = () => {
    if (!inputValue.trim() || isProcessing) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInputValue("");
    setIsProcessing(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content:
          "I hear that you're feeling overwhelmed. That's completely valid. What specifically about these deadlines feels most pressing right now?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsProcessing(false);
    }, 1000);
  };

  const handleAudioReady = async (blob: Blob) => {
    setIsProcessing(true);
    setSaveError(null);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      const transcribeRes = await fetch("/api/transcribe", { method: "POST", body: formData });
      if (!transcribeRes.ok) {
        const err = await transcribeRes.json();
        throw new Error(`Transcription failed: ${err.error || transcribeRes.status}`);
      }
      const data = await transcribeRes.json();
      const text = data.text || "";

      if (!text) {
        throw new Error("No transcription text returned — audio may be too short");
      }

      handleTranscriptionComplete(text);

      const userId = localStorage.getItem("mindlog_user_id");
      if (!userId) {
        throw new Error("Not logged in — no userId in localStorage");
      }

      const entryRes = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, transcription: text, type: "voice", stressScore: null }),
      });
      if (!entryRes.ok) {
        const err = await entryRes.json();
        throw new Error(`Failed to save entry: ${err.error || entryRes.status}`);
      }
      const { entryId } = await entryRes.json();
      await fetch("/api/entries/logoutput", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId }),
      });
    } catch (err: any) {
      setSaveError(err.message || "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTranscriptionComplete = (transcription: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: transcription,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInputMode("text");
    setIsProcessing(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content:
          "I hear that you're feeling overwhelmed. That's completely valid. What specifically about what you mentioned feels most pressing right now?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsProcessing(false);
    }, 1000);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="bg-card rounded-lg shadow-sm px-6 py-4 mb-6 flex items-center justify-between border border-border">
        <div className="space-y-1">
          <h1 className="text-lg text-foreground">
            MindLog Session – March 29, 2026
          </h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/30 border border-secondary">
          <div className="w-2 h-2 rounded-full bg-[#EAAB99]" />
          <span className="text-sm text-secondary-foreground">Medium stress</span>
        </div>
      </div>

      {saveError && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded-lg text-sm text-destructive">
          {saveError}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left panel - Conversation */}
        <div className="lg:col-span-2 bg-card rounded-2xl shadow-sm flex flex-col h-[calc(100vh-240px)] border border-border">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] ${
                    message.type === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  } rounded-2xl px-4 py-3`}
                >
                  {message.type === "ai" && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent" />
                      <span className="text-xs text-muted-foreground">MindLog</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input area */}
          <div className="border-t border-border p-6 space-y-3">
            {inputMode === "text" ? (
              <>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      disabled={isProcessing}
                      placeholder="Type freely about your day, worries, or anything you want to unpack…"
                      className="w-full px-4 py-3 rounded-lg border border-border bg-input-background text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none transition-colors disabled:opacity-50"
                      rows={3}
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isProcessing}
                    className="p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors self-end disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    MindLog is not a therapist, but it can help you reflect.
                  </p>
                  <button
                    onClick={() => setInputMode("voice")}
                    disabled={isProcessing}
                    className="text-xs text-primary hover:text-primary/90 transition-colors disabled:opacity-50"
                  >
                    Or speak instead →
                  </button>
                </div>
              </>
            ) : (
              <>
                <VoiceRecorder
                  onAudioReady={handleAudioReady}
                />
                <button
                  onClick={() => setInputMode("text")}
                  disabled={isProcessing}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  ← Back to typing
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right panel - Context */}
        <div className="space-y-6">
          {/* Today's Context */}
          <div className="bg-card rounded-2xl shadow-sm p-6 space-y-4 border border-border">
            <h3 className="text-lg text-foreground font-medium">Today's context</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current stress</span>
                <span className="text-2xl text-foreground font-medium">{stressLevel}</span>
              </div>

              <div className="h-12 flex items-end gap-1">
                {[5.2, 5.8, 6.1, 5.5, 6.3, 6.8, 7.3].map((value, index) => (
                  <div
                    key={index}
                    className="flex-1 bg-primary/40 rounded-t"
                    style={{ height: `${(value / 10) * 100}%` }}
                  />
                ))}
              </div>

              <div className="space-y-2 pt-3 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">7-day average stress</span>
                  <span className="text-foreground">{weeklyAverage}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Today vs last week</span>
                  <span className="text-destructive">+1.5 higher</span>
                </div>
              </div>
            </div>
          </div>

          {/* Session Notes */}
          <div className="bg-card rounded-2xl shadow-sm p-6 space-y-4 border border-border">
            <h3 className="text-lg text-foreground font-medium">Session notes</h3>

            <div className="flex flex-wrap gap-2">
              {sessionThemes.map((theme) => (
                <span
                  key={theme}
                  className="px-3 py-1 rounded-full bg-accent/50 text-accent-foreground border border-accent/20 text-sm"
                >
                  {theme}
                </span>
              ))}
            </div>

            <div className="bg-muted rounded-lg p-3 border border-border">
              <p className="text-sm text-foreground">
                So far today you've mentioned: feeling behind on school, overwhelmed by
                deadlines.
              </p>
            </div>

            <button className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              End Session
            </button>
          </div>

          {/* Music Recommendation */}
          <MusicRecommendation stressLevel={stressLevel} mood={currentMood} />
        </div>
      </div>
    </div>
  );
}
