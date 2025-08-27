"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
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

        const fullTranscript = finalTranscript || interimTranscript;
        setTranscript(fullTranscript);

        if (finalTranscript) {
          const words = finalTranscript.trim().split(/\s+/);
          const detectedWord = words[words.length - 1].toUpperCase();
          setLastWord(detectedWord);
          onWordDetected(detectedWord, finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        setError(`Ошибка распознавания: ${event.error}`);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setError("Браузер не поддерживает распознавание речи");
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [onWordDetected]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript("");
      setLastWord("");
      setError("");
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // 🚀 обработка пробела
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && isActive && !error) {
        e.preventDefault(); // чтобы не скроллил страницу
        toggleListening();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isListening, isActive, error]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Volume2 className="w-5 h-5 text-primary" />
          Голосовой ввод
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-center">
          <Button
            onClick={toggleListening}
            disabled={!isActive || !!error}
            size="lg"
            variant={isListening ? "destructive" : "default"}
            className={cn(
              "w-20 h-20 rounded-full transition-all duration-300",
              isListening && "animate-pulse scale-110",
            )}
          >
            {isListening ? (
              <MicOff className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </Button>
        </div>

        <div className="text-center space-y-2">
          <Badge
            variant={isListening ? "default" : "outline"}
            className="text-sm"
          >
            {isListening ? "Слушаю..." : "Нажмите или пробел"}
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
          Можно нажать <b>Пробел</b> или кнопку для старта/стопа записи.
        </div>
      </CardContent>
    </Card>
  );
}
