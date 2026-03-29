"use client";

import { useState } from "react";
import { Music, ExternalLink, Loader2, RefreshCw } from "lucide-react";

interface Song {
  songTitle: string;
  artist: string;
  reason: string;
  youtubeUrl: string;
}

interface MusicRecommendationProps {
  stressLevel: number;
  mood: string;
}

export function MusicRecommendation({ stressLevel, mood }: MusicRecommendationProps) {
  const [song, setSong] = useState<Song | null>({
    songTitle: "Good as Hell",
    artist: "Lizzo",
    reason: "A feel-good anthem perfect for processing stress with positivity and self-affirmation.",
    youtubeUrl: "https://www.youtube.com/watch?v=llCHp6yOSKs",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecommendation, setShowRecommendation] = useState(false);

  const getSongRecommendation = async () => {
    setLoading(true);
    setError(null);

    try {
      // Mock recommendation for now
      const mockSongs = [
        {
          songTitle: "Good as Hell",
          artist: "Lizzo",
          reason: "A feel-good anthem perfect for processing stress with positivity and self-affirmation.",
          youtubeUrl: "https://www.youtube.com/watch?v=llCHp6yOSKs",
        },
        {
          songTitle: "Breathe",
          artist: "Télépopmusik",
          reason: "Calming electronic track designed to help you slow down and find peace.",
          youtubeUrl: "https://www.youtube.com/watch?v=mj-V7zQAKZ0",
        },
      ];

      await new Promise((resolve) => setTimeout(resolve, 1000));
      const randomSong = mockSongs[Math.floor(Math.random() * mockSongs.length)];
      setSong(randomSong);
      setShowRecommendation(true);
    } catch (err) {
      console.error("Error getting song recommendation:", err);
      setError(err instanceof Error ? err.message : "Failed to get recommendation");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setSong(null);
    setShowRecommendation(false);
    getSongRecommendation();
  };

  if (!showRecommendation) {
    return (
      <div className="bg-card rounded-2xl shadow-sm p-6 space-y-4 border border-border">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-primary" />
          <h3 className="text-lg text-foreground">Music for Your Mood</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          Let me recommend a song based on how you're feeling today.
        </p>

        <button
          onClick={getSongRecommendation}
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:bg-muted disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Finding the perfect song...
            </>
          ) : (
            <>
              <Music className="w-4 h-4" />
              Get Song Recommendation
            </>
          )}
        </button>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>
    );
  }

  if (!song) return null;

  return (
    <div className="bg-gradient-to-br from-accent/40 to-primary/30 rounded-2xl shadow-sm p-6 space-y-4 border border-accent/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-primary" />
          <h3 className="text-lg text-foreground">Recommended for You</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 hover:bg-card/50 rounded-lg transition-colors disabled:opacity-50"
          title="Get new recommendation"
        >
          <RefreshCw className={`w-4 h-4 text-primary ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Album Cover - Click to open YouTube */}
      <a
        href={song.youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
      >
        <div className="relative bg-gradient-to-br from-primary via-accent to-secondary rounded-xl aspect-square overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
          {/* Album cover design */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Music className="w-10 h-10" />
            </div>
            <div className="text-center">
              <div className="text-xl font-bold mb-1 line-clamp-2">{song.songTitle}</div>
              <div className="text-sm opacity-90">{song.artist}</div>
            </div>
          </div>

          {/* Play overlay on hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-white">
              <ExternalLink className="w-8 h-8" />
              <span className="text-sm font-medium">Listen on YouTube</span>
            </div>
          </div>
        </div>
      </a>

      {/* Song info */}
      <div className="space-y-2">
        <div className="text-center">
          <div className="font-semibold text-foreground">{song.songTitle}</div>
          <div className="text-sm text-muted-foreground">{song.artist}</div>
        </div>

        <div className="bg-card/70 backdrop-blur-sm rounded-lg p-3 border border-border">
          <p className="text-sm text-foreground leading-relaxed">{song.reason}</p>
        </div>

        <a
          href={song.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground py-2.5 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <ExternalLink className="w-4 h-4" />
          Open in YouTube
        </a>
      </div>
    </div>
  );
}
