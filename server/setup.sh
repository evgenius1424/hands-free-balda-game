#!/bin/bash

set -e  # Exit on any error

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Setting up Vosk Speech Recognition Server..."

# Change to the script directory (server directory)
cd "$SCRIPT_DIR"
echo "Working directory: $(pwd)"

# Verify we have the required files
if [ ! -f "requirements.txt" ]; then
    echo "Error: requirements.txt not found in $(pwd)"
    exit 1
fi

if [ ! -f "download_models.py" ]; then
    echo "Error: download_models.py not found in $(pwd)"
    exit 1
fi

# Function to check if a Python package is installed
check_package() {
    python -c "import $1" 2>/dev/null
}

# Function to check if virtual environment is activated
is_venv_active() {
    [ -n "$VIRTUAL_ENV" ]
}

# Check Python availability
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "Error: Python is not installed. Please install Python 3.7+ first."
    exit 1
fi

# Use python3 if available, otherwise python
PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

# Check if pip is available
if ! command -v pip &> /dev/null && ! command -v pip3 &> /dev/null; then
    echo "Error: pip is not installed. Please install pip first."
    exit 1
fi

PIP_CMD="pip3"
if ! command -v pip3 &> /dev/null; then
    PIP_CMD="pip"
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    $PYTHON_CMD -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi

# Activate virtual environment if not already active
if ! is_venv_active; then
    echo "Activating virtual environment..."
    source venv/bin/activate
    echo "✓ Virtual environment activated"
else
    echo "✓ Virtual environment already active"
fi

# Check if we need to upgrade pip
CURRENT_PIP_VERSION=$(pip --version | cut -d' ' -f2)
echo "Current pip version: $CURRENT_PIP_VERSION"

# Always try to upgrade pip (it's quick if already up to date)
echo "Checking for pip updates..."
pip install --upgrade pip --quiet

# Install setuptools for compatibility with Python 3.13
echo "Installing setuptools..."
pip install setuptools --quiet

# Check if requirements are already satisfied
echo "Checking Python dependencies..."
REQUIREMENTS_SATISFIED=true

while IFS= read -r line; do
    if [[ $line =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
        continue  # Skip comments and empty lines
    fi

    package_name=$(echo "$line" | cut -d'=' -f1 | cut -d'>' -f1 | cut -d'<' -f1 | cut -d'!' -f1)

    if ! pip show "$package_name" >/dev/null 2>&1; then
        REQUIREMENTS_SATISFIED=false
        break
    fi
done < requirements.txt

if [ "$REQUIREMENTS_SATISFIED" = true ]; then
    echo "✓ All Python dependencies already satisfied"
    # Check if versions match requirements
    echo "Verifying dependency versions..."
    pip check >/dev/null 2>&1 && echo "✓ All dependency versions compatible" || {
        echo "⚠ Some dependency versions may need updating, reinstalling..."
        REQUIREMENTS_SATISFIED=false
    }
fi

# Install dependencies if needed
if [ "$REQUIREMENTS_SATISFIED" = false ]; then
    echo "Installing/updating Python dependencies..."
    pip install -r requirements.txt

    # Check if installation was successful
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install dependencies. Trying with --no-cache-dir..."
        pip install --no-cache-dir -r requirements.txt
    fi
    echo "✓ Python dependencies installed"
fi

# Check if models exist
MODELS_EXIST=true
for model_dir in "models/vosk-model-small-en-us-0.15" "models/vosk-model-small-ru-0.22"; do
    if [ ! -d "$model_dir" ]; then
        MODELS_EXIST=false
        break
    fi
done

if [ "$MODELS_EXIST" = true ]; then
    echo "✓ Vosk models already downloaded"
else
    echo "Downloading Vosk models..."
    python download_models.py
    echo "✓ Vosk models downloaded"
fi

# Verify setup
echo ""
echo "Verifying setup..."

# Check if we can import required packages
if python -c "import vosk, websockets, fastapi, uvicorn" 2>/dev/null; then
    echo "✓ All required packages can be imported"
else
    echo "❌ Some packages failed to import. Setup may be incomplete."
    exit 1
fi

# Check if models exist
if [ -d "models/vosk-model-small-en-us-0.15" ] && [ -d "models/vosk-model-small-ru-0.22" ]; then
    echo "✓ Models are available"
else
    echo "❌ Models are missing. Setup may be incomplete."
    exit 1
fi

echo ""
echo "🎉 Setup complete! Environment is ready."
echo ""
echo "To run the server:"
echo "1. Activate virtual environment: source server/venv/bin/activate"
echo "2. Run server: python main.py"
echo ""
echo "Or use: npm run dev:server (which will activate venv automatically)"