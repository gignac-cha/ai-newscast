import { cors } from '../utils/cors.ts';
import { json } from '../utils/json.ts';

export async function handleHelp(): Promise<Response> {
  const helpData = {
    name: "AI Newscast Generator Worker",
    description: "Cloudflare Worker for AI newscast generation functionality",
    version: "1.0.0",
    endpoints: {
      "GET /": "This help message",
      "GET /status": "Check worker status",
      "POST /script?newscast-id={id}&topic-index={n}": "Generate newscast script from consolidated news for specific topic",
      "POST /audio?newscast-id={id}&topic-index={n}": "Generate TTS audio from newscast script for specific topic",
      "POST /newscast?newscast-id={id}&topic-index={n}": "Merge audio files into final newscast for specific topic"
    },
    usage: {
      script: "Generate script from news.json in specified newscast/topic directory",
      audio: "Generate TTS audio files from newscast-script.json for specific topic",
      newscast: "Merge audio files using FFmpeg into final MP3 for specific topic",
      topic_index: "Topic index 1-10, determines which topic to process"
    },
    storage: {
      r2_bucket: "AI_NEWSCAST_BUCKET (ai-newscast)",
      kv_namespace: "AI_NEWSCAST_KV"
    },
    scheduling: {
      script_generation: "Daily at 10:00 AM",
      audio_generation: "Daily at 10:30 AM"
    }
  };

  return new Response(
    JSON.stringify(helpData, null, 2),
    cors(json(helpData)).options
  );
}