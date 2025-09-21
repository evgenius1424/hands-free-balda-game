import asyncio
import json
import logging
import os
import time
import wave
from typing import Dict, Optional
import vosk
import websockets
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VoskSpeechRecognizer:
    def __init__(self):
        self.models: Dict[str, vosk.Model] = {}
        self.recognizers: Dict[str, vosk.KaldiRecognizer] = {}
        self.sample_rate = 16000

    def load_model(self, language: str, model_path: str):
        """Load Vosk model for specified language"""
        try:
            if not os.path.exists(model_path):
                logger.error(f"Model path does not exist: {model_path}")
                return False

            self.models[language] = vosk.Model(model_path)
            self.recognizers[language] = vosk.KaldiRecognizer(self.models[language], self.sample_rate)
            logger.info(f"Loaded {language} model from {model_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to load {language} model: {e}")
            return False

    def recognize_audio(self, audio_data: bytes, language: str = "en") -> Optional[Dict]:
        """Recognize speech from audio data"""
        if language not in self.recognizers:
            return {"error": f"Model for language '{language}' not loaded"}

        recognizer = self.recognizers[language]

        try:
            # Accept audio data and process it
            if recognizer.AcceptWaveform(audio_data):
                # Final result
                result = json.loads(recognizer.Result())
                return {
                    "type": "final",
                    "text": result.get("text", ""),
                    "confidence": result.get("confidence", 0.0),
                    "timestamp": time.time()
                }
            else:
                # Partial result
                partial = json.loads(recognizer.PartialResult())
                return {
                    "type": "partial",
                    "text": partial.get("partial", ""),
                    "timestamp": time.time()
                }
        except Exception as e:
            logger.error(f"Recognition error: {e}")
            return {"error": str(e)}

# Initialize speech recognizer
speech_recognizer = VoskSpeechRecognizer()

# Try to load models (you'll need to download these)
model_paths = {
    "en": "./models/vosk-model-small-en-us-0.15",
    "ru": "./models/vosk-model-small-ru-0.22"
}

for lang, path in model_paths.items():
    speech_recognizer.load_model(lang, path)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/speech/{language}")
async def websocket_endpoint(websocket: WebSocket, language: str = "en"):
    await manager.connect(websocket)
    logger.info(f"Client connected for {language} speech recognition")

    try:
        while True:
            # Receive audio data
            data = await websocket.receive_bytes()

            # Add timing for latency measurement
            start_time = time.time()

            # Process audio with Vosk
            result = speech_recognizer.recognize_audio(data, language)

            if result:
                # Add processing time to result
                result["processing_time"] = time.time() - start_time

                # Send result back to client
                await manager.send_personal_message(json.dumps(result), websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    available_models = list(speech_recognizer.models.keys())
    return {
        "status": "healthy",
        "available_models": available_models,
        "sample_rate": speech_recognizer.sample_rate
    }

@app.get("/models")
async def get_available_models():
    """Get list of available language models"""
    return {
        "models": list(speech_recognizer.models.keys()),
        "sample_rate": speech_recognizer.sample_rate
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)