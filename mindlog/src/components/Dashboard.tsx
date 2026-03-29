"use client";

import { useState, useEffect } from "react";

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

export default function Dashboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7days" | "30days">("30days");

  useEffect(() => {
    fetchEntries();
  }, []);

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

  const getEntriesInRange = (days: number) => {
    const now = new Date();
    return entries.filter((entry) => {
      const entryDate = new Date(entry.createdAt);
      const daysDiff = Math.floor(
        (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysDiff <= days;
    });
  };

  const calculateStreak = () => {
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const entry of sortedEntries) {
      const entryDate = new Date(entry.createdAt);
      entryDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor(
        (currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const getDailyStressData = (days: number) => {
    const rangeEntries = getEntriesInRange(days);
    const dailyData: Record<string, number[]> = {};

    rangeEntries.forEach((entry) => {
      const date = new Date(entry.createdAt);
      const dateStr = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      if (!dailyData[dateStr]) dailyData[dateStr] = [];
    //   if (entry.stressScore !== null) dailyData[dateStr].push(entry.stressScore);
    });

    return Object.entries(dailyData)
      .map(([date, scores]) => ({
        date,
        avgStress: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      }))
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
  };

  const getCheckInHeatmap = (days: number) => {
    const rangeEntries = getEntriesInRange(days);
    const heatmap: Record<number, number> = {};

    // Initialize all days in the month with 0
    for (let i = 1; i <= 31; i++) {
      heatmap[i] = 0;
    }

    rangeEntries.forEach((entry) => {
      const date = new Date(entry.createdAt);
      const day = date.getDate();
      heatmap[day]++;
    });

    return heatmap;
  };

  const getThemesOnHighStress = (days: number) => {
    const rangeEntries = getEntriesInRange(days);
    const themes: Record<string, number> = {};

    rangeEntries
      .filter((e) => (e.stressScore || 0) >= 7)
      .forEach((entry) => {
        const words = entry.transcription
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 4);
        words.forEach((word) => {
          themes[word] = (themes[word] || 0) + 1;
        });
      });

    return Object.entries(themes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme, count]) => ({ theme, count }));
  };

  const dailyData = getDailyStressData(timeRange === "30days" ? 30 : 7);
  const heatmapData = getCheckInHeatmap(timeRange === "30days" ? 30 : 7);
  const themes = getThemesOnHighStress(timeRange === "30days" ? 30 : 7);
  const streak = calculateStreak();

  const maxStress = dailyData.length > 0 ? Math.max(...dailyData.map((d) => d.avgStress)) : 10;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-card-foreground">Dashboard & Insights</h1>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="px-4 py-2 border border-border bg-input-background text-card-foreground rounded-lg focus:ring-2 focus:ring-primary"
        >
          <option value="7days">Last 7 days</option>
          <option value="30days">Last 30 days</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-foreground/70">Loading dashboard...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Streak and Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg shadow-md p-8">
              <h2 className="text-3xl font-bold text-card-foreground mb-2">
                {streak} days
              </h2>
              <p className="text-foreground/70">Current streak</p>
              <div className="mt-4 flex gap-1">
                {Array(14)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded ${
                        i < streak
                          ? "bg-primary"
                          : "bg-border"
                      }`}
                    />
                  ))}
              </div>
            </div>

            <div className="bg-card rounded-lg shadow-md p-8">
              <h2 className="text-3xl font-bold text-card-foreground mb-2">
                {entries.length}
              </h2>
              <p className="text-foreground/70">Total entries</p>
              <p className="text-sm text-foreground/50 mt-4">
                {getEntriesInRange(timeRange === "30days" ? 30 : 7).length} in{" "}
                {timeRange === "30days" ? "last 30 days" : "last 7 days"}
              </p>
            </div>
          </div>

          {/* Daily Stress Chart */}
          <div className="bg-card rounded-lg shadow-md p-8">
            <h3 className="text-xl font-semibold text-card-foreground mb-6">
              Daily stress, last {timeRange === "30days" ? "30 days" : "7 days"}
            </h3>
            {dailyData.length === 0 ? (
              <p className="text-foreground/50">No data available</p>
            ) : (
              <div className="flex items-end gap-2 h-64">
                {dailyData.map((data, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-chart-1 rounded-t"
                      style={{
                        height: `${Math.max((data.avgStress / maxStress) * 100, 5)}%`,
                      }}
                    />
                    <p className="text-xs text-foreground/50 mt-2 text-center">
                      {data.date}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* When you talk to MindLog (Check-in Heatmap) */}
          <div className="bg-card rounded-lg shadow-md p-8">
            <h3 className="text-xl font-semibold text-card-foreground mb-6">
              When you talk to MindLog
            </h3>
            <div className="grid grid-cols-7 gap-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-foreground/50">
                  {day}
                </div>
              ))}
              {Array(31)
                .fill(0)
                .map((_, day) => {
                  const count = heatmapData[day + 1];
                  let bgColor = "bg-border";
                  if (count >= 3) bgColor = "bg-chart-3";
                  else if (count >= 2) bgColor = "bg-chart-3/70";
                  else if (count >= 1) bgColor = "bg-chart-3/40";

                  return (
                    <div
                      key={day}
                      className={`w-8 h-8 rounded flex items-center justify-center text-xs font-semibold ${bgColor}`}
                      title={`${day + 1} entries`}
                    >
                      {day + 1}
                    </div>
                  );
                })}
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span>Less</span>
              {[0, 1, 2, 3].map((i) => {
                const colors = ["bg-border", "bg-chart-3/40", "bg-chart-3/70", "bg-chart-3"];
                return <div key={i} className={`w-4 h-4 rounded ${colors[i]}`} />;
              })}
              <span>More</span>
            </div>
          </div>

          {/* Themes on High Stress Days */}
          <div className="bg-card rounded-lg shadow-md p-8">
            <h3 className="text-xl font-semibold text-card-foreground mb-6">
              Themes that show up on high-stress days
            </h3>
            {themes.length === 0 ? (
              <p className="text-foreground/50">No high-stress entries yet</p>
            ) : (
              <div className="flex items-end gap-4 h-64">
                {themes.map((theme, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-chart-3 rounded-t"
                      style={{
                        height: `${(theme.count / Math.max(...themes.map((t) => t.count))) * 100}%`,
                      }}
                    />
                    <p className="text-xs text-foreground/50 mt-2 text-center break-words">
                      {theme.theme}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly Reflection */}
          <div className="bg-primary/10 border border-primary rounded-lg p-8">
            <h3 className="text-xl font-semibold text-card-foreground mb-4">
              This week's reflection (AI)
            </h3>
            <p className="text-foreground/80 leading-relaxed">
              {entries.length === 0
                ? "Start recording journal entries to get AI-powered weekly reflections based on your patterns and themes."
                : `Based on your entries this ${timeRange === "7days" ? "week" : "month"}, you've been focusing on ${themes.length > 0 ? `topics like ${themes.slice(0, 2).map((t) => t.theme).join(" and ")}` : "various topics"}. Keep tracking your stress patterns to unlock deeper insights!`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
