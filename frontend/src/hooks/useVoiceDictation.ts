"use client";

import { useSpeechToText } from "./useSpeechToText";
import { useCloudDictation } from "./useCloudDictation";

export type DictationMode = "browser" | "cloud" | "unsupported";

/**
 * Chrome/Edge get free, instant, zero-cost dictation via the browser's
 * built-in Web Speech API — nothing about that path changes here. Only
 * browsers without that support (Firefox, some Safari versions) fall
 * through to the cloud pipeline, which costs a small amount per use and
 * requires OPENAI_API_KEY configured on the backend.
 */
export function useVoiceDictation(onFinalResult: (text: string) => void) {
  const browser = useSpeechToText(onFinalResult);
  const cloud = useCloudDictation(onFinalResult);

  const usingCloud = !browser.isSupported && cloud.isSupported;
  const mode: DictationMode = browser.isSupported ? "browser" : cloud.isSupported ? "cloud" : "unsupported";

  return {
    mode,
    isSupported: mode !== "unsupported",
    isListening: usingCloud ? cloud.isListening : browser.isListening,
    isTranscribing: usingCloud ? cloud.isTranscribing : false,
    interimText: usingCloud ? "" : browser.interimText,
    error: usingCloud ? cloud.error : browser.error,
    start: usingCloud ? cloud.start : browser.start,
    stop: usingCloud ? cloud.stop : browser.stop,
  };
}
