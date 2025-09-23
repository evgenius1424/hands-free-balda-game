"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Volume2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSpeechRecognitionConfig, useWordProcessor } from "@/hooks/use-language-config";

interface SpeechRecognitionProps {
  onWordDetected: (word: string, fullText: string) => void;
  isActive: boolean;
}

interface CustomSpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export function SpeechRecognition({
  onWordDetected,
  isActive,
}: SpeechRecognitionProps) {
  const { t, onLanguageChange } = useI18n();
  const speechConfig = useSpeechRecognitionConfig();
  const { transformWord } = useWordProcessor();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef("");
  const restartTimeout = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeout = useRef<NodeJS.Timeout | null>(null);

  const onWordDetectedRef = useRef(onWordDetected);
  useEffect(() => {
    onWordDetectedRef.current = onWordDetected;
  }, [onWordDetected]);

  useEffect(() => {
    const unsubscribe = onLanguageChange(() => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      setIsListening(false);
      setTranscript("");
      setError("");
      if (restartTimeout.current) {
        clearTimeout(restartTimeout.current);
      }
      if (silenceTimeout.current) {
        clearTimeout(silenceTimeout.current);
      }
    });

    return unsubscribe;
  }, [onLanguageChange]);

  useEffect(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setError(t("common.browserNoSpeech"));
      return;
    }

    recognitionRef.current = new SpeechRecognitionAPI();
    const recognition = recognitionRef.current;

    if (recognition) {
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechConfig.lang;
      // @ts-ignore
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError("");
      };

      recognition.onresult = (event: Event) => {
        const speechEvent = event as CustomSpeechRecognitionEvent;

        const extractLastWord = (text: string) => {
          const cleaned = text
            .replace(/[\p{P}\p{S}]+/gu, " ")
            .replace(/\s+/g, " ")
            .trim();
          if (!cleaned) return "";
          const parts = cleaned.split(" ");
          const lastWord = (parts[parts.length - 1] || "").toUpperCase();
          // Apply language-specific transformations
          return transformWord(lastWord);
        };

        let interimTranscript = "";

        for (
          let i = speechEvent.resultIndex;
          i < speechEvent.results.length;
          i++
        ) {
          const res = speechEvent.results[i];
          const text = res[0]?.transcript || "";
          if (res.isFinal) {
            const finalText = text.trim();
            setTranscript(finalText);
            transcriptRef.current = finalText;

            const detectedWord = extractLastWord(finalText);
            if (detectedWord) {
              onWordDetectedRef.current?.(detectedWord, finalText);
            }
          } else {
            interimTranscript += text;
          }
        }

        if (interimTranscript) {
          setTranscript(interimTranscript);
        }

        if (silenceTimeout.current) {
          clearTimeout(silenceTimeout.current);
        }
        if (isActive) {
          silenceTimeout.current = setTimeout(() => {
            try {
              recognitionRef.current?.stop();
            } catch (e) {}
          }, 900);
        }
      };

      // @ts-ignore
      recognition.onspeechstart = () => {
        if (silenceTimeout.current) {
          clearTimeout(silenceTimeout.current);
        }
      };

      // @ts-ignore
      recognition.onspeechend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error !== "no-speech") {
        }
        setIsListening(false);
        scheduleRestart();
      };

      recognition.onend = () => {
        setIsListening(false);
        if (isActive) {
          scheduleRestart();
        }
      };

      if (isActive) {
        startListening();
      }
    }

    return () => {
      if (recognitionRef.current) {
        const currentRecognition = recognitionRef.current;
        currentRecognition.onstart = null;
        currentRecognition.onresult = null;
        // @ts-ignore
        currentRecognition.onspeechend = null;
        // @ts-ignore
        currentRecognition.onspeechstart = null;
        currentRecognition.onerror = null;
        currentRecognition.onend = null;
        currentRecognition.abort();
      }
      if (restartTimeout.current) {
        clearTimeout(restartTimeout.current);
      }
      if (silenceTimeout.current) {
        clearTimeout(silenceTimeout.current);
      }
    };
  }, [isActive, speechConfig.lang, transformWord]);

  const startListening = () => {
    try {
      setTranscript("");
      transcriptRef.current = "";
      recognitionRef.current?.start();
    } catch (e) {}
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
    <Card className="w-full max-w-md mx-auto relative">
      <CardHeader className="text-center">
        <div className="absolute right-4 top-4">
          <span
            className={`${isActive && isListening ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"} inline-block w-2.5 h-2.5 rounded-full`}
            aria-label={
              isActive && isListening
                ? t("common.listening")
                : t("common.waiting")
            }
            title={
              isActive && isListening
                ? t("common.listening")
                : t("common.waiting")
            }
          />
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          <Volume2 className="w-5 h-5 text-primary" />
          {t("common.voiceInput")}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 min-h-16">
          <div className="text-xs text-muted-foreground mb-1">
            {t("common.recognizedText")}
          </div>
          <div className="text-lg font-bold text-primary min-h-10 h-10 overflow-hidden">
            {transcript || ""}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="text-sm text-destructive">{error}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
