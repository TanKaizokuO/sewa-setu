"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Browser Web Speech API (no server, no key). Works in Chrome/Edge incl. Android.
type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void;
  onend: () => void;
  onerror: (e: { error: string }) => void;
};

export function useSpeechInput(lang: "hi" | "en", onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(false);
  const recRef = useRef<SR | null>(null);
  const cb = useRef(onFinal);
  cb.current = onFinal;

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const start = useCallback(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = lang === "hi" ? "hi-IN" : "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let text = "";
      let final = false;
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        if (e.results[i].isFinal) final = true;
      }
      setInterim(text);
      if (final) {
        setInterim("");
        cb.current(text.trim());
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }, [lang]);

  const stop = useCallback(() => recRef.current?.stop(), []);

  return { listening, interim, supported, start, stop };
}

/** Read text aloud (Hindi or English) with the browser's speech synthesis. */
export function speak(text: string, lang: "hi" | "en") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[*_#`>]/g, ""));
  u.lang = lang === "hi" ? "hi-IN" : "en-IN";
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang === u.lang);
  if (voice) u.voice = voice;
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}
