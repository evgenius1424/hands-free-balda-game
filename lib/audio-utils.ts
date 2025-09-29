export interface AudioConfig {
  sampleRate: number;
  channelCount: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 16000,
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
};

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;

  async startProcessing(
    config: AudioConfig = DEFAULT_AUDIO_CONFIG,
    onAudioData: (audioData: ArrayBuffer) => void,
  ): Promise<void> {
    try {
      console.log("Starting audio processing with config:", config);

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia not supported in this browser");
      }

      // Get user media with detailed error handling
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: config.sampleRate,
            channelCount: config.channelCount,
            echoCancellation: config.echoCancellation,
            noiseSuppression: config.noiseSuppression,
          },
        });
        console.log("Microphone access granted, stream obtained");
      } catch (mediaError) {
        console.error("Failed to get user media:", mediaError);
        // @ts-ignore
        const { message, name } = mediaError;
        if (name === "NotAllowedError") {
          throw new Error(
            "Microphone access denied. Please allow microphone access and try again.",
          );
        } else if (name === "NotFoundError") {
          throw new Error(
            "No microphone found. Please connect a microphone and try again.",
          );
        } else {
          throw new Error(`Failed to access microphone: ${message}`);
        }
      }

      // Create audio context
      this.audioContext = new AudioContext({ sampleRate: config.sampleRate });
      console.log(
        "Audio context created with sample rate:",
        this.audioContext.sampleRate,
      );

      this.source = this.audioContext.createMediaStreamSource(this.stream);

      // Create script processor
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (event) => {
        try {
          const inputBuffer = event.inputBuffer.getChannelData(0);

          // Convert float32 to int16
          const int16Buffer = new Int16Array(inputBuffer.length);
          for (let i = 0; i < inputBuffer.length; i++) {
            int16Buffer[i] = Math.max(
              -32768,
              Math.min(32767, inputBuffer[i] * 32767),
            );
          }

          onAudioData(int16Buffer.buffer);
        } catch (processingError) {
          console.error("Error processing audio data:", processingError);
        }
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      console.log("Audio processing pipeline connected successfully");
    } catch (error) {
      console.error("Error starting audio processing:", error);
      this.stopProcessing(); // Clean up on error
      throw error;
    }
  }

  stopProcessing(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  isProcessing(): boolean {
    return this.audioContext !== null && this.audioContext.state === "running";
  }
}

export interface SpeechRecognitionClient {
  connect(serverUrl: string, language: string): Promise<void>;
  disconnect(): void;
  startRecognition(): Promise<void>;
  stopRecognition(): void;
  onResult(callback: (result: any) => void): void;
  onError(callback: (error: any) => void): void;
  isConnected(): boolean;
  isRecognizing(): boolean;
}

export interface RecognitionResult {
  type: "partial" | "final";
  text: string;
  confidence?: number;
  timestamp: number;
  processing_time?: number;
}

export class VoskSpeechClient implements SpeechRecognitionClient {
  private ws: WebSocket | null = null;
  private audioProcessor: AudioProcessor;
  private resultCallback: ((result: any) => void) | null = null;
  private errorCallback: ((error: any) => void) | null = null;
  private serverUrl: string = "";
  private language: string = "";
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isManualDisconnect: boolean = false;

  constructor() {
    this.audioProcessor = new AudioProcessor();
  }

  async connect(serverUrl: string, language: string): Promise<void> {
    this.serverUrl = serverUrl;
    this.language = language;
    this.isManualDisconnect = false;

    return this.attemptConnection();
  }

  private async attemptConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${this.serverUrl}/ws/speech/${this.language}`;
      console.log(`Attempting to connect to WebSocket: ${wsUrl}`);

      this.ws = new WebSocket(wsUrl);

      const connectionTimeout = setTimeout(() => {
        console.error("WebSocket connection timeout");
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
          reject(new Error("Connection timeout"));
        }
      }, 10000);

      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log("WebSocket connected successfully");
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const result = JSON.parse(event.data);
          console.log("Received result:", result);
          if (this.resultCallback) {
            this.resultCallback(result);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
          if (this.errorCallback) {
            this.errorCallback(error);
          }
        }
      };

      this.ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error("WebSocket error occurred:", error);
        if (this.errorCallback) {
          this.errorCallback(error);
        }
        if (this.ws?.readyState === WebSocket.CONNECTING) {
          reject(error);
        }
      };

      this.ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log(
          `WebSocket closed. Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`,
        );
        this.ws = null;

        if (
          !this.isManualDisconnect &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.scheduleReconnection();
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error("Max reconnection attempts reached");
          if (this.errorCallback) {
            this.errorCallback(new Error("Max reconnection attempts reached"));
          }
        }
      };
    });
  }

  private scheduleReconnection(): void {
    this.reconnectAttempts++;
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts - 1),
      30000,
    ); // Exponential backoff, max 30s

    console.log(
      `Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`,
    );

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.attemptConnection();
      } catch (error) {
        console.error("Reconnection attempt failed:", error);
      }
    }, delay);
  }

  disconnect(): void {
    console.log("Manually disconnecting WebSocket");
    this.isManualDisconnect = true;
    this.stopRecognition();

    // Clear any pending reconnection attempts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  async startRecognition(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Not connected to server");
    }

    console.log("Starting recognition with audio processing");

    try {
      await this.audioProcessor.startProcessing(
        DEFAULT_AUDIO_CONFIG,
        (audioData) => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            // Only send audio data if WebSocket is open
            try {
              this.ws.send(audioData);
            } catch (sendError) {
              console.error("Error sending audio data:", sendError);
              // Don't throw here, just log - the connection might recover
            }
          } else {
            console.warn("WebSocket not open, skipping audio data send");
          }
        },
      );
      console.log("Recognition started successfully");
    } catch (error) {
      console.error("Failed to start recognition:", error);
      // If audio processing fails, notify error callback
      if (this.errorCallback) {
        this.errorCallback(error);
      }
      throw error;
    }
  }

  stopRecognition(): void {
    console.log("Stopping recognition");
    this.audioProcessor.stopProcessing();
  }

  onResult(callback: (result: any) => void): void {
    this.resultCallback = callback;
  }

  onError(callback: (error: any) => void): void {
    this.errorCallback = callback;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  isRecognizing(): boolean {
    return this.audioProcessor.isProcessing();
  }
}
