#!/usr/bin/env python3
"""
AWS Lambda function for newscast audio generation and merging using FFmpeg.

This Lambda function:
1. Downloads audio files from R2 storage based on audio-files.json
2. Merges them using FFmpeg into a single newscast MP3 file

Environment Variables:
- R2_PUBLIC_URL: R2 storage public URL (required)

Input:
- newscast_id: ID of the newscast (e.g., "2025-09-22T17-08-49-437Z")
- topic_index: Topic index 1-10
"""

import json
import os
import tempfile
import base64
from typing import Dict, Any
import logging

from audio_downloader import download_json, download_audio_files
from audio_processor import merge_audio_files
from utils import cleanup_temp_files, create_mock_audio_files, create_mock_output_file

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler function.

    Args:
        event: Lambda event containing newscast_id and topic_index
        context: Lambda context

    Returns:
        Response dictionary with success status and details
    """
    try:
        # Parse body if from API Gateway
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event

        # Extract parameters from body
        newscast_id = body.get('newscast_id')
        topic_index = body.get('topic_index')
        dry_run = body.get('dry_run', False)

        if not newscast_id or not topic_index:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'success': False,
                    'error': 'Missing required parameters: newscast_id and topic_index'
                })
            }

        if dry_run:
            logger.info("🏃‍♂️ DRY RUN MODE: Skipping actual downloads and uploads")

        logger.info(f"Processing newscast generation for {newscast_id}, topic {topic_index}")

        # Environment variables (required)
        r2_public_url = os.environ.get('R2_PUBLIC_URL')

        if not r2_public_url:
            return {
                'statusCode': 500,
                'body': json.dumps({
                    'success': False,
                    'error': 'Missing required environment variable: R2_PUBLIC_URL'
                })
            }

        # Ensure URL ends with /
        if not r2_public_url.endswith('/'):
            r2_public_url += '/'

        # Format topic index with zero padding
        topic_str = f"{int(topic_index):02d}"

        # Step 1: Download audio-files.json
        audio_files_url = f"{r2_public_url}newscasts/{newscast_id}/topic-{topic_str}/audio/audio-files.json"
        logger.info(f"Fetching audio files list from: {audio_files_url}")

        if dry_run:
            # Mock audio files data for dry run
            audio_files_data = {
                'files': [
                    '001-intro.mp3',
                    '002-host1-segment1.mp3',
                    '003-host2-segment1.mp3',
                    '004-outro.mp3'
                ]
            }
            logger.info("🏃‍♂️ DRY RUN: Using mock audio files data")
        else:
            audio_files_data = download_json(audio_files_url)
            if not audio_files_data:
                return {
                    'statusCode': 404,
                    'body': json.dumps({
                        'success': False,
                        'error': f'Audio files list not found: {audio_files_url}'
                    })
                }

        # Step 2: Download all MP3 files to /tmp
        temp_dir = tempfile.mkdtemp(prefix='newscast_', dir='/tmp')
        logger.info(f"Created temporary directory: {temp_dir}")

        if dry_run:
            # Create mock audio files for dry run
            audio_file_paths = create_mock_audio_files(temp_dir)
            logger.info("🏃‍♂️ DRY RUN: Created mock audio files")
        else:
            audio_file_paths = download_audio_files(audio_files_data, r2_public_url, newscast_id, topic_str, temp_dir)

            if not audio_file_paths:
                return {
                    'statusCode': 500,
                    'body': json.dumps({
                        'success': False,
                        'error': 'No audio files were successfully downloaded'
                    })
                }

        # Step 3: Merge audio files using FFmpeg
        output_file = os.path.join(temp_dir, f'newscast-topic-{topic_str}.mp3')

        if dry_run:
            # Create mock merged output file for dry run
            create_mock_output_file(output_file)
            merge_success = True
            logger.info("🏃‍♂️ DRY RUN: Created mock merged output file")
        else:
            # Get FFmpeg path from environment (optional)
            ffmpeg_path = os.environ.get('FFMPEG_PATH')
            merge_success = merge_audio_files(audio_file_paths, output_file, ffmpeg_path)

            if not merge_success:
                return {
                    'statusCode': 500,
                    'body': json.dumps({
                        'success': False,
                        'error': 'Failed to merge audio files with FFmpeg'
                    })
                }

        # Read and encode the merged file
        with open(output_file, 'rb') as f:
            audio_data = f.read()

        audio_base64 = base64.b64encode(audio_data).decode('utf-8')

        # Clean up temporary files
        cleanup_temp_files(temp_dir)

        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'newscast_id': newscast_id,
                'topic_index': topic_index,
                'message': f'Successfully generated newscast for topic {topic_index}' + (' (DRY RUN)' if dry_run else ''),
                'audio_files_processed': len(audio_file_paths),
                'output_file_size': len(audio_data),
                'audio_base64': audio_base64,
                'dry_run': dry_run
            })
        }

    except Exception as e:
        logger.error(f"Lambda execution failed: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({
                'success': False,
                'error': f'Internal server error: {str(e)}'
            })
        }