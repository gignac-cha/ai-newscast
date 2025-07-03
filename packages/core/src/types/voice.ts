/**
 * Voice and host-related types for AI Newscast project
 */

import type { NewscastMetadata } from './metadata';

export interface VoiceHost {
  voice_model: string;
  name: string;
  gender: string;
}

export interface SelectedHosts {
  host1: VoiceHost;
  host2: VoiceHost;
}

export interface ScriptLine {
  type: string;
  role: string;
  name: string;
  content: string;
  voice_model?: string;
}

export interface NewscastScript {
  title: string;
  program_name: string;
  estimated_duration: string;
  script: ScriptLine[];
}

export interface NewscastOutput extends NewscastScript {
  hosts: SelectedHosts;
  metadata: NewscastMetadata;
}