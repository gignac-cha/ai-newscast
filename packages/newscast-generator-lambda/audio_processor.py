"""
Audio processing using FFmpeg for newscast generator Lambda.
"""

import os
import subprocess
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)


def merge_audio_files(input_files: List[str], output_file: str, ffmpeg_path: Optional[str] = None) -> tuple[bool, int]:
    """
    Merge multiple audio files into one using FFmpeg.

    Args:
        input_files: List of input file paths
        output_file: Output file path
        ffmpeg_path: Optional custom FFmpeg binary path

    Returns:
        Tuple of (success status, merge duration in milliseconds)
    """
    import time
    merge_start_time = time.time()
    try:
        # Determine FFmpeg binary path
        if ffmpeg_path is None:
            # Try Lambda Layer first, then system
            ffmpeg_path = '/opt/bin/ffmpeg'
            if not os.path.exists(ffmpeg_path):
                logger.warning(f"FFmpeg not found at {ffmpeg_path}, trying system ffmpeg")
                ffmpeg_path = 'ffmpeg'  # Use system PATH

        logger.info(f"Using FFmpeg at: {ffmpeg_path}")

        # Make sure FFmpeg is executable (only if it's a file path)
        if os.path.exists(ffmpeg_path):
            os.chmod(ffmpeg_path, 0o755)

        # Create file list for FFmpeg concat
        filelist_path = os.path.join(os.path.dirname(output_file), 'filelist.txt')

        with open(filelist_path, 'w') as f:
            for file_path in input_files:
                # Escape single quotes in file paths
                escaped_path = file_path.replace("'", "'\"'\"'")
                f.write(f"file '{escaped_path}'\n")

        logger.info(f"Created file list with {len(input_files)} files")

        # FFmpeg command for concatenation
        cmd = [
            ffmpeg_path,
            '-f', 'concat',
            '-safe', '0',
            '-i', filelist_path,
            '-c', 'copy',  # Copy without re-encoding for speed
            '-y',  # Overwrite output file
            output_file
        ]

        logger.info(f"Running FFmpeg command: {' '.join(cmd)}")

        # Run FFmpeg
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )

        merge_end_time = time.time()
        merge_duration_ms = int((merge_end_time - merge_start_time) * 1000)

        if result.returncode == 0:
            output_size = os.path.getsize(output_file)
            logger.info(f"FFmpeg succeeded. Output file size: {output_size} bytes")
            return True, merge_duration_ms
        else:
            logger.error(f"FFmpeg failed with return code {result.returncode}")
            logger.error(f"FFmpeg stderr: {result.stderr}")
            return False, merge_duration_ms

    except subprocess.TimeoutExpired:
        merge_end_time = time.time()
        merge_duration_ms = int((merge_end_time - merge_start_time) * 1000)
        logger.error("FFmpeg command timed out")
        return False, merge_duration_ms
    except Exception as e:
        merge_end_time = time.time()
        merge_duration_ms = int((merge_end_time - merge_start_time) * 1000)
        logger.error(f"FFmpeg execution failed: {str(e)}")
        return False, merge_duration_ms