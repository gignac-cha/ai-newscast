"""
Utility functions for newscast generator Lambda.
"""

import os
import shutil
import logging

logger = logging.getLogger(__name__)


def cleanup_temp_files(temp_dir: str) -> None:
    """
    Clean up temporary files and directory.

    Args:
        temp_dir: Temporary directory to clean up
    """
    try:
        shutil.rmtree(temp_dir)
        logger.info(f"Cleaned up temporary directory: {temp_dir}")
    except Exception as e:
        logger.warning(f"Failed to clean up temporary directory {temp_dir}: {str(e)}")


def create_mock_audio_files(temp_dir: str, file_count: int = 4) -> list[str]:
    """
    Create mock audio files for dry run testing.

    Args:
        temp_dir: Temporary directory path
        file_count: Number of mock files to create

    Returns:
        List of created mock file paths
    """
    mock_files = []
    mock_filenames = [
        '001_intro.mp3',
        '002_host1-segment1.mp3',
        '003_host2-segment1.mp3',
        '004_outro.mp3'
    ]

    for i in range(file_count):
        filename = mock_filenames[i] if i < len(mock_filenames) else f'{i+1:03d}_mock.mp3'
        file_path = os.path.join(temp_dir, filename)

        with open(file_path, 'wb') as f:
            f.write(b'mock audio data')

        mock_files.append(file_path)

    logger.info(f"Created {len(mock_files)} mock audio files")
    return mock_files


def create_mock_output_file(output_path: str) -> None:
    """
    Create mock merged output file for dry run testing.

    Args:
        output_path: Path where to create the mock output file
    """
    with open(output_path, 'wb') as f:
        f.write(b'mock merged audio data - longer content for realistic size')

    logger.info(f"Created mock output file: {output_path}")