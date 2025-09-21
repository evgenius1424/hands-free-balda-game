# Vosk Speech Recognition Setup

This guide will help you set up the Vosk speech recognition server for your hands-free Balda game.

## Quick Start

1. **Set up the Python server:**
   ```bash
   npm run setup:server
   ```
   This will create a virtual environment, install Python dependencies and download the Vosk models.

2. **Start the speech recognition server:**
   ```bash
   npm run dev:server
   ```
   The server will start on `http://localhost:8000`

3. **Start the Next.js frontend:**
   ```bash
   npm run dev
   ```
   The frontend will start on `http://localhost:3000`

4. **Test speech recognition:**
   Navigate to `http://localhost:3000/debug` to access the debug interface.

## Status

✅ **English model**: Working
⚠️ **Russian model**: Currently having setup issues, English only for now

## Debug Interface Features

The debug interface (`/debug`) provides:

- **Language Selection**: Switch between English and Russian recognition
- **Real-time Connection Status**: See server connection state
- **Live Audio Processing**: Start/stop recording with one click
- **Quality Metrics**:
  - Total recognitions count
  - Average processing time
  - Average confidence scores
  - Latency measurements
  - Error count
- **Recognition Results**: View both partial and final recognition results
- **Performance Analysis**: Monitor recognition quality and delays

## How to Use

1. **Connect to Server**: Select your language (English/Russian) and click "Connect"
2. **Start Recording**: Click "Start Recording" to begin speech recognition
3. **Monitor Quality**: Watch the metrics panel for performance insights
4. **Analyze Results**: Review recognition accuracy in the results panel

## Troubleshooting

- **Connection Issues**: Make sure the Python server is running on port 8000
- **No Audio**: Check browser permissions for microphone access
- **Poor Recognition**: Try adjusting your distance from the microphone
- **High Latency**: Check your system performance and network connectivity

## Integration Notes

Once you're satisfied with the recognition quality, you can integrate the `VoskSpeechClient` from `lib/audio-utils.ts` into your main game components. The client provides a clean interface for:

- Connecting to the Vosk server
- Starting/stopping recognition
- Handling results and errors
- Managing audio processing

## Model Information

The setup downloads small Vosk models (~50MB each) for faster loading:
- English: `vosk-model-small-en-us-0.15`
- Russian: `vosk-model-small-ru-0.22`

For better accuracy in production, consider upgrading to larger models available at https://alphacephei.com/vosk/models