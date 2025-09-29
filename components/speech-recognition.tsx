"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Volume2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  useSpeechRecognitionConfig,
  useWordProcessor,
} from "@/hooks/use-language-config";
import { VoskSpeechClient, RecognitionResult } from "@/lib/audio-utils";

interface SpeechRecognitionProps {
  onWordDetected: (word: string, fullText: string) => void;
  isActive: boolean;
}

interface CustomSpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

type SpeechEngine = "webspeech" | "vosk";

const USE_VOSK =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_USE_VOSK === "true";

export function SpeechRecognition({
  onWordDetected,
  isActive,
}: SpeechRecognitionProps) {
  console.log("Use vosk: " + USE_VOSK);
  const { t, locale, onLanguageChange } = useI18n();
  const speechConfig = useSpeechRecognitionConfig();
  const { transformWord } = useWordProcessor();
  const [isListening, setIsListening] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [speechEngine] = useState<SpeechEngine>(
    USE_VOSK ? "vosk" : "webspeech",
  );

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voskClientRef = useRef<VoskSpeechClient | null>(null);
  const transcriptRef = useRef("");
  const restartTimeout = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeout = useRef<NodeJS.Timeout | null>(null);

  const onWordDetectedRef = useRef(onWordDetected);
  useEffect(() => {
    onWordDetectedRef.current = onWordDetected;
  }, [onWordDetected]);

  const extractLastWord = useCallback(
    (text: string) => {
      const cleaned = text
        .replace(/[\p{P}\p{S}]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!cleaned) return "";
      const parts = cleaned.split(" ");
      const lastWord = (parts[parts.length - 1] || "").toUpperCase();
      return transformWord(lastWord);
    },
    [transformWord],
  );

  const cleanupRecognition = useCallback(() => {
    if (speechEngine === "webspeech" && recognitionRef.current) {
      recognitionRef.current.abort();
    } else if (speechEngine === "vosk" && voskClientRef.current) {
      voskClientRef.current.disconnect();
    }
    setIsListening(false);
    setIsConnected(false);
    setTranscript("");
    setError("");
    if (restartTimeout.current) {
      clearTimeout(restartTimeout.current);
    }
    if (silenceTimeout.current) {
      clearTimeout(silenceTimeout.current);
    }
  }, [speechEngine]);

  useEffect(() => {
    const unsubscribe = onLanguageChange(() => {
      cleanupRecognition();
    });

    return unsubscribe;
  }, [onLanguageChange, cleanupRecognition]);

  const initWebSpeech = useCallback(() => {
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
        setIsConnected(true);
        setError("");
      };

      recognition.onresult = (event: Event) => {
        const speechEvent = event as CustomSpeechRecognitionEvent;
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
        setIsConnected(false);
        if (isActive) {
          scheduleRestart();
        }
      };
    }
  }, [speechConfig.lang, extractLastWord, isActive, t]);

  const initVosk = useCallback(async () => {
    try {
      const voskClient = new VoskSpeechClient();
      voskClientRef.current = voskClient;

      voskClient.onResult((result: RecognitionResult) => {
        // @ts-ignore
        if (result.error) {
          // @ts-ignore
          console.error("Recognition error:", result.error);
          setError("Recognition error occurred");
          return;
        }

        if (result.type === "partial") {
          setTranscript(result.text);
        } else if (result.type === "final") {
          const finalText = result.text.trim();
          setTranscript(finalText);

          const detectedWord = extractLastWord(finalText);
          if (detectedWord && onWordDetectedRef.current) {
            onWordDetectedRef.current(detectedWord, finalText);
          }
        }
      });

      voskClient.onError((error) => {
        console.error("Vosk error:", error);
        setError("Connection error");
        setIsConnected(false);
        if (isActive) {
          scheduleRestart();
        }
      });

      const language = locale === "ru" ? "ru" : "en";
      await voskClient.connect("ws://localhost:8000", language);
      setIsConnected(true);
      setError("");

      if (isActive) {
        await voskClient.startRecognition();
        setIsListening(true);
      }
    } catch (error) {
      console.error("Failed to connect to Vosk server:", error);
      setError("Failed to connect to speech server");
      if (isActive) {
        scheduleRestart();
      }
    }
  }, [locale, extractLastWord, isActive]);

  useEffect(() => {
    if (speechEngine === "webspeech") {
      initWebSpeech();
      if (isActive) {
        startListening();
      }
    } else if (speechEngine === "vosk") {
      initVosk();
    }

    return () => {
      cleanupRecognition();
    };
  }, [isActive, speechEngine, initWebSpeech, initVosk, cleanupRecognition]);

  const startListening = useCallback(() => {
    try {
      setTranscript("");
      transcriptRef.current = "";
      if (speechEngine === "webspeech") {
        recognitionRef.current?.start();
      } else if (
        speechEngine === "vosk" &&
        voskClientRef.current?.isConnected()
      ) {
        voskClientRef.current.startRecognition();
        setIsListening(true);
      }
    } catch (e) {}
  }, [speechEngine]);

  const scheduleRestart = useCallback(() => {
    if (!isActive) return;
    if (restartTimeout.current) {
      clearTimeout(restartTimeout.current);
    }
    restartTimeout.current = setTimeout(() => {
      if (speechEngine === "webspeech") {
        startListening();
      } else if (speechEngine === "vosk") {
        initVosk();
      }
    }, 2000);
  }, [isActive, speechEngine, startListening, initVosk]);

  useEffect(() => {
    if (speechEngine === "webspeech") {
      if (isActive && isConnected && !isListening) {
        startListening();
      }
    } else if (speechEngine === "vosk") {
      if (
        isActive &&
        isConnected &&
        !isListening &&
        voskClientRef.current?.isConnected()
      ) {
        voskClientRef.current.startRecognition();
        setIsListening(true);
      } else if (!isActive && isListening && voskClientRef.current) {
        voskClientRef.current.stopRecognition();
        setIsListening(false);
      }
    }
  }, [isActive, isConnected, isListening, speechEngine, startListening]);

  return (
    <Card className="w-full max-w-md mx-auto relative">
      <CardHeader className="text-center">
        <div className="absolute right-4 top-4">
          <span
            className={`${
              isActive && isConnected && isListening
                ? "bg-emerald-500 animate-pulse"
                : isActive && isConnected
                  ? "bg-yellow-500"
                  : "bg-muted-foreground/40"
            } inline-block w-2.5 h-2.5 rounded-full`}
            aria-label={
              isActive && isConnected && isListening
                ? t("common.listening")
                : isActive && isConnected
                  ? "Connected"
                  : t("common.waiting")
            }
            title={
              isActive && isConnected && isListening
                ? t("common.listening")
                : isActive && isConnected
                  ? "Connected"
                  : t("common.waiting")
            }
          />
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          <Volume2 className="w-5 h-5 text-primary" />
          {t("common.voiceInput")}{" "}
          {speechEngine === "vosk" && (
            <span className="text-xs text-muted-foreground">(Vosk)</span>
          )}
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
