#!/bin/bash

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Please run setup first:"
    echo "./setup.sh"
    exit 1
fi

# Activate virtual environment and run server
echo "Starting Vosk Speech Recognition Server..."
source venv/bin/activate
python main.py