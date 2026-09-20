"use client";

import { useCallback, useRef, useState } from "react";
import { apiUrl } from "@/lib/api-client";

/**
 * MediaRecorder produces a properly-decodable audio file only once you call
 * .stop() — a single long recording's early ondataavailable chunks usually
 * aren't independently valid audio for most codecs. So instead of one
 * continuous recording, this records in short, complete, non-overlapping
 * segments (stop → get a real file → transcribe → start the next segment),
 * which is the standard technique for feeding a batch (non-streaming)
 * transcription API and keeps things feeling close to continuous.
 */
const CHUNK_DURATION_MS = 6000;
// Skip uploading essentially-silent chunks — saves API calls/cost and avoids
// the model hallucinating text from near-empty audio.
const MIN_CHUNK_BYTES = 4000;

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

export function useCloudDictation(onFinalResult: (text: string) => void) {
  const [isSupported] = useState(
    () =>
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== "undefined"
  );
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const shouldContinueRef = useRef(false);
  const onFinalResultRef = useRef(onFinalResult);
  onFinalResultRef.current = onFinalResult;

  const uploadChunk = useCallback(async (blob: Blob) => {
    if (blob.size < MIN_CHUNK_BYTES) return;
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, `chunk.${extensionFor(blob.type)}`);
      const res = await fetch(apiUrl("/api/admin/transcribe"), {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Voice dictation couldn't reach the transcription service.");
        return;
      }
      const text = typeof data.text === "string" ? data.text.trim() : "";
      if (text) onFinalResultRef.current(text);
    } catch {
      setError("Voice dictation lost its connection. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const recordNextChunk = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || !shouldContinueRef.current) return;

    const mimeType = pickSupportedMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const localParts: BlobPart[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) localParts.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(localParts, { type: recorder.mimeType || "audio/webm" });
      // Uploads are awaited before starting the next chunk, trading a small
      // pause between phrases for guaranteed in-order transcription.
      await uploadChunk(blob);
      if (shouldContinueRef.current) recordNextChunk();
    };

    recorderRef.current = recorder;
    recorder.start();
    setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, CHUNK_DURATION_MS);
  }, [uploadChunk]);

  const start = useCallback(async () => {
    if (!isSupported) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      shouldContinueRef.current = true;
      setIsListening(true);
      recordNextChunk();
    } catch {
      setError("Microphone access was denied. Check your browser's site permissions and try again.");
    }
  }, [isSupported, recordNextChunk]);

  const stop = useCallback(() => {
    shouldContinueRef.current = false;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsListening(false);
  }, []);

  return { isSupported, isListening, isTranscribing, error, start, stop };
}
