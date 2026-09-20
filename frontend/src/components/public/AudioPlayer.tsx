"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, Download } from "lucide-react";

export default function AudioPlayer({
  audioUrl,
  title,
}: {
  audioUrl: string;
  title: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateDuration = () => setDuration(audio.duration);
    const updateTime = () => setCurrentTime(audio.currentTime);

    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("ended", () => setIsPlaying(false));

    return () => {
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("ended", () => setIsPlaying(false));
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-2xl border border-parchment-300 bg-gradient-to-br from-parchment-50 to-parchment-100 p-6 dark:border-ink-800 dark:from-ink-900 dark:to-ink-800">
      <audio ref={audioRef} src={audioUrl} crossOrigin="anonymous" />

      <div className="mb-4 flex items-center gap-3">
        <Volume2 size={20} className="text-gold-700 dark:text-gold-400" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-700 dark:text-gold-400">
            Listen
          </p>
          <p className="font-medium text-ink-900 dark:text-parchment-50">
            Audio Version
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlay}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-900 text-parchment-50 transition hover:bg-ink-800 dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>

          <div className="flex-1">
            <div className="h-1 w-full rounded-full bg-parchment-300 dark:bg-ink-700">
              <div
                className="h-1 rounded-full bg-gold-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-ink-500 dark:text-parchment-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <a
            href={audioUrl}
            download={`${title}.mp3`}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-parchment-300 px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-parchment-200 dark:border-ink-700 dark:text-parchment-300 dark:hover:bg-ink-800"
          >
            <Download size={16} />
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
