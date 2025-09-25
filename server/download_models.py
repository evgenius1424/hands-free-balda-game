#!/usr/bin/env python3
"""
Script to download Vosk models for Russian and English speech recognition
"""

import os
import requests
import zipfile
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def download_file(url: str, filename: str) -> bool:
    """Download file from URL with progress"""
    try:
        logger.info(f"Downloading {filename}...")
        response = requests.get(url, stream=True)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0

        with open(filename, 'wb') as file:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    file.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        progress = (downloaded / total_size) * 100
                        print(f"\rProgress: {progress:.1f}%", end='')

        print()  # New line after progress
        logger.info(f"Downloaded {filename}")
        return True
    except Exception as e:
        logger.error(f"Failed to download {filename}: {e}")
        return False

def extract_zip(zip_path: str, extract_to: str) -> bool:
    """Extract zip file"""
    try:
        logger.info(f"Extracting {zip_path}...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_to)
        logger.info(f"Extracted to {extract_to}")
        return True
    except Exception as e:
        logger.error(f"Failed to extract {zip_path}: {e}")
        return False

def main():
    # Create models directory
    models_dir = "./models"
    os.makedirs(models_dir, exist_ok=True)

    # Model URLs (smaller models for faster download and testing)
    models = {
        "en": {
            "url": "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip",
            "filename": "vosk-model-small-en-us-0.15.zip",
            "folder": "vosk-model-small-en-us-0.15"
        },
        "ru": {
            "url": "https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip",
            "filename": "vosk-model-small-ru-0.22.zip",
            "folder": "vosk-model-small-ru-0.22"
        }
    }

    for lang, info in models.items():
        zip_path = os.path.join(models_dir, info["filename"])
        extract_path = os.path.join(models_dir, info["folder"])

        # Skip if already exists
        if os.path.exists(extract_path):
            logger.info(f"{lang} model already exists at {extract_path}")
            continue

        # Download model
        if download_file(info["url"], zip_path):
            # Extract model
            if extract_zip(zip_path, models_dir):
                # Remove zip file after extraction
                os.remove(zip_path)
                logger.info(f"Removed {zip_path}")
            else:
                logger.error(f"Failed to extract {lang} model")
        else:
            logger.error(f"Failed to download {lang} model")

    logger.info("Model download completed!")

    # Update the model paths in main.py
    logger.info("Don't forget to update model paths in main.py:")
    for lang, info in models.items():
        print(f'  "{lang}": "./models/{info["folder"]}"')

if __name__ == "__main__":
    main()