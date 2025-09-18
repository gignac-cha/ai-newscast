// 공통 유틸리티 함수들

import { readFile } from 'fs/promises';
import { join } from 'path';
import type { TTSVoices } from './types.ts';

export {
  getVoicesByGender,
  randomChoice,
  selectRandomHosts,
  getHostIdFromRole,
  formatAsMarkdown,
} from './runtime-utils.ts';

export async function loadPrompt(): Promise<string> {
  const promptPath = join(import.meta.dirname, 'prompts', 'newscast-script.md');
  return await readFile(promptPath, 'utf-8');
}

export async function loadTTSHosts(): Promise<TTSVoices> {
  const hostsPath = join(import.meta.dirname, 'config', 'tts-hosts.json');
  const content = await readFile(hostsPath, 'utf-8');
  return JSON.parse(content);
}
