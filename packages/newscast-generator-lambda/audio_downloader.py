"""
Audio file downloader for newscast generator Lambda.
"""

import json
import os
import urllib.request
import urllib.error
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)


def download_json(url: str) -> Optional[Dict[str, Any]]:
    """
    Download and parse JSON from URL.

    Args:
        url: URL to download JSON from

    Returns:
        Parsed JSON data or None if failed
    """
    try:
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (compatible; NewscastGenerator/1.0)'}
        )
        with urllib.request.urlopen(req, timeout=30) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                logger.info(f"Successfully downloaded JSON from {url}")
                return data
            else:
                logger.error(f"HTTP {response.status} when downloading {url}")
                return None
    except Exception as e:
        logger.error(f"Failed to download JSON from {url}: {str(e)}")
        return None


def download_audio_files(
    audio_files_data: Dict[str, Any],
    r2_base_url: str,
    newscast_id: str,
    topic_str: str,
    temp_dir: str
) -> List[str]:
    """
    Download all audio files listed in audio-files.json.

    Args:
        audio_files_data: Parsed audio-files.json data
        r2_base_url: Base R2 URL
        newscast_id: Newscast ID
        topic_str: Formatted topic string (e.g., "01")
        temp_dir: Temporary directory path

    Returns:
        List of downloaded file paths in correct order
    """
    downloaded_files = []

    # Extract audio files list - adapt based on actual JSON structure
    audio_files = audio_files_data.get('files', [])
    if not audio_files:
        # Try alternative structure
        audio_files = audio_files_data.get('audio_files', [])

    logger.info(f"Found {len(audio_files)} audio files to download")

    for i, file_info in enumerate(audio_files):
        try:
            # Handle different possible JSON structures
            if isinstance(file_info, str):
                filename = file_info
            elif isinstance(file_info, dict):
                # Try different field names
                filename = (
                    file_info.get('filename') or
                    file_info.get('file') or
                    file_info.get('name') or
                    file_info.get('file_path')  # Extract from full path
                )

                # If file_path contains directory, extract just the filename
                if filename and '/' in filename:
                    filename = filename.split('/')[-1]
            else:
                logger.warning(f"Unexpected file info format: {file_info}")
                continue

            if not filename:
                logger.warning(f"No filename found in file info: {file_info}")
                continue

            # Construct file URL
            file_url = f"{r2_base_url}newscasts/{newscast_id}/topic-{topic_str}/audio/{filename}"

            # Download file
            local_path = os.path.join(temp_dir, f"{i:03d}_{filename}")

            logger.info(f"Downloading {filename} from {file_url}")

            req = urllib.request.Request(
                file_url,
                headers={'User-Agent': 'Mozilla/5.0 (compatible; NewscastGenerator/1.0)'}
            )
            with urllib.request.urlopen(req, timeout=60) as response:
                if response.status == 200:
                    with open(local_path, 'wb') as f:
                        f.write(response.read())
                    downloaded_files.append(local_path)
                    logger.info(f"Downloaded {filename} ({os.path.getsize(local_path)} bytes)")
                else:
                    logger.error(f"HTTP {response.status} when downloading {filename}")

        except Exception as e:
            logger.error(f"Failed to download {filename}: {str(e)}")
            continue

    # Sort files to ensure correct order (important for concatenation)
    downloaded_files.sort()

    logger.info(f"Successfully downloaded {len(downloaded_files)} audio files")
    return downloaded_files