// biome-ignore-all assist/source/organizeImports: ANT-ONLY import markers must not be reordered
import { isUltrathinkEnabled } from './thinking.js'
import { getInitialSettings } from './settings/settings.js'
import { isProSubscriber, isMaxSubscriber, isTeamSubscriber } from './auth.js'
import { getFeatureValue_CACHED_MAY_BE_STALE } from 'src/services/analytics/growthbook.js'
import { getAPIProvider } from './model/providers.js'
import { get3PModelCapabilityOverride } from './model/modelSupportOverrides.js'
import { getAntModelOverrideConfig, resolveAntModel } from './model/antModels.js'
import { isEnvTruthy } from './envUtils.js'

export const EFFORT_LEVELS = [
  'none',
  'minimal',
  'low',
  'medium',
  'high',
  'max',
  'xhigh',
] as const

export type EffortLevel = (typeof EFFORT_LEVELS)[number]

export type EffortValue = EffortLevel | number

export type OpenAICompatEffortProvider =
  | 'openai'
  | 'deepseek'
  | 'glm'
  | 'kimi'
  | 'qwen'
  | 'minimax'
  | 'openrouter'
  | 'groq'
  | 'google'
  | 'generic'

export type OpenAICompatEffortSpec = {
  provider: OpenAICompatEffortProvider
  levels: EffortLevel[]
}

export type OpenAICompatEffortPreset = {
  provider: OpenAICompatEffortProvider
  level: EffortLevel
  reasoningEffort?: string
  reasoningSummary?: 'auto'
  includeEncryptedReasoning?: boolean
  textVerbosity?: 'low' | 'medium' | 'high'
  thinking?: {
    type?: 'enabled' | 'disabled' | 'adaptive'
    enabled?: boolean
    budgetTokens?: number
  }
  reasoning?: {
    effort: string
  }
  enableThinking?: boolean
  thinkingBudget?: number
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high'
}

// @[MODEL LAUNCH]: Add the new model to the allowlist if it supports the effort parameter.
export function modelSupportsEffort(model: string): boolean {
  const m = model.toLowerCase()
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_OPENAI_COMPAT)) {
    return !isEnvTruthy(process.env.OPENAI_COMPAT_DISABLE_EFFORT) &&
      getOpenAICompatEffortSpec(model).levels.length > 0
  }
  if (isEnvTruthy(process.env.CLAUDE_CODE_ALWAYS_ENABLE_EFFORT)) {
    return true
  }
  const supported3P = get3PModelCapabilityOverride(model, 'effort')
  if (supported3P !== undefined) {
    return supported3P
  }
  // Supported by a subset of Claude 4 models
  if (m.includes('opus-4-6') || m.includes('sonnet-4-6')) {
    return true
  }
  // Exclude any other known legacy models (haiku, older opus/sonnet variants)
  if (m.includes('haiku') || m.includes('sonnet') || m.includes('opus')) {
    return false
  }

  // IMPORTANT: Do not change the default effort support without notifying
  // the model launch DRI and research. This is a sensitive setting that can
  // greatly affect model quality and bashing.

  // Default to true for unknown model strings on 1P.
  // Do not default to true for 3P as they have different formats for their
  // model strings (ex. anthropics/claude-code#30795)
  return getAPIProvider() === 'firstParty'
}

// @[MODEL LAUNCH]: Add the new model to the allowlist if it supports 'max' effort.
// Per API docs, 'max' is Opus 4.6 only for public models — other models return an error.
export function modelSupportsMaxEffort(model: string): boolean {
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_OPENAI_COMPAT)) {
    return true
  }
  const supported3P = get3PModelCapabilityOverride(model, 'max_effort')
  if (supported3P !== undefined) {
    return supported3P
  }
  if (model.toLowerCase().includes('opus-4-6')) {
    return true
  }
  if (process.env.USER_TYPE === 'ant' && resolveAntModel(model)) {
    return true
  }
  return false
}

export function isEffortLevel(value: string): value is EffortLevel {
  return (EFFORT_LEVELS as readonly string[]).includes(value)
}

export function parseEffortValue(value: unknown): EffortValue | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (typeof value === 'number' && isValidNumericEffort(value)) {
    return value
  }
  const str = String(value).toLowerCase()
  if (isEffortLevel(str)) {
    return str
  }
  const numericValue = parseInt(str, 10)
  if (!isNaN(numericValue) && isValidNumericEffort(numericValue)) {
    return numericValue
  }
  return undefined
}

/**
 * Numeric values are model-default only and not persisted.
 * 'max' is session-scoped for external users (ants can persist it).
 * Write sites call this before saving to settings so the Zod schema
 * (which only accepts string levels) never rejects a write.
 */
export function toPersistableEffort(
  value: EffortValue | undefined,
): EffortLevel | undefined {
  if (typeof value === 'string' && isEffortLevel(value)) {
    return value
  }
  return undefined
}

export function getInitialEffortSetting(): EffortLevel | undefined {
  // toPersistableEffort filters 'max' for non-ants on read, so a manually
  // edited settings.json doesn't leak session-scoped max into a fresh session.
  return toPersistableEffort(getInitialSettings().effortLevel)
}

/**
 * Decide what effort level (if any) to persist when the user selects a model
 * in ModelPicker. Keeps an explicit prior /effort choice sticky even when it
 * matches the picked model's default, while letting purely-default and
 * session-ephemeral effort (CLI --effort, EffortCallout default) fall through
 * to undefined so it follows future model-default changes.
 *
 * priorPersisted must come from userSettings on disk
 * (getSettingsForSource('userSettings')?.effortLevel), NOT merged settings
 * (project/policy layers would leak into the user's global settings.json)
 * and NOT AppState.effortValue (includes session-scoped sources that
 * deliberately do not write to settings.json).
 */
export function resolvePickerEffortPersistence(
  picked: EffortLevel | undefined,
  modelDefault: EffortLevel,
  priorPersisted: EffortLevel | undefined,
  toggledInPicker: boolean,
): EffortLevel | undefined {
  const hadExplicit = priorPersisted !== undefined || toggledInPicker
  return hadExplicit || picked !== modelDefault ? picked : undefined
}

export function getEffortEnvOverride(): EffortValue | null | undefined {
  const envOverride = process.env.CLAUDE_CODE_EFFORT_LEVEL
  return envOverride?.toLowerCase() === 'unset' ||
    envOverride?.toLowerCase() === 'auto'
    ? null
    : parseEffortValue(envOverride)
}

/**
 * Resolve the effort value that will actually be sent to the API for a given
 * model, following the full precedence chain:
 *   env CLAUDE_CODE_EFFORT_LEVEL → appState.effortValue → model default
 *
 * Returns undefined when no effort parameter should be sent (env set to
 * 'unset', or no default exists for the model).
 */
export function resolveAppliedEffort(
  model: string,
  appStateEffortValue: EffortValue | undefined,
): EffortValue | undefined {
  const envOverride = getEffortEnvOverride()
  if (envOverride === null) {
    return undefined
  }
  const resolved =
    envOverride ?? appStateEffortValue ?? getDefaultEffortForModel(model)
  if (!isEnvTruthy(process.env.CLAUDE_CODE_USE_OPENAI_COMPAT)) {
    if (resolved === 'none') {
      return undefined
    }
    if (resolved === 'minimal') {
      return 'low'
    }
    if (resolved === 'xhigh') {
      return modelSupportsMaxEffort(model) ? 'max' : 'high'
    }
  }
  // API rejects 'max' on non-Opus-4.6 models — downgrade to 'high'.
  if (resolved === 'max' && !modelSupportsMaxEffort(model)) {
    return 'high'
  }
  return resolved
}

/**
 * Resolve the effort level to show the user. Wraps resolveAppliedEffort
 * with the 'high' fallback (what the API uses when no effort param is sent).
 * Single source of truth for the status bar and /effort output (CC-1088).
 */
export function getDisplayedEffortLevel(
  model: string,
  appStateEffort: EffortValue | undefined,
): EffortLevel {
  const resolved = resolveAppliedEffort(model, appStateEffort) ?? 'high'
  return convertEffortValueToLevel(resolved)
}

/**
 * Build the ` with {level} effort` suffix shown in Logo/Spinner.
 * Returns empty string if the user hasn't explicitly set an effort value.
 * Delegates to resolveAppliedEffort() so the displayed level matches what
 * the API actually receives (including max→high clamp for non-Opus models).
 */
export function getEffortSuffix(
  model: string,
  effortValue: EffortValue | undefined,
): string {
  if (effortValue === undefined) return ''
  const resolved = resolveAppliedEffort(model, effortValue)
  if (resolved === undefined) return ''
  return ` with ${convertEffortValueToLevel(resolved)} effort`
}

export function isValidNumericEffort(value: number): boolean {
  return Number.isInteger(value)
}

export function convertEffortValueToLevel(value: EffortValue): EffortLevel {
  if (typeof value === 'string') {
    // Runtime guard: value may come from remote config (GrowthBook) where
    // TypeScript types can't help us. Coerce unknown strings to 'high'
    // rather than passing them through unchecked.
    return isEffortLevel(value) ? value : 'high'
  }
  if (process.env.USER_TYPE === 'ant' && typeof value === 'number') {
    if (value <= 50) return 'low'
    if (value <= 85) return 'medium'
    if (value <= 100) return 'high'
    return 'max'
  }
  return 'high'
}

/**
 * Get user-facing description for effort levels
 *
 * @param level The effort level to describe
 * @returns Human-readable description
 */
export function getEffortLevelDescription(level: EffortLevel): string {
  switch (level) {
    case 'none':
      return 'No extra reasoning effort'
    case 'minimal':
      return 'Minimal reasoning for very quick responses'
    case 'low':
      return 'Quick, straightforward implementation with minimal overhead'
    case 'medium':
      return 'Balanced approach with standard implementation and testing'
    case 'high':
      return 'Comprehensive implementation with extensive testing and documentation'
    case 'max':
      return 'Maximum capability with deepest reasoning when supported'
    case 'xhigh':
      return 'Extra-high reasoning for models that expose a stronger reasoning tier'
  }
}

export function getSelectableEffortLevels(model: string): EffortLevel[] {
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_OPENAI_COMPAT)) {
    return getOpenAICompatEffortSpec(model).levels
  }
  return modelSupportsMaxEffort(model)
    ? ['low', 'medium', 'high', 'max']
    : ['low', 'medium', 'high']
}

export function getOpenAICompatEffortSpec(model: string): OpenAICompatEffortSpec {
  const provider = detectOpenAICompatEffortProvider(model)
  const m = model.toLowerCase()

  switch (provider) {
    case 'openai':
      return { provider, levels: getOpenAIEffortLevels(m) }
    case 'deepseek':
      return { provider, levels: ['none', 'high', 'max'] }
    case 'glm':
      return { provider, levels: ['none', 'high'] }
    case 'kimi':
      return { provider, levels: m.includes('thinking') ? ['high'] : ['none', 'high'] }
    case 'qwen':
      return {
        provider,
        levels:
          m.includes('qwq') || m.includes('thinking')
            ? ['low', 'medium', 'high', 'max']
            : ['none', 'low', 'medium', 'high', 'max'],
      }
    case 'minimax':
      return { provider, levels: ['high'] }
    case 'openrouter':
      return { provider, levels: getOpenRouterEffortLevels(m) }
    case 'groq':
      return { provider, levels: ['none', 'low', 'medium', 'high'] }
    case 'google':
      return {
        provider,
        levels: m.includes('2.5') || m.includes('3') || m.includes('thinking')
          ? ['low', 'high', 'max']
          : ['minimal', 'low', 'medium', 'high'],
      }
    case 'generic':
      return { provider, levels: [...EFFORT_LEVELS] }
  }
}

export function normalizeOpenAICompatEffortLevel(
  model: string,
  effort: EffortLevel,
): EffortLevel | undefined {
  const spec = getOpenAICompatEffortSpec(model)
  const levels = spec.levels
  if (levels.includes(effort)) {
    return effort
  }

  if (spec.provider === 'deepseek') {
    if (effort === 'none') return 'none'
    if (effort === 'max' || effort === 'xhigh') return 'max'
    return 'high'
  }

  if (spec.provider === 'glm' || spec.provider === 'kimi') {
    if (effort === 'none' && levels.includes('none')) return 'none'
    return levels.includes('high') ? 'high' : levels[0]
  }

  if (spec.provider === 'qwen') {
    if (effort === 'none' && levels.includes('none')) return 'none'
    if (effort === 'minimal') return 'low'
    if (effort === 'xhigh') return levels.includes('xhigh') ? 'xhigh' : 'max'
    return levels.includes(effort) ? effort : 'high'
  }

  if (effort === 'none') {
    if (levels.includes('minimal')) return 'minimal'
    if (levels.includes('low')) return 'low'
    return levels[0]
  }
  if (effort === 'minimal' && levels.includes('low')) return 'low'
  if (effort === 'max') {
    if (levels.includes('xhigh')) return 'xhigh'
    if (levels.includes('high')) return 'high'
  }
  if (effort === 'xhigh') {
    if (levels.includes('max')) return 'max'
    if (levels.includes('high')) return 'high'
  }
  return levels.includes('high') ? 'high' : levels[0]
}

export function getOpenAICompatEffortPreset(
  model: string,
  effort: EffortLevel,
): OpenAICompatEffortPreset | undefined {
  const level = normalizeOpenAICompatEffortLevel(model, effort)
  if (!level) {
    return undefined
  }
  const { provider } = getOpenAICompatEffortSpec(model)

  switch (provider) {
    case 'openai':
      return {
        provider,
        level,
        reasoningEffort: normalizeOpenAIStyleEffort(level),
        reasoningSummary: 'auto',
        includeEncryptedReasoning: true,
        textVerbosity: getOpenAITextVerbosity(model),
      }
    case 'deepseek':
      return {
        provider,
        level,
        thinking: { type: level === 'none' ? 'disabled' : 'enabled' },
        ...(level !== 'none' ? { reasoningEffort: level === 'max' ? 'high' : 'high' } : {}),
      }
    case 'glm':
    case 'kimi':
      return {
        provider,
        level,
        thinking: { type: level === 'none' ? 'disabled' : 'enabled' },
      }
    case 'qwen': {
      const enabled = level !== 'none'
      const budget = getThinkingBudgetForLevel(level)
      return {
        provider,
        level,
        enableThinking: enabled,
        ...(enabled && budget !== undefined ? { thinkingBudget: budget } : {}),
      }
    }
    case 'google':
      return {
        provider,
        level,
        thinking: {
          enabled: true,
          ...(level === 'max'
            ? { budgetTokens: 24576 }
            : level === 'high'
              ? { budgetTokens: 16000 }
              : {}),
        },
        thinkingLevel: toGoogleThinkingLevel(level),
      }
    case 'openrouter':
      return getOpenRouterEffortPreset(model, level)
    case 'groq':
      return { provider, level, reasoningEffort: level }
    case 'minimax':
      return undefined
    case 'generic':
      return {
        provider,
        level,
        reasoningEffort: normalizeOpenAIStyleEffort(level),
      }
  }
}

function detectOpenAICompatEffortProvider(model: string): OpenAICompatEffortProvider {
  const providerName = getOpenAICompatEnvForEffort('OPENAI_PROVIDER_NAME')?.toLowerCase() || ''
  const baseUrl = getOpenAICompatEnvForEffort('OPENAI_BASE_URL')?.toLowerCase() || ''
  const m = model.toLowerCase()
  const hint = `${providerName} ${baseUrl} ${m}`

  if (hint.includes('deepseek')) return 'deepseek'
  if (hint.includes('openrouter')) return 'openrouter'
  if (hint.includes('groq')) return 'groq'
  if (hint.includes('google') || hint.includes('gemini')) return 'google'
  if (hint.includes('bigmodel') || hint.includes('z.ai') || hint.includes('zhipu') || /\bglm[-_]/.test(hint)) {
    return 'glm'
  }
  if (hint.includes('moonshot') || hint.includes('kimi')) return 'kimi'
  if (hint.includes('dashscope') || hint.includes('aliyuncs') || hint.includes('qwen') || hint.includes('qwq')) {
    return 'qwen'
  }
  if (hint.includes('minimax')) return 'minimax'
  if (hint.includes('openai.com') || hint.includes('openai') || /^(gpt|o\d|o[134])/.test(m)) {
    return 'openai'
  }
  return 'generic'
}

function getOpenAIEffortLevels(model: string): EffortLevel[] {
  if (model.includes('gpt-5-pro')) {
    return ['high']
  }
  if (
    model.includes('gpt-5.1-codex-max') ||
    /^gpt-5\.[2-9]/.test(model) ||
    /^gpt-[6-9]/.test(model)
  ) {
    return ['none', 'low', 'medium', 'high', 'xhigh']
  }
  if (model.startsWith('gpt-5.1')) {
    return ['none', 'low', 'medium', 'high']
  }
  if (model.startsWith('gpt-5')) {
    return ['minimal', 'low', 'medium', 'high']
  }
  if (/^o\d/.test(model) || /^o[134]/.test(model)) {
    return ['low', 'medium', 'high']
  }
  return [...EFFORT_LEVELS]
}

function getOpenRouterEffortLevels(model: string): EffortLevel[] {
  if (model.includes('grok')) {
    return []
  }
  if (model.includes('gemini')) {
    return []
  }
  if (model.includes('deepseek-v4')) {
    return ['low', 'medium', 'high', 'max']
  }
  if (model.includes('gpt') || /\bo[1-9]/.test(model)) {
    return ['low', 'medium', 'high']
  }
  return ['low', 'high']
}

function getOpenRouterEffortPreset(
  model: string,
  level: EffortLevel,
): OpenAICompatEffortPreset | undefined {
  const levels = getOpenRouterEffortLevels(model)
  if (!levels.includes(level)) {
    return undefined
  }
  if (model.includes('openai/') || model.includes('gpt') || /\bo[1-9]/.test(model)) {
    return {
      provider: 'openrouter',
      level,
      reasoningEffort: normalizeOpenAIStyleEffort(level),
      reasoningSummary: 'auto',
      includeEncryptedReasoning: true,
    }
  }
  return {
    provider: 'openrouter',
    level,
    reasoning: { effort: normalizeOpenAIStyleEffort(level) },
  }
}

function normalizeOpenAIStyleEffort(effort: EffortLevel): string {
  if (effort === 'max') return 'high'
  return effort
}

function getOpenAITextVerbosity(model: string): 'low' | undefined {
  const m = model.toLowerCase()
  if (m.includes('gpt-5.') && !m.includes('codex') && !m.includes('-chat')) {
    return 'low'
  }
  return undefined
}

function toGoogleThinkingLevel(level: EffortLevel): 'minimal' | 'low' | 'medium' | 'high' {
  if (level === 'max' || level === 'xhigh') return 'high'
  if (level === 'none') return 'minimal'
  return level
}

function getThinkingBudgetForLevel(level: EffortLevel): number | undefined {
  switch (level) {
    case 'low':
      return 1024
    case 'medium':
      return 4096
    case 'high':
      return 8192
    case 'max':
    case 'xhigh':
      return 16384
    default:
      return undefined
  }
}

function getOpenAICompatEnvForEffort(name: string): string | undefined {
  const settingsValue = getInitialSettings().env?.[name]
  if (typeof settingsValue === 'string' && settingsValue.trim()) {
    return settingsValue.trim()
  }
  const processValue = process.env[name]?.trim()
  return processValue || undefined
}

/**
 * Get user-facing description for effort values (both string and numeric)
 *
 * @param value The effort value to describe
 * @returns Human-readable description
 */
export function getEffortValueDescription(value: EffortValue): string {
  if (process.env.USER_TYPE === 'ant' && typeof value === 'number') {
    return `[ANT-ONLY] Numeric effort value of ${value}`
  }

  if (typeof value === 'string') {
    return getEffortLevelDescription(value)
  }
  return 'Balanced approach with standard implementation and testing'
}

export type OpusDefaultEffortConfig = {
  enabled: boolean
  dialogTitle: string
  dialogDescription: string
}

const OPUS_DEFAULT_EFFORT_CONFIG_DEFAULT: OpusDefaultEffortConfig = {
  enabled: true,
  dialogTitle: 'We recommend medium effort for Opus',
  dialogDescription:
    'Effort determines how long Claude thinks for when completing your task. We recommend medium effort for most tasks to balance speed and intelligence and maximize rate limits. Use ultrathink to trigger high effort when needed.',
}

export function getOpusDefaultEffortConfig(): OpusDefaultEffortConfig {
  const config = getFeatureValue_CACHED_MAY_BE_STALE(
    'tengu_grey_step2',
    OPUS_DEFAULT_EFFORT_CONFIG_DEFAULT,
  )
  return {
    ...OPUS_DEFAULT_EFFORT_CONFIG_DEFAULT,
    ...config,
  }
}

// @[MODEL LAUNCH]: Update the default effort levels for new models
export function getDefaultEffortForModel(
  model: string,
): EffortValue | undefined {
  if (process.env.USER_TYPE === 'ant') {
    const config = getAntModelOverrideConfig()
    const isDefaultModel =
      config?.defaultModel !== undefined &&
      model.toLowerCase() === config.defaultModel.toLowerCase()
    if (isDefaultModel && config?.defaultModelEffortLevel) {
      return config.defaultModelEffortLevel
    }
    const antModel = resolveAntModel(model)
    if (antModel) {
      if (antModel.defaultEffortLevel) {
        return antModel.defaultEffortLevel
      }
      if (antModel.defaultEffortValue !== undefined) {
        return antModel.defaultEffortValue
      }
    }
    // Always default ants to undefined/high
    return undefined
  }

  // IMPORTANT: Do not change the default effort level without notifying
  // the model launch DRI and research. Default effort is a sensitive setting
  // that can greatly affect model quality and bashing.

  // Default effort on Opus 4.6 to medium for Pro.
  // Max/Team also get medium when the tengu_grey_step2 config is enabled.
  if (model.toLowerCase().includes('opus-4-6')) {
    if (isProSubscriber()) {
      return 'medium'
    }
    if (
      getOpusDefaultEffortConfig().enabled &&
      (isMaxSubscriber() || isTeamSubscriber())
    ) {
      return 'medium'
    }
  }

  // When ultrathink feature is on, default effort to medium (ultrathink bumps to high)
  if (isUltrathinkEnabled() && modelSupportsEffort(model)) {
    return 'medium'
  }

  // Fallback to undefined, which means we don't set an effort level. This
  // should resolve to high effort level in the API.
  return undefined
}
