"""Utility functions for the crawler."""

import json
import os
from datetime import datetime
from pathlib import Path

from .models import OutputConfig


def create_output_folder(output_config: OutputConfig) -> str:
    """Create output folder based on configuration."""
    if output_config.create_timestamp_folder:
        timestamp = datetime.now().isoformat().replace(":", "-").replace(".", "-")
        output_path = os.path.join(output_config.output_dir, timestamp)
    else:
        output_path = output_config.output_dir
    
    os.makedirs(output_path, exist_ok=True)
    return output_path


def save_json_file(file_path: str, data: dict | list) -> None:
    """Save data to JSON file."""
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def save_text_file(file_path: str, content: str) -> None:
    """Save content to text file."""
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)


def load_json_file(file_path: str) -> dict | list:
    """Load data from JSON file."""
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_latest_output_folder(base_output_dir: str) -> str | None:
    """Get the latest timestamped output folder."""
    if not os.path.exists(base_output_dir):
        return None
    
    folders = [
        d for d in os.listdir(base_output_dir)
        if os.path.isdir(os.path.join(base_output_dir, d))
    ]
    
    if not folders:
        return None
    
    latest_folder = sorted(folders)[-1]
    return os.path.join(base_output_dir, latest_folder)


def format_duration(seconds: float) -> str:
    """Format duration in seconds to human-readable string."""
    if seconds < 60:
        return f"{seconds:.3f}s"
    elif seconds < 3600:
        minutes = int(seconds // 60)
        secs = seconds % 60
        return f"{minutes}m {secs:.1f}s"
    else:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = seconds % 60
        return f"{hours}h {minutes}m {secs:.1f}s"