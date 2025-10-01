"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Volume2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  useSpeechRecognitionConfig,
  useWordProcessor,
} from "@/hooks/use-language-config";

interface SpeechRecognitionProps {
  onWordDetected: (word: string, fullText: string) => void;
  isActive: boolean;
}

interface CustomSpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface VoskRecognitionResult {
  type: "partial" | "final";
  text: string;
  confidence?: number;
  timestamp: number;
  processing_time?: number;
}

type SpeechEngine = "webspeech" | "vosk";

const USE_VOSK = process.env.NEXT_PUBLIC_USE_VOSK === "true";

const VOSK_SERVER_URL =
  process.env.NEXT_PUBLIC_VOSK_SERVER_URL || "ws://localhost:8000";

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
  const [isLanguageSwitching, setIsLanguageSwitching] = useState(false);
  const [speechEngine] = useState<SpeechEngine>(
    USE_VOSK ? "vosk" : "webspeech",
  );

  // Web Speech API refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef("");
  const restartTimeout = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Vosk refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    } else if (speechEngine === "vosk") {
      // Cleanup Vosk
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
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
    return onLanguageChange(() => {
      setIsLanguageSwitching(true);
      setError("");
      cleanupRecognition();

      // Reset language switching state after a delay to allow reconnection
      setTimeout(() => {
        setIsLanguageSwitching(false);
      }, 3000);
    });
  }, [onLanguageChange, cleanupRecognition]);

  // Web Speech API implementation
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

  const connectToServer = useCallback(async () => {
    try {
      const language = locale === "ru" ? "ru" : "en";
      const ws = new WebSocket(`${VOSK_SERVER_URL}/ws/speech/${language}`);

      ws.onopen = () => {
        setIsConnected(true);
        setError("");
        console.log("Connected to speech recognition server");
      };

      ws.onmessage = (event) => {
        try {
          const result: VoskRecognitionResult = JSON.parse(event.data);

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
        } catch (error) {
          console.error("Error parsing result:", error);
          setError("Error parsing recognition result");
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log("Disconnected from speech recognition server");
        if (isActive && !isLanguageSwitching) {
          scheduleRestart();
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
        if (!isLanguageSwitching) {
          setError("Connection error");
        }
        if (isActive && !isLanguageSwitching) {
          scheduleRestart();
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to connect to server:", error);
      if (!isLanguageSwitching) {
        setError("Failed to connect to speech server");
      }
      if (isActive && !isLanguageSwitching) {
        scheduleRestart();
      }
    }
  }, [locale, isActive, isLanguageSwitching, extractLastWord]);

  const startVoskRecording = useCallback(async () => {
    try {
      if (!isConnected) {
        setError("Not connected to server");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      sourceRef.current =
        audioContextRef.current.createMediaStreamSource(stream);

      processorRef.current = audioContextRef.current.createScriptProcessor(
        4096,
        1,
        1,
      );

      processorRef.current.onaudioprocess = (event) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputBuffer = event.inputBuffer.getChannelData(0);

          const int16Buffer = new Int16Array(inputBuffer.length);
          for (let i = 0; i < inputBuffer.length; i++) {
            int16Buffer[i] = Math.max(
              -32768,
              Math.min(32767, inputBuffer[i] * 32767),
            );
          }

          wsRef.current.send(int16Buffer.buffer);
        }
      };

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      setIsListening(true);
      setError("");
    } catch (error) {
      console.error("Error starting recording:", error);
      if (!isLanguageSwitching) {
        setError("Failed to start recording");
      }
    }
  }, [isConnected, isLanguageSwitching]);

  const startListening = useCallback(() => {
    try {
      setTranscript("");
      transcriptRef.current = "";
      if (speechEngine === "webspeech") {
        recognitionRef.current?.start();
      }
    } catch (e) {}
  }, [speechEngine]);

  const scheduleRestart = useCallback(() => {
    if (!isActive || isLanguageSwitching) return;
    if (restartTimeout.current) {
      clearTimeout(restartTimeout.current);
    }
    restartTimeout.current = setTimeout(() => {
      if (speechEngine === "webspeech") {
        startListening();
      } else if (speechEngine === "vosk") {
        connectToServer();
      }
    }, 2000);
  }, [isActive, isLanguageSwitching, speechEngine, startListening, connectToServer]);

  useEffect(() => {
    if (isActive) {
      if (speechEngine === "webspeech") {
        initWebSpeech();
        startListening();
      } else if (speechEngine === "vosk") {
        connectToServer();
      }
    } else {
      cleanupRecognition();
      if (restartTimeout.current) {
        clearTimeout(restartTimeout.current);
      }
    }

    return () => {
      cleanupRecognition();
      if (restartTimeout.current) {
        clearTimeout(restartTimeout.current);
      }
    };
  }, [
    isActive,
    speechEngine,
    initWebSpeech,
    connectToServer,
    cleanupRecognition,
    startListening,
  ]);

  useEffect(() => {
    if (speechEngine === "vosk") {
      if (isActive && isConnected && !isListening) {
        startVoskRecording();
      }
    } else if (speechEngine === "webspeech") {
      if (isActive && isConnected && !isListening) {
        startListening();
      }
    }
  }, [
    isActive,
    isConnected,
    isListening,
    speechEngine,
    startVoskRecording,
    startListening,
  ]);

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

        {error && !isLanguageSwitching && (
          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="text-sm text-destructive">{error}</div>
          </div>
        )}

        {isLanguageSwitching && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700">{t("common.switchingLanguage")}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
