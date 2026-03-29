"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Loader2 } from "lucide-react";

interface VoiceRecorderProps {
  onAudioReady?: (blob: Blob) => void;
  onRecordingStart?: () => void;
  onRecordingEnd?: () => void;
}

export function VoiceRecorder({
  onAudioReady,
  onRecordingStart,
  onRecordingEnd,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedTime, setRecordedTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [playbackActive, setPlaybackActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);

      // Set up audio context for visualization
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const audioContext = audioContextRef.current;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        onAudioReady?.(blob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      setIsRecording(true);
      setRecordedTime(0);
      onRecordingStart?.();

      // Visualize
      visualizeAudio();

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordedTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError("Failed to access microphone. Please check permissions.");
      console.error("Recording error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => {
        track.stop();
      });

      setIsRecording(false);
      onRecordingEnd?.();

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    }
  };

  const visualizeAudio = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const analyser = analyserRef.current;

    if (!ctx) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = "rgb(255, 250, 237)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "rgb(153, 176, 237)";
      const barWidth = (canvas.width / dataArray.length) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }

      animationIdRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const handlePlayback = async () => {
    if (!audioBlob) return;

    setPlaybackActive(true);

    try {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setPlaybackActive(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.play().catch(() => {
        setError("Failed to play audio");
        setPlaybackActive(false);
      });
    } catch (err) {
      setError("Failed to play audio");
      setPlaybackActive(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {/* Recording Controls */}
      <div className="flex gap-3">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Mic className="w-5 h-5" />
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex-1 flex items-center justify-center gap-2 bg-destructive text-primary-foreground py-3 rounded-lg hover:bg-destructive/90 transition-colors font-medium"
          >
            <Square className="w-5 h-5" />
            Stop Recording
          </button>
        )}
      </div>

      {/* Timer */}
      {isRecording && (
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Recording</div>
          <div className="text-2xl font-medium text-foreground">{formatTime(recordedTime)}</div>
        </div>
      )}

      {/* Waveform Visualization */}
      {isRecording && (
        <canvas
          ref={canvasRef}
          width={300}
          height={80}
          className="w-full border border-border rounded-lg bg-background"
        />
      )}

      {/* Recording Preview */}
      {audioBlob && !isRecording && (
        <div className="space-y-3 bg-card rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Recording ready</div>
              <div className="text-sm font-medium text-foreground">
                {(audioBlob.size / 1024).toFixed(1)} KB
              </div>
            </div>
            <button
              onClick={handlePlayback}
              disabled={playbackActive}
              className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              title="Play recording"
            >
              <Play className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => {
              setAudioBlob(null);
              setRecordedTime(0);
            }}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Discard & Re-record
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
