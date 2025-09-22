"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Volume2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface SpeechRecognitionProps {
  onWordDetected: (word: string, fullText: string) => void;
  isActive: boolean;
}

interface RecognitionResult {
  type: "partial" | "final";
  text: string;
  confidence?: number;
  timestamp: number;
  processing_time?: number;
}

export function SpeechRecognition({
  onWordDetected,
  isActive,
}: SpeechRecognitionProps) {
  const { t, locale, onLanguageChange } = useI18n();
  const [isListening, setIsListening] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const restartTimeout = useRef<NodeJS.Timeout | null>(null);

  const onWordDetectedRef = useRef(onWordDetected);
  useEffect(() => {
    onWordDetectedRef.current = onWordDetected;
  }, [onWordDetected]);

  const extractLastWord = useCallback((text: string) => {
    const cleaned = text
      .replace(/[\p{P}\p{S}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned) return "";
    const parts = cleaned.split(" ");
    return (parts[parts.length - 1] || "").toUpperCase();
  }, []);

  const connectToServer = useCallback(async () => {
    try {
      const language = locale === "ru" ? "ru" : "en";
      const ws = new WebSocket(`ws://localhost:8000/ws/speech/${language}`);

      ws.onopen = () => {
        setIsConnected(true);
        setError("");
        console.log("Connected to speech recognition server");
      };

      ws.onmessage = (event) => {
        try {
          const result: RecognitionResult = JSON.parse(event.data);

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
        if (isActive) {
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
        setError("Connection error");
        if (isActive) {
          scheduleReconnect();
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to connect to server:", error);
      setError("Failed to connect to speech server");
      if (isActive) {
        scheduleReconnect();
      }
    }
  }, [locale, isActive, extractLastWord]);

  const disconnectFromServer = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const startRecording = useCallback(async () => {
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
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);

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
      setError("Failed to start recording");
    }
  }, [isConnected]);

  const stopRecording = useCallback(() => {
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
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsListening(false);
    setTranscript("");
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!isActive) return;
    if (restartTimeout.current) {
      clearTimeout(restartTimeout.current);
    }
    restartTimeout.current = setTimeout(() => {
      connectToServer();
    }, 2000);
  }, [isActive, connectToServer]);

  useEffect(() => {
    const unsubscribe = onLanguageChange(() => {
      disconnectFromServer();
      stopRecording();
      setTranscript("");
      setError("");
      if (restartTimeout.current) {
        clearTimeout(restartTimeout.current);
      }
    });

    return unsubscribe;
  }, [onLanguageChange, disconnectFromServer, stopRecording]);

  useEffect(() => {
    if (isActive) {
      connectToServer();
    } else {
      stopRecording();
      disconnectFromServer();
      if (restartTimeout.current) {
        clearTimeout(restartTimeout.current);
      }
    }

    return () => {
      stopRecording();
      disconnectFromServer();
      if (restartTimeout.current) {
        clearTimeout(restartTimeout.current);
      }
    };
  }, [isActive, connectToServer, stopRecording, disconnectFromServer]);

  useEffect(() => {
    if (isActive && isConnected && !isListening) {
      startRecording();
    } else if (!isActive && isListening) {
      stopRecording();
    }
  }, [isActive, isConnected, isListening, startRecording, stopRecording]);

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

        {error && (
          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="text-sm text-destructive">{error}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
