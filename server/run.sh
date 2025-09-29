#!/bin/bash

set -e  # Exit on any error

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the script directory (server directory)
cd "$SCRIPT_DIR"

echo "Starting Vosk Speech Recognition Server..."
echo "Working directory: $(pwd)"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Please run setup first:"
    echo "./setup.sh"
    exit 1
fi

# Check if main.py exists
if [ ! -f "main.py" ]; then
    echo "Error: main.py not found in $(pwd)"
    exit 1
fi

# Function to kill process on port
kill_process_on_port() {
    local port=$1
    echo "Checking for processes on port $port..."

    # Find process using the port
    local pid=$(lsof -ti :$port 2>/dev/null || true)

    if [ -n "$pid" ]; then
        echo "Found process $pid using port $port. Killing it..."
        kill -9 $pid 2>/dev/null || true
        sleep 1

        # Verify it's killed
        if kill -0 $pid 2>/dev/null; then
            echo "Warning: Could not kill process $pid"
        else
            echo "✓ Process $pid killed successfully"
        fi
    else
        echo "✓ Port $port is available"
    fi
}

# Kill any existing process on port 8000
kill_process_on_port 8000

# Activate virtual environment and run server
echo "Activating virtual environment..."
source venv/bin/activate

echo "Starting server on port 8000..."
python main.py