# Vosk Speech Recognition Server

This server provides real-time speech recognition using Vosk models for Russian and English languages.

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Download Vosk models:
```bash
python download_models.py
```

3. Update model paths in `main.py` if needed (the download script will show you the correct paths)

4. Run the server:
```bash
python main.py
```

The server will start on `http://localhost:8000`

## API Endpoints

- `GET /health` - Health check and available models
- `GET /models` - List available language models
- `WS /ws/speech/{language}` - WebSocket endpoint for real-time speech recognition

## WebSocket Usage

Connect to `/ws/speech/en` for English or `/ws/speech/ru` for Russian.
Send audio data as binary WebSocket messages (16kHz, 16-bit, mono PCM).

Response format:
```json
{
  "type": "partial|final",
  "text": "recognized text",
  "confidence": 0.95,
  "timestamp": 1234567890.123,
  "processing_time": 0.05
}
```

## Audio Format

- Sample Rate: 16000 Hz
- Channels: 1 (mono)
- Bit Depth: 16-bit
- Format: PCM