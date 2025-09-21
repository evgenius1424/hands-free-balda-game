#!/bin/bash

echo "Setting up Vosk Speech Recognition Server..."

# Check if pip is available
if ! command -v pip &> /dev/null; then
    echo "Error: pip is not installed. Please install Python and pip first."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Check if installation was successful
if [ $? -ne 0 ]; then
    echo "Error: Failed to install dependencies. Trying with --no-cache-dir..."
    pip install --no-cache-dir -r requirements.txt
fi

# Download models
echo "Downloading Vosk models..."
python download_models.py

echo "Setup complete! To run the server:"
echo "1. Activate virtual environment: source server/venv/bin/activate"
echo "2. Run server: python main.py"
echo ""
echo "Or use: npm run dev:server (which will activate venv automatically)"