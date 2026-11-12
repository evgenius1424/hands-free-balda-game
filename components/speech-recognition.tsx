"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function SpeechRecognition({ onWordDetected, isActive }: { onWordDetected: (word: string, fullText: string) => void; isActive: boolean }) {
  const { locale } = useI18n();
  const callback = useRef(onWordDetected);
  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState("");
  callback.current = onWordDetected;

  useEffect(() => {
    if (!isActive) { setStatus("idle"); return; }
    const API = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!API) { setStatus("unsupported"); return; }
    let stopped = false;
    let blocked = false;
    let restart: ReturnType<typeof setTimeout>;
    const recognition = new API();
    recognition.lang = locale === "ru" ? "ru-RU" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => setStatus("listening");
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = (result[0]?.transcript || "").trim();
        setTranscript(text);
        if (result.isFinal) {
          const words = text.replace(/[\p{P}\p{S}]+/gu, " ").trim().split(/\s+/);
          const word = words[words.length - 1];
          if (word) callback.current(word, text);
        }
      }
    };
    recognition.onerror = (event: any) => {
      if (["not-allowed", "service-not-allowed", "audio-capture"].includes(event.error)) {
        blocked = true;
        setStatus(event.error === "audio-capture" ? "microphone" : "denied");
      }
    };
    recognition.onend = () => {
      if (!stopped && !blocked) {
        setStatus("connecting");
        restart = setTimeout(() => { try { recognition.start(); } catch {} }, 500);
      }
    };
    setStatus("connecting");
    try { recognition.start(); } catch { setStatus("unsupported"); }
    return () => { stopped = true; clearTimeout(restart); recognition.onend = null; recognition.abort(); };
  }, [isActive, locale]);

  const ru = locale === "ru";
  const message = status === "listening" ? (ru ? "Слушаю" : "Listening") : status === "connecting" ? (ru ? "Подключаем микрофон" : "Starting microphone") : status === "denied" ? (ru ? "Разрешите доступ к микрофону в браузере" : "Allow microphone access in your browser") : status === "microphone" ? (ru ? "Микрофон не найден" : "Microphone not found") : status === "unsupported" ? (ru ? "Голосовой ввод недоступен. Введите слово ниже." : "Voice input is unavailable. Type a word below.") : (ru ? "Голос включится после начала игры" : "Voice starts when the game begins");
  return <div className="voice-status" role="status" aria-live="polite"><div className={`mic-icon ${status === "listening" ? "live" : ""}`}>{status === "listening" ? <Mic size={18}/> : <MicOff size={18}/>}</div><div><div className="voice-label">{message}{status === "listening" && <span className="live-dot"/>}</div><div className="voice-transcript">{transcript || (ru ? "Произнесите слово вслух" : "Say a word out loud")}</div></div></div>;
}
