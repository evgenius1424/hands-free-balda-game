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
  noiseSuppression: true
};

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;

  async startProcessing(
    config: AudioConfig = DEFAULT_AUDIO_CONFIG,
    onAudioData: (audioData: ArrayBuffer) => void
  ): Promise<void> {
    try {
      // Get user media
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: config.sampleRate,
          channelCount: config.channelCount,
          echoCancellation: config.echoCancellation,
          noiseSuppression: config.noiseSuppression
        }
      });

      // Create audio context
      this.audioContext = new AudioContext({ sampleRate: config.sampleRate });
      this.source = this.audioContext.createMediaStreamSource(this.stream);

      // Create script processor
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer.getChannelData(0);

        // Convert float32 to int16
        const int16Buffer = new Int16Array(inputBuffer.length);
        for (let i = 0; i < inputBuffer.length; i++) {
          int16Buffer[i] = Math.max(-32768, Math.min(32767, inputBuffer[i] * 32767));
        }

        onAudioData(int16Buffer.buffer);
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error starting audio processing:', error);
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
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  isProcessing(): boolean {
    return this.audioContext !== null && this.audioContext.state === 'running';
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

export class VoskSpeechClient implements SpeechRecognitionClient {
  private ws: WebSocket | null = null;
  private audioProcessor: AudioProcessor;
  private resultCallback: ((result: any) => void) | null = null;
  private errorCallback: ((error: any) => void) | null = null;

  constructor() {
    this.audioProcessor = new AudioProcessor();
  }

  async connect(serverUrl: string, language: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${serverUrl}/ws/speech/${language}`);

      this.ws.onopen = () => {
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const result = JSON.parse(event.data);
          if (this.resultCallback) {
            this.resultCallback(result);
          }
        } catch (error) {
          if (this.errorCallback) {
            this.errorCallback(error);
          }
        }
      };

      this.ws.onerror = (error) => {
        if (this.errorCallback) {
          this.errorCallback(error);
        }
        reject(error);
      };

      this.ws.onclose = () => {
        this.ws = null;
      };
    });
  }

  disconnect(): void {
    this.stopRecognition();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  async startRecognition(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to server');
    }

    await this.audioProcessor.startProcessing(
      DEFAULT_AUDIO_CONFIG,
      (audioData) => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(audioData);
        }
      }
    );
  }

  stopRecognition(): void {
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