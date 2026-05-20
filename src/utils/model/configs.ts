import type { ModelName } from './model.js'
import type { APIProvider } from './providers.js'

export type ModelConfig = Record<APIProvider, ModelName>

// Built-in compatibility model strings. Close Code defaults to the configured
// OpenAI-compatible model and does not ship Claude model IDs.

export const CLAUDE_3_7_SONNET_CONFIG = {
  firstParty: 'gpt-4o-mini',
  bedrock: 'gpt-4o-mini',
  vertex: 'gpt-4o-mini',
  foundry: 'gpt-4o-mini',
} as const satisfies ModelConfig

export const CLAUDE_3_5_V2_SONNET_CONFIG = {
  firstParty: 'gpt-4o-mini',
  bedrock: 'gpt-4o-mini',
  vertex: 'gpt-4o-mini',
  foundry: 'gpt-4o-mini',
} as const satisfies ModelConfig

export const CLAUDE_3_5_HAIKU_CONFIG = {
  firstParty: 'gpt-4o-mini',
  bedrock: 'gpt-4o-mini',
  vertex: 'gpt-4o-mini',
  foundry: 'gpt-4o-mini',
} as const satisfies ModelConfig

export const CLAUDE_HAIKU_4_5_CONFIG = {
  firstParty: 'gpt-4o-mini',
  bedrock: 'gpt-4o-mini',
  vertex: 'gpt-4o-mini',
  foundry: 'gpt-4o-mini',
} as const satisfies ModelConfig

export const CLAUDE_SONNET_4_CONFIG = {
  firstParty: 'gpt-4o-mini',
  bedrock: 'gpt-4o-mini',
  vertex: 'gpt-4o-mini',
  foundry: 'gpt-4o-mini',
} as const satisfies ModelConfig

export const CLAUDE_SONNET_4_5_CONFIG = {
  firstParty: 'gpt-4o-mini',
  bedrock: 'gpt-4o-mini',
  vertex: 'gpt-4o-mini',
  foundry: 'gpt-4o-mini',
} as const satisfies ModelConfig

export const CLAUDE_OPUS_4_CONFIG = {
  firstParty: 'gpt-4o-mini',
  bedrock: 'gpt-4o-mini',
  vertex: 'gpt-4o-mini',
  foundry: 'gpt-4o-mini',
} as const satisfies ModelConfig

export const CLAUDE_OPUS_4_1_CONFIG = {
  firstParty: 'gpt-4o-mini',
  bedrock: 'gpt-4o-mini',
  vertex: 'gpt-4o-mini',
  foundry: 'gpt-4o-mini',
} as const satisfies ModelConfig

export const CLAUDE_OPUS_4_5_CONFIG = {
  firstParty: 'gpt-4o-mini',
  bedrock: 'gpt-4o-mini',
  vertex: 'gpt-4o-mini',
  foundry: 'gpt-4o-mini',
} as const satisfies ModelConfig

export const CLAUDE_OPUS_4_6_CONFIG = {
  firstParty: 'gpt-4o-mini',
  bedrock: 'gpt-4o-mini',
  vertex: 'gpt-4o-mini',
  foundry: 'gpt-4o-mini',
} as const satisfies ModelConfig

export const CLAUDE_SONNET_4_6_CONFIG = {
  firstParty: 'gpt-4o-mini',
  bedrock: 'gpt-4o-mini',
  vertex: 'gpt-4o-mini',
  foundry: 'gpt-4o-mini',
} as const satisfies ModelConfig

// @[MODEL LAUNCH]: Register the new config here.
export const ALL_MODEL_CONFIGS = {
  haiku35: CLAUDE_3_5_HAIKU_CONFIG,
  haiku45: CLAUDE_HAIKU_4_5_CONFIG,
  sonnet35: CLAUDE_3_5_V2_SONNET_CONFIG,
  sonnet37: CLAUDE_3_7_SONNET_CONFIG,
  sonnet40: CLAUDE_SONNET_4_CONFIG,
  sonnet45: CLAUDE_SONNET_4_5_CONFIG,
  sonnet46: CLAUDE_SONNET_4_6_CONFIG,
  opus40: CLAUDE_OPUS_4_CONFIG,
  opus41: CLAUDE_OPUS_4_1_CONFIG,
  opus45: CLAUDE_OPUS_4_5_CONFIG,
  opus46: CLAUDE_OPUS_4_6_CONFIG,
} as const satisfies Record<string, ModelConfig>

export type ModelKey = keyof typeof ALL_MODEL_CONFIGS

/** Union of all canonical compatibility model IDs. */
export type CanonicalModelId =
  (typeof ALL_MODEL_CONFIGS)[ModelKey]['firstParty']

/** Runtime list of canonical model IDs — used by comprehensiveness tests. */
export const CANONICAL_MODEL_IDS = Object.values(ALL_MODEL_CONFIGS).map(
  c => c.firstParty,
) as [CanonicalModelId, ...CanonicalModelId[]]

/** Map canonical ID → internal short key. Used to apply settings-based modelOverrides. */
export const CANONICAL_ID_TO_KEY: Record<CanonicalModelId, ModelKey> =
  Object.fromEntries(
    (Object.entries(ALL_MODEL_CONFIGS) as [ModelKey, ModelConfig][]).map(
      ([key, cfg]) => [cfg.firstParty, key],
    ),
  ) as Record<CanonicalModelId, ModelKey>
