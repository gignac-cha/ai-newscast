#!/usr/bin/env python3
"""
AWS Lambda function for newscast audio generation and merging using FFmpeg with metrics.
"""

import json
import os
import tempfile
import base64
import time
from typing import Dict, Any
import logging

from audio_downloader import download_json, download_audio_files
from audio_processor import merge_audio_files
from utils import cleanup_temp_files, create_mock_audio_files, create_mock_output_file

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handle_help() -> Dict[str, Any]:
    """
    Handle help/info endpoint.

    Returns:
        Lambda response dict with API information
    """
    help_data = {
        'name': 'AI Newscast Generator Lambda',
        'description': 'AWS Lambda function for newscast audio generation and merging using FFmpeg',
        'version': '1.0.0',
        'endpoints': {
            'POST /newscast': 'Merge audio files into final newscast MP3'
        },
        'parameters': {
            'newscast_id': 'Newscast ID (format: YYYY-MM-DDTHH-MM-SS-NNNNNNZ)',
            'topic_index': 'Topic index (1-10)',
            'dry_run': 'Optional: Skip actual processing (default: false)'
        },
        'usage': {
            'newscast': 'Download audio files from R2, merge with FFmpeg, return base64-encoded MP3'
        },
        'environment': {
            'R2_PUBLIC_URL': 'Cloudflare R2 public URL for audio files',
            'FFMPEG_PATH': 'Path to FFmpeg binary (optional, uses system default if not set)'
        },
        'integration': {
            'api_gateway': 'REST API with Lambda Proxy Integration',
            'method': 'POST',
            'timeout': '29 seconds'
        }
    }

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json'
        },
        'body': json.dumps(help_data, indent=2)
    }


def handle_newscast(body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle newscast audio generation and merging.

    Args:
        body: Request body containing newscast_id, topic_index, and optional dry_run

    Returns:
        Lambda response dict with statusCode and body
    """
    # Extract parameters
    newscast_id = body.get('newscast_id')
    topic_index = body.get('topic_index')
    dry_run = body.get('dry_run', False)

    if not newscast_id or not topic_index:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'success': False,
                'error': 'Missing required parameters: newscast_id and topic_index'
            })
        }

    # Start timing
    lambda_start_time = time.time()
    started_at_iso = time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime(lambda_start_time))

    logger.info(f"Processing newscast generation for {newscast_id}, topic {topic_index}")

    # Environment variables
    r2_public_url = os.environ.get('R2_PUBLIC_URL')
    if not r2_public_url:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'success': False, 'error': 'Missing R2_PUBLIC_URL'})
        }

    if not r2_public_url.endswith('/'):
        r2_public_url += '/'

    # Format topic index
    topic_str = f"{int(topic_index):02d}"

    # Step 1: Download audio-files.json
    audio_files_url = f"{r2_public_url}newscasts/{newscast_id}/topic-{topic_str}/audio/audio-files.json"
    logger.info(f"Fetching: {audio_files_url}")

    if dry_run:
        audio_files_data = {'audioFiles': []}
        logger.info("DRY RUN: Using mock data")
    else:
        audio_files_data = download_json(audio_files_url)
        if not audio_files_data:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'success': False,
                    'error': f'Audio files list not found: {audio_files_url}'
                })
            }

    # Step 2: Download audio files with metrics
    temp_dir = tempfile.mkdtemp(prefix='newscast_', dir='/tmp')
    logger.info(f"Created temp dir: {temp_dir}")

    download_start_time = time.time()

    if dry_run:
        audio_file_paths = create_mock_audio_files(temp_dir)
        download_metrics = []
    else:
        audio_file_paths, download_metrics = download_audio_files(
            audio_files_data, r2_public_url, newscast_id, topic_str, temp_dir
        )

        if not audio_file_paths:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'success': False,
                    'error': 'No audio files downloaded'
                })
            }

    download_end_time = time.time()
    download_duration_ms = int((download_end_time - download_start_time) * 1000)

    # Step 3: Merge audio files with timing
    output_file = os.path.join(temp_dir, f'newscast-topic-{topic_str}.mp3')
    merge_start_time = time.time()

    if dry_run:
        create_mock_output_file(output_file)
        merge_success = True
        merge_duration_ms = 0
    else:
        ffmpeg_path = os.environ.get('FFMPEG_PATH')
        merge_success, merge_duration_ms = merge_audio_files(audio_file_paths, output_file, ffmpeg_path)

        if not merge_success:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'success': False,
                    'error': 'Failed to merge audio files'
                })
            }

    # Read merged file
    with open(output_file, 'rb') as f:
        audio_data = f.read()

    audio_base64 = base64.b64encode(audio_data).decode('utf-8')

    # Calculate metrics
    lambda_end_time = time.time()
    completed_at_iso = time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime(lambda_end_time))
    total_duration_ms = int((lambda_end_time - lambda_start_time) * 1000)

    total_input_size = sum(m['file_size'] for m in download_metrics)
    downloaded_count = sum(1 for m in download_metrics if m['status'] == 'success')
    failed_count = sum(1 for m in download_metrics if m['status'] == 'failed')
    success_rate = f"{(downloaded_count / len(download_metrics) * 100):.1f}%" if download_metrics else "0.0%"

    # Estimate duration from downloaded files
    estimated_duration = sum(m.get('duration_seconds', 0) for m in download_metrics)

    files_per_second = downloaded_count / (download_duration_ms / 1000) if download_duration_ms > 0 else 0
    download_speed = total_input_size / (download_duration_ms / 1000) if download_duration_ms > 0 else 0

    metrics = {
        'newscast_id': newscast_id,
        'topic_index': int(topic_index),
        'timing': {
            'started_at': started_at_iso,
            'completed_at': completed_at_iso,
            'duration': total_duration_ms,
            'download_time': download_duration_ms,
            'merge_time': merge_duration_ms
        },
        'input': {
            'total_audio_files': len(download_metrics),
            'downloaded_files': downloaded_count,
            'failed_downloads': failed_count,
            'total_input_size': total_input_size
        },
        'output': {
            'merged_file_name': f'newscast-topic-{topic_str}.mp3',
            'merged_file_size': len(audio_data),
            'estimated_duration': estimated_duration
        },
        'performance': {
            'files_per_second': round(files_per_second, 2),
            'download_speed': int(download_speed),
            'success_rate': success_rate
        }
    }

    # Cleanup
    cleanup_temp_files(temp_dir)

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json'
        },
        'body': json.dumps({
            'success': True,
            'newscast_id': newscast_id,
            'topic_index': topic_index,
            'message': f'Successfully generated newscast for topic {topic_index}' + (' (DRY RUN)' if dry_run else ''),
            'audio_base64': audio_base64,
            'metrics': metrics,
            'dry_run': dry_run
        })
    }


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler function that routes requests to appropriate handlers.

    Args:
        event: Lambda event object from API Gateway
        context: Lambda context object

    Returns:
        Lambda response dict with statusCode and body
    """
    try:
        # Get HTTP method and path
        http_method = event.get('httpMethod') or event.get('requestContext', {}).get('http', {}).get('method')
        path = event.get('path') or event.get('rawPath', '')

        # Route based on path
        if path in ['/', '']:
            # Root endpoint - return help (any method allowed)
            return handle_help()
        elif path == '/help':
            # Help endpoint (any method allowed)
            return handle_help()
        elif path == '/newscast':
            # Newscast generation endpoint - POST only
            if http_method and http_method != 'POST':
                logger.warning(f"Invalid HTTP method for /newscast: {http_method}. Only POST is allowed.")
                return {
                    'statusCode': 405,
                    'headers': {
                        'Allow': 'POST',
                        'Content-Type': 'application/json'
                    },
                    'body': json.dumps({
                        'success': False,
                        'error': f'Method Not Allowed. Expected POST, got {http_method}'
                    })
                }

            # Parse body if from API Gateway
            if 'body' in event:
                body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
            else:
                body = event

            return handle_newscast(body)
        else:
            # Unknown endpoint
            logger.warning(f"Invalid endpoint: {path}. Supported: /, /help, /newscast")
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'success': False,
                    'error': f'Not Found. Endpoint {path} does not exist. Available: GET /, GET /help, POST /newscast'
                })
            }

    except Exception as e:
        logger.error(f"Lambda execution failed: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'success': False,
                'error': f'Internal server error: {str(e)}'
            })
        }
