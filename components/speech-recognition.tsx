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

// A global interface for the SpeechRecognitionEvent to satisfy TypeScript
// in different browser environments.
interface CustomSpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
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

  // Refs to hold instances and values that shouldn't trigger re-renders
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef(""); // Use a ref to hold the latest transcript for event handlers
  const restartTimeout = useRef<NodeJS.Timeout | null>(null);

  // Ref to hold the latest onWordDetected function to avoid stale closures
  const onWordDetectedRef = useRef(onWordDetected);
  useEffect(() => {
    onWordDetectedRef.current = onWordDetected;
  }, [onWordDetected]);

  useEffect(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setError("Браузер не поддерживает распознавание речи");
      return;
    }

    recognitionRef.current = new SpeechRecognitionAPI();
    const recognition = recognitionRef.current;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "ru-RU";
    // Limit to the most likely hypothesis
    // @ts-ignore
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError("");
    };

    // This event updates the transcript in real-time.
    recognition.onresult = (event: Event) => {
      const speechEvent = event as CustomSpeechRecognitionEvent;

      // Helper to extract the last word robustly (letters/numbers), uppercased
      const extractLastWord = (text: string) => {
        const cleaned = text
          .replace(/[\p{P}\p{S}]+/gu, " ") // remove punctuation/symbols
          .replace(/\s+/g, " ")
          .trim();
        if (!cleaned) return "";
        const parts = cleaned.split(" ");
        return (parts[parts.length - 1] || "").toUpperCase();
      };

      // Build interim transcript for UI responsiveness
      let interimTranscript = "";

      for (let i = speechEvent.resultIndex; i < speechEvent.results.length; i++) {
        const res = speechEvent.results[i];
        const text = res[0]?.transcript || "";
        if (res.isFinal) {
          const finalText = text.trim();
          // Update transcript states to the final phrase text
          setTranscript(finalText);
          transcriptRef.current = finalText;

          // Detect and emit the last word of the final phrase text
          const detectedWord = extractLastWord(finalText);
          if (detectedWord) {
            setLastWord(detectedWord);
            onWordDetectedRef.current?.(detectedWord, finalText);
          }
        } else {
          interimTranscript += text;
        }
      }

      if (interimTranscript) {
        setTranscript(interimTranscript);
        // do not update transcriptRef on interim to avoid premature detections
      }
    };

    // Keep onspeechend minimal; primary detection occurs in onresult when results are final.
    recognition.onspeechend = () => {
      setIsListening(false);
      // Let the service end naturally; onend will handle restart if needed.
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // We only schedule a restart on an actual error to make the service resilient.
      if (event.error !== "no-speech") {
        // setError(`Ошибка распознавания: ${event.error}`);
      }
      setIsListening(false);
      scheduleRestart();
    };

    // This event fires when the recognition service disconnects.
    // We restart automatically to keep constant listening when active.
    recognition.onend = () => {
      setIsListening(false);
      if (isActive) {
        // Small delay helps avoid immediate start errors in some browsers
        scheduleRestart();
      }
    };

    // Start listening if the component is active
    if (isActive) {
      startListening();
    }

    // Cleanup function to stop recognition and clear timeouts
    return () => {
      if (recognition) {
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onspeechend = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.abort();
      }
      if (restartTimeout.current) {
        clearTimeout(restartTimeout.current);
      }
    };
  }, [isActive]);

  const startListening = () => {
    try {
      // Clear previous transcript when starting a new listening session
      setTranscript("");
      transcriptRef.current = "";
      setLastWord("");
      recognitionRef.current?.start();
    } catch (e) {
      // Ignore errors if recognition is already running.
    }
  };

  // Schedules a restart of the speech recognition service ONLY upon error.
  const scheduleRestart = () => {
    if (!isActive) return;
    if (restartTimeout.current) {
      clearTimeout(restartTimeout.current);
    }
    restartTimeout.current = setTimeout(() => {
      startListening();
    }, 500); // A brief delay before restarting.
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
