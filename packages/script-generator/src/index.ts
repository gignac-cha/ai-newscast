/**
 * @ai-newscast/script-generator
 * AI-powered newscast script generation package
 */

// Main classes
export { ScriptGenerator } from './script-generator.ts';

// Interfaces and types
export type {
  ConsolidatedNews,
  VoiceConfig,
  TTSVoices,
  DialogueLine,
  NewscastScript,
  ScriptGeneratorOptions,
  ScriptGeneratorConfig,
  ScriptGenerationContext,
  ScriptGenerationMetrics,
  ProgressCallback
} from './interfaces/index.ts';

// Error types
export {
  ScriptGenerationError,
  VoiceConfigurationError,
  AIGenerationError,
  DialogueParsingError
} from './interfaces/index.ts';

// Pipeline components (for advanced usage)
export { ScriptGenerationPipeline } from './pipeline/script-pipeline.ts';
export { VoiceLoadingStep } from './pipeline/steps/voice-loading-step.ts';
export { AIGenerationStep } from './pipeline/steps/ai-generation-step.ts';
export { DialogueParsingStep } from './pipeline/steps/dialogue-parsing-step.ts';
export { ScriptAssemblyStep } from './pipeline/steps/script-assembly-step.ts';

// Convenience functions
export { createScriptGenerator, generateScript } from './utils/factory.ts';