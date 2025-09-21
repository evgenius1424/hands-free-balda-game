"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RecognitionResult {
  type: "partial" | "final";
  text: string;
  confidence?: number;
  timestamp: number;
  processing_time?: number;
}

interface QualityMetrics {
  totalRecognitions: number;
  avgProcessingTime: number;
  avgConfidence: number;
  latency: number;
  errors: number;
}

export default function SpeechRecognitionDebug() {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [language, setLanguage] = useState<"en" | "ru">("en");
  const [results, setResults] = useState<RecognitionResult[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [metrics, setMetrics] = useState<QualityMetrics>({
    totalRecognitions: 0,
    avgProcessingTime: 0,
    avgConfidence: 0,
    latency: 0,
    errors: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const connectToServer = useCallback(async () => {
    try {
      const ws = new WebSocket(`ws://localhost:8000/ws/speech/${language}`);

      ws.onopen = () => {
        setIsConnected(true);
        console.log("Connected to speech recognition server");
      };

      ws.onmessage = (event) => {
        try {
          const result: RecognitionResult = JSON.parse(event.data);

          // @ts-ignore
          if (result.error) {
            // @ts-ignore
            console.error("Recognition error:", result.error);
            setMetrics((prev) => ({ ...prev, errors: prev.errors + 1 }));
            return;
          }

          setResults((prev) => {
            const newResults = [...prev, result];
            return newResults.slice(-20); // Keep last 20 results
          });

          if (result.type === "partial") {
            setCurrentText(result.text);
          } else if (result.type === "final") {
            setCurrentText("");

            // Update metrics
            setMetrics((prev) => {
              const newTotal = prev.totalRecognitions + 1;
              const newAvgProcessingTime =
                (prev.avgProcessingTime * prev.totalRecognitions +
                  (result.processing_time || 0)) /
                newTotal;
              const newAvgConfidence =
                (prev.avgConfidence * prev.totalRecognitions +
                  (result.confidence || 0)) /
                newTotal;

              return {
                ...prev,
                totalRecognitions: newTotal,
                avgProcessingTime: newAvgProcessingTime,
                avgConfidence: newAvgConfidence,
                latency: Date.now() - result.timestamp * 1000,
              };
            });
          }
        } catch (error) {
          console.error("Error parsing result:", error);
          setMetrics((prev) => ({ ...prev, errors: prev.errors + 1 }));
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log("Disconnected from speech recognition server");
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
        setMetrics((prev) => ({ ...prev, errors: prev.errors + 1 }));
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to connect to server:", error);
      setMetrics((prev) => ({ ...prev, errors: prev.errors + 1 }));
    }
  }, [language]);

  const disconnectFromServer = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      if (!isConnected) {
        alert("Please connect to server first");
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

      // Create audio context for processing
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      sourceRef.current =
        audioContextRef.current.createMediaStreamSource(stream);

      // Create script processor for real-time audio data
      processorRef.current = audioContextRef.current.createScriptProcessor(
        4096,
        1,
        1,
      );

      processorRef.current.onaudioprocess = (event) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputBuffer = event.inputBuffer.getChannelData(0);

          // Convert float32 to int16
          const int16Buffer = new Int16Array(inputBuffer.length);
          for (let i = 0; i < inputBuffer.length; i++) {
            int16Buffer[i] = Math.max(
              -32768,
              Math.min(32767, inputBuffer[i] * 32767),
            );
          }

          // Send to server
          wsRef.current.send(int16Buffer.buffer);
        }
      };

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      setMetrics((prev) => ({ ...prev, errors: prev.errors + 1 }));
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

    setIsRecording(false);
    setCurrentText("");
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setCurrentText("");
    setMetrics({
      totalRecognitions: 0,
      avgProcessingTime: 0,
      avgConfidence: 0,
      latency: 0,
      errors: 0,
    });
  }, []);

  useEffect(() => {
    return () => {
      disconnectFromServer();
      stopRecording();
    };
  }, [disconnectFromServer, stopRecording]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Speech Recognition Debug Interface</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center">
            <Select
              value={language}
              onValueChange={(value: "en" | "ru") => setLanguage(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ru">Russian</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={isConnected ? disconnectFromServer : connectToServer}
              variant={isConnected ? "destructive" : "default"}
            >
              {isConnected ? "Disconnect" : "Connect"}
            </Button>

            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              variant={isRecording ? "destructive" : "default"}
              disabled={!isConnected}
            >
              {isRecording ? "Stop Recording" : "Start Recording"}
            </Button>

            <Button onClick={clearResults} variant="outline">
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Recognition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[100px] p-4 border rounded bg-gray-50">
              {isRecording && (
                <div className="text-sm text-gray-500 mb-2">
                  {currentText ? "Partial:" : "Listening..."}
                </div>
              )}
              <div className="font-mono text-lg">
                {currentText || (isRecording ? "..." : "Not recording")}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quality Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Total Recognitions:</span>
              <Badge>{metrics.totalRecognitions}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Avg Processing Time:</span>
              <Badge>{metrics.avgProcessingTime.toFixed(3)}s</Badge>
            </div>
            <div className="flex justify-between">
              <span>Avg Confidence:</span>
              <Badge>{(metrics.avgConfidence * 100).toFixed(1)}%</Badge>
            </div>
            <div className="flex justify-between">
              <span>Latency:</span>
              <Badge>{metrics.latency.toFixed(0)}ms</Badge>
            </div>
            <div className="flex justify-between">
              <span>Errors:</span>
              <Badge variant={metrics.errors > 0 ? "destructive" : "default"}>
                {metrics.errors}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recognition Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {results.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No results yet. Start recording to see recognition results.
              </div>
            ) : (
              results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded ${
                    result.type === "final"
                      ? "bg-green-50 border-green-200"
                      : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <Badge
                      variant={
                        result.type === "final" ? "default" : "secondary"
                      }
                    >
                      {result.type}
                    </Badge>
                    <div className="text-xs text-gray-500">
                      {result.processing_time &&
                        `${result.processing_time.toFixed(3)}s`}
                      {result.confidence &&
                        ` | ${(result.confidence * 100).toFixed(1)}%`}
                    </div>
                  </div>
                  <div className="font-mono">{result.text || "(empty)"}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
