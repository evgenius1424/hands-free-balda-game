"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Volume2 } from "lucide-react";

interface SpeechRecognitionProps {
  onWordDetected: (word: string, fullText: string) => void;
  isActive: boolean;
  currentTeam: number;
}

export function SpeechRecognition({
  onWordDetected,
  isActive,
  currentTeam,
}: SpeechRecognitionProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastWord, setLastWord] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef<any | null>(null);
  const restartTimeout = useRef<NodeJS.Timeout | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Браузер не поддерживает распознавание речи");
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = "ru-RU";

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setError("");
    };

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t;
        } else {
          interimTranscript += t;
        }
      }

      const fullTranscript = (finalTranscript || interimTranscript).trim();
      setTranscript(fullTranscript);

      if (fullTranscript) {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        // ✅ Debounce detection to wait a little for more words
        debounceTimer.current = setTimeout(() => {
          const words = fullTranscript.split(/\s+/);
          const detectedWord = words[words.length - 1].toUpperCase();
          setLastWord(detectedWord);
          onWordDetected(detectedWord, fullTranscript);
        }, 800); // wait ~0.8s after last speech activity
      }
    };

    recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
      setError(`Ошибка распознавания: ${event.error}`);
      setIsListening(false);
      scheduleRestart();
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      scheduleRestart();
    };

    if (isActive) {
      startListening();
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      }
      if (restartTimeout.current) {
        clearTimeout(restartTimeout.current);
      }
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [onWordDetected, isActive]);

  const startListening = () => {
    try {
      recognitionRef.current?.start();
    } catch (e) {
      // Ignore if already started
    }
  };

  const scheduleRestart = () => {
    if (!isActive) return;
    if (restartTimeout.current) {
      clearTimeout(restartTimeout.current);
    }
    restartTimeout.current = setTimeout(() => {
      startListening();
    }, 500);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Volume2 className="w-5 h-5 text-primary" />
          Голосовой ввод
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-center space-y-2">
          <Badge
            variant={isListening ? "default" : "outline"}
            className="text-sm"
          >
            {isListening ? "Слушаю..." : "Ожидание"}
          </Badge>
          {!isActive && (
            <p className="text-xs text-muted-foreground">
              Дождитесь своего хода
            </p>
          )}
        </div>

        {transcript && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">
              Распознанный текст:
            </div>
            <div className="text-sm">{transcript}</div>
          </div>
        )}

        {lastWord && (
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="text-xs text-muted-foreground mb-1">
              Последнее слово:
            </div>
            <div className="text-lg font-bold text-primary">{lastWord}</div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="text-sm text-destructive">{error}</div>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center">
          Постоянный режим прослушивания активирован.
        </div>
      </CardContent>
    </Card>
  );
}
