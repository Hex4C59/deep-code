import { randomUUID } from 'crypto'
import type {
  BetaContentBlock,
  BetaUsage,
} from 'src/types/api-types.js'
import type { StreamEvent, AssistantMessage, Message } from '../../types/message.js'
import type { SystemPrompt } from '../../utils/systemPromptType.js'
import type { ThinkingConfig } from '../../utils/thinking.js'
import type { Tools } from '../../Tool.js'
import { normalizeMessagesForAPI } from '../../utils/messages.js'
import { toolToAPISchema } from '../../utils/api.js'
import { safeParseJSON } from '../../utils/json.js'
import { getProxyFetchOptions } from '../../utils/proxy.js'
import { getUserAgent } from '../../utils/http.js'
import { getSettings_DEPRECATED } from '../../utils/settings/settings.js'
import {
  type EffortLevel,
  type EffortValue,
  type OpenAICompatEffortPreset,
  getOpenAICompatEffortPreset,
  normalizeOpenAICompatEffortLevel,
  resolveAppliedEffort,
} from '../../utils/effort.js'
import type { Options } from './claude.js'
import { EMPTY_USAGE } from './emptyUsage.js'

type OpenAIChatMessage = {
  role: 'system' | 'user'
  content: string
} | {
  role: 'assistant'
  content: string | null
  tool_calls?: OpenAIToolCall[]
} | {
  role: 'tool'
  tool_call_id: string
  content: string
}

type OpenAITool = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

type OpenAIToolCall = {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

type OpenAIToolCallDelta = {
  index?: number
  id?: string
  type?: 'function'
  function?: {
    name?: string
    arguments?: string
  }
}

type OpenAIStreamChunk = {
  id?: string
  model?: string
  choices?: Array<{
    delta?: {
      content?: string | null
      tool_calls?: OpenAIToolCallDelta[]
    }
    finish_reason?: string | null
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

type SavedOpenAICompatProvider = {
  name: string
  baseUrl: string
  apiKeyEnvName: string
}

type OpenAICompatRequestBody = {
  model: string
  messages: OpenAIChatMessage[]
  stream: boolean
  stream_options: { include_usage: boolean }
  max_tokens: number
  tools?: OpenAITool[]
  tool_choice?: 'auto' | 'none' | {
    type: 'function'
    function: { name: string }
  }
  temperature?: number
  reasoning_effort?: string
  verbosity?: string
  reasoning?: { effort: string }
  thinking?: { type?: string; enabled?: boolean; budget_tokens?: number }
  enable_thinking?: boolean
  thinking_budget?: number
  chat_template_kwargs?: {
    enable_thinking?: boolean
    thinking_budget?: number
  }
  extra_body?: Record<string, unknown>
}

type AppliedOpenAICompatEffort = {
  provider: string
  level: EffortLevel
}

type PendingOpenAIToolCall = {
  index: number
  id?: string
  name?: string
  arguments: string
}

const OPENAI_COMPAT_PROVIDER_REGISTRY_ENV = 'OPENAI_COMPAT_PROVIDERS'

export function isOpenAICompatEnabled(): boolean {
  const raw = (process.env.CLOSE_CODE_USE_OPENAI_COMPAT ??
    process.env.CLAUDE_CODE_USE_OPENAI_COMPAT ??
    '').toLowerCase().trim()
  return raw === '' || ['1', 'true', 'yes', 'on'].includes(raw)
}

function getOpenAIBaseUrl(): string {
  return (getOpenAICompatEnv('OPENAI_BASE_URL') || 'https://api.openai.com/v1').replace(
    /\/+$/,
    '',
  )
}

function getOpenAIModel(fallback: string): string {
  return fallback || getOpenAICompatEnv('OPENAI_MODEL') || 'gpt-4o-mini'
}

function getOpenAICompatEnv(name: string): string | undefined {
  const settingsValue = getSettings_DEPRECATED()?.env?.[name]
  if (typeof settingsValue === 'string' && settingsValue.trim()) {
    return settingsValue.trim()
  }
  const processValue = process.env[name]?.trim()
  return processValue || undefined
}

function getProviderSpecificApiKeyEnvNames(): string[] {
  const providerName = getOpenAICompatEnv('OPENAI_PROVIDER_NAME')?.toLowerCase()
  const baseUrl = getOpenAICompatEnv('OPENAI_BASE_URL')?.toLowerCase()
  if (providerName === 'deepseek' || baseUrl?.includes('api.deepseek.com')) {
    return ['DEEPSEEK_API_KEY']
  }
  if (providerName === 'glm' || baseUrl?.includes('bigmodel.cn')) {
    return ['GLM_API_KEY', 'ZHIPU_API_KEY']
  }
  if (providerName === 'minimax' || baseUrl?.includes('minimax.chat')) {
    return ['MINIMAX_API_KEY']
  }
  if (providerName === 'kimi' || baseUrl?.includes('moonshot.cn')) {
    return ['KIMI_API_KEY', 'MOONSHOT_API_KEY']
  }
  if (providerName === 'qwen' || baseUrl?.includes('dashscope.aliyuncs.com')) {
    return ['QWEN_API_KEY', 'DASHSCOPE_API_KEY']
  }
  const savedProviderApiKeyEnvName = getSavedProviderApiKeyEnvName()
  if (savedProviderApiKeyEnvName) {
    return [savedProviderApiKeyEnvName]
  }
  return []
}

function getSavedProviderApiKeyEnvName(): string | undefined {
  const providerName = getOpenAICompatEnv('OPENAI_PROVIDER_NAME')
  const baseUrl = normalizeBaseUrl(getOpenAICompatEnv('OPENAI_BASE_URL'))
  if (!providerName && !baseUrl) {
    return undefined
  }
  const savedProvider = parseSavedOpenAICompatProviders(
    getOpenAICompatEnv(OPENAI_COMPAT_PROVIDER_REGISTRY_ENV),
  ).find(provider => {
    return provider.name === providerName || normalizeBaseUrl(provider.baseUrl) === baseUrl
  })
  return savedProvider?.apiKeyEnvName
}

function parseSavedOpenAICompatProviders(raw: string | undefined): SavedOpenAICompatProvider[] {
  if (!raw?.trim()) {
    return []
  }
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .map(value => {
        if (!value || typeof value !== 'object') {
          return undefined
        }
        const record = value as Record<string, unknown>
        if (
          typeof record.name !== 'string' ||
          typeof record.baseUrl !== 'string' ||
          typeof record.apiKeyEnvName !== 'string'
        ) {
          return undefined
        }
        return {
          name: record.name.trim(),
          baseUrl: normalizeBaseUrl(record.baseUrl),
          apiKeyEnvName: record.apiKeyEnvName.trim(),
        }
      })
      .filter((provider): provider is SavedOpenAICompatProvider => {
        return !!provider?.name && !!provider.baseUrl && !!provider.apiKeyEnvName
      })
  } catch {
    return []
  }
}

function normalizeBaseUrl(baseUrl: string | undefined): string | undefined {
  return baseUrl?.trim().replace(/\/+$/, '').toLowerCase() || undefined
}

function getOpenAICompatApiKey(): string | undefined {
  for (const envName of getProviderSpecificApiKeyEnvNames()) {
    const value = getOpenAICompatEnv(envName)
    if (value) {
      return value
    }
  }
  return getOpenAICompatEnv('OPENAI_API_KEY')
}

function getOpenAICompatProviderName(): string {
  return (getOpenAICompatEnv('OPENAI_PROVIDER_NAME') || '').toLowerCase()
}

function getOpenAICompatBaseUrlForProvider(): string {
  return (getOpenAICompatEnv('OPENAI_BASE_URL') || '').toLowerCase()
}

function resolveOpenAICompatEffort(model: string, effortValue: EffortValue | undefined): EffortLevel | undefined {
  const effort = resolveAppliedEffort(model, effortValue)
  if (effort === undefined || typeof effort === 'number') {
    return undefined
  }
  return normalizeOpenAICompatEffortLevel(model, effort)
}

function applyOpenAICompatEffort(body: OpenAICompatRequestBody, model: string, effortValue: EffortValue | undefined): AppliedOpenAICompatEffort | undefined {
  const effort = resolveOpenAICompatEffort(model, effortValue)
  if (!effort) {
    return
  }
  const preset = getOpenAICompatEffortPreset(model, effort)
  if (!preset) {
    return
  }
  applyOpenAICompatEffortPreset(body, preset)
  const providerName = getOpenAICompatProviderName()
  const baseUrl = getOpenAICompatBaseUrlForProvider()
  if (!preset.thinking && (providerName.includes('anthropic') || baseUrl.includes('api.anthropic.com'))) {
    body.extra_body = {
      ...(body.extra_body || {}),
      thinking: {
        type: effort === 'none' ? 'disabled' : 'enabled',
      },
    }
    return { provider: 'anthropic', level: effort }
  }
  return { provider: preset.provider, level: effort }
}

function applyOpenAICompatEffortPreset(body: OpenAICompatRequestBody, preset: OpenAICompatEffortPreset): void {
  if (preset.reasoningEffort) {
    body.reasoning_effort = preset.reasoningEffort
  }
  if (preset.reasoning) {
    body.reasoning = preset.reasoning
  }
  if (preset.textVerbosity) {
    body.verbosity = preset.textVerbosity
  }
  if (preset.thinking) {
    body.thinking = {
      ...(preset.thinking.type ? { type: preset.thinking.type } : {}),
      ...(preset.thinking.enabled !== undefined ? { enabled: preset.thinking.enabled } : {}),
      ...(preset.thinking.budgetTokens !== undefined ? { budget_tokens: preset.thinking.budgetTokens } : {}),
    }
  }
  if (preset.enableThinking !== undefined) {
    body.enable_thinking = preset.enableThinking
    body.chat_template_kwargs = {
      ...(body.chat_template_kwargs || {}),
      enable_thinking: preset.enableThinking,
    }
  }
  if (preset.thinkingBudget !== undefined) {
    body.thinking_budget = preset.thinkingBudget
    body.chat_template_kwargs = {
      ...(body.chat_template_kwargs || {}),
      thinking_budget: preset.thinkingBudget,
    }
  }
  if (preset.thinkingLevel) {
    body.extra_body = {
      ...(body.extra_body || {}),
      thinking_config: {
        include_thoughts: true,
        thinking_level: preset.thinkingLevel,
      },
    }
  }
}

function stripOpenAICompatEffort(body: OpenAICompatRequestBody): OpenAICompatRequestBody {
  const next: OpenAICompatRequestBody = { ...body }
  delete next.reasoning_effort
  delete next.reasoning
  delete next.verbosity
  delete next.thinking
  delete next.enable_thinking
  delete next.thinking_budget
  delete next.chat_template_kwargs
  if (next.extra_body) {
    const extraBody = { ...next.extra_body }
    delete extraBody.thinking
    delete extraBody.reasoning_summary
    delete extraBody.thinking_config
    next.extra_body = Object.keys(extraBody).length ? extraBody : undefined
  }
  return next
}

function shouldRetryWithoutEffort(status: number, text: string, appliedEffort: AppliedOpenAICompatEffort | undefined): boolean {
  if (!appliedEffort || (status !== 400 && status !== 422)) {
    return false
  }
  const lowered = text.toLowerCase()
  return [
    'reasoning_effort',
    'reasoning_content',
    'thinking',
    'enable_thinking',
    'thinking_budget',
    'chat_template_kwargs',
    'extra_body',
    'unknown parameter',
    'unsupported parameter',
    'unrecognized',
    'not supported',
    'extra inputs are not permitted',
  ].some(pattern => lowered.includes(pattern))
}

async function sendOpenAICompatRequest(body: OpenAICompatRequestBody, apiKey: string, signal: AbortSignal): Promise<Response> {
  return fetch(`${getOpenAIBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': getUserAgent(),
    },
    body: JSON.stringify(body),
    signal,
    ...getProxyFetchOptions(),
  } as RequestInit)
}

function contentToText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map(block => {
      if (!block || typeof block !== 'object') return ''
      const typed = block as Record<string, unknown>
      switch (typed.type) {
        case 'text':
          return typeof typed.text === 'string' ? typed.text : ''
        case 'tool_result':
          return typeof typed.content === 'string'
            ? typed.content
            : JSON.stringify(typed.content ?? '')
        case 'image':
          return '[Image omitted: OpenAI-compatible adapter currently supports text only]'
        case 'document':
          return '[Document omitted: OpenAI-compatible adapter currently supports text only]'
        default:
          return ''
      }
    })
    .filter(Boolean)
    .join('\n')
}

function toolResultContentToText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return JSON.stringify(content ?? '')
  return content
    .map(block => {
      if (!block || typeof block !== 'object') return ''
      const typed = block as Record<string, unknown>
      if (typed.type === 'text') {
        return typeof typed.text === 'string' ? typed.text : ''
      }
      return JSON.stringify(typed)
    })
    .filter(Boolean)
    .join('\n')
}

function convertAssistantToolCalls(content: unknown): OpenAIToolCall[] {
  if (!Array.isArray(content)) return []
  return content
    .filter(block => {
      return !!block && typeof block === 'object' && (block as Record<string, unknown>).type === 'tool_use'
    })
    .map(block => {
      const typed = block as Record<string, unknown>
      return {
        id: String(typed.id ?? `call_${randomUUID()}`),
        type: 'function' as const,
        function: {
          name: String(typed.name ?? ''),
          arguments: JSON.stringify(typed.input ?? {}),
        },
      }
    })
    .filter(toolCall => toolCall.function.name)
}

function assistantTextContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map(block => {
      if (!block || typeof block !== 'object') return ''
      const typed = block as Record<string, unknown>
      return typed.type === 'text' && typeof typed.text === 'string'
        ? typed.text
        : ''
    })
    .filter(Boolean)
    .join('\n')
}

function convertMessages(messages: Message[], systemPrompt: SystemPrompt, tools: Tools): OpenAIChatMessage[] {
  const converted: OpenAIChatMessage[] = []
  const system = systemPrompt.join('\n\n').trim()
  if (system) {
    converted.push({ role: 'system', content: system })
  }

  for (const message of normalizeMessagesForAPI(messages, tools)) {
    if (message.type === 'user') {
      const content = message.message.content
      if (Array.isArray(content)) {
        let hasToolResults = false
        for (const block of content) {
          if (!block || typeof block !== 'object') continue
          const typed = block as Record<string, unknown>
          if (typed.type !== 'tool_result') continue
          const toolUseId = typeof typed.tool_use_id === 'string' ? typed.tool_use_id : ''
          if (!toolUseId) continue
          hasToolResults = true
          converted.push({
            role: 'tool',
            tool_call_id: toolUseId,
            content: toolResultContentToText(typed.content),
          })
        }
        const nonToolText = contentToText(
          content.filter(block => {
            return !(block && typeof block === 'object' && (block as Record<string, unknown>).type === 'tool_result')
          }),
        )
        if (nonToolText) {
          converted.push({ role: 'user', content: nonToolText })
        } else if (!hasToolResults) {
          const text = contentToText(content)
          if (text) converted.push({ role: 'user', content: text })
        }
      } else {
        const text = contentToText(content)
        if (text) converted.push({ role: 'user', content: text })
      }
    } else if (message.type === 'assistant') {
      const toolCalls = convertAssistantToolCalls(message.message.content)
      const text = assistantTextContent(message.message.content)
      if (toolCalls.length > 0) {
        converted.push({
          role: 'assistant',
          content: text || null,
          tool_calls: toolCalls,
        })
      } else if (text) {
        converted.push({ role: 'assistant', content: text })
      }
    }
  }
  return converted
}

async function convertTools(tools: Tools, options: Options, model: string): Promise<OpenAITool[]> {
  const enabledTools = tools.filter(tool => tool.isEnabled())
  const toolSchemas = await Promise.all(
    enabledTools.map(tool =>
      toolToAPISchema(tool, {
        getToolPermissionContext: options.getToolPermissionContext,
        tools,
        agents: options.agents,
        allowedAgentTypes: options.allowedAgentTypes,
        model,
      }),
    ),
  )
  return toolSchemas
    .filter(schema => 'name' in schema && 'input_schema' in schema)
    .map(schema => {
      const toolSchema = schema as {
        name: string
        description?: string
        input_schema?: Record<string, unknown>
      }
      return {
        type: 'function',
        function: {
          name: toolSchema.name,
          description: toolSchema.description ?? '',
          parameters: toolSchema.input_schema ?? { type: 'object', properties: {} },
        },
      } as OpenAITool
    })
}

function usageFromOpenAI(usage?: OpenAIStreamChunk['usage']): BetaUsage {
  return {
    ...EMPTY_USAGE,
    input_tokens: usage?.prompt_tokens ?? 0,
    output_tokens: usage?.completion_tokens ?? 0,
  } as BetaUsage
}

function createTextEvent(index: number): StreamEvent {
  return {
    type: 'stream_event',
    event: {
      type: 'content_block_start',
      index,
      content_block: { type: 'text', text: '' },
    },
  } as StreamEvent
}

function createTextDeltaEvent(index: number, text: string): StreamEvent {
  return {
    type: 'stream_event',
    event: {
      type: 'content_block_delta',
      index,
      delta: { type: 'text_delta', text },
    },
  } as StreamEvent
}

function createTextStopEvent(index: number): StreamEvent {
  return {
    type: 'stream_event',
    event: { type: 'content_block_stop', index },
  } as StreamEvent
}

function createToolUseEvent(index: number, toolCall: Required<PendingOpenAIToolCall>): StreamEvent {
  return {
    type: 'stream_event',
    event: {
      type: 'content_block_start',
      index,
      content_block: {
        type: 'tool_use',
        id: toolCall.id,
        name: toolCall.name,
        input: {},
      },
    },
  } as StreamEvent
}

function createToolInputDeltaEvent(index: number, partialJson: string): StreamEvent {
  return {
    type: 'stream_event',
    event: {
      type: 'content_block_delta',
      index,
      delta: {
        type: 'input_json_delta',
        partial_json: partialJson,
      },
    },
  } as StreamEvent
}

function createMessageStartEvent(
  id: string,
  model: string,
  usage: BetaUsage,
): StreamEvent {
  return {
    type: 'stream_event',
    event: {
      type: 'message_start',
      message: {
        id,
        type: 'message',
        role: 'assistant',
        model,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage,
      },
    },
    ttftMs: 0,
  } as StreamEvent
}

function createMessageDeltaEvent(usage: BetaUsage, finishReason: string | null): StreamEvent {
  return {
    type: 'stream_event',
    event: {
      type: 'message_delta',
      delta: {
        stop_reason: finishReason === 'length'
          ? 'max_tokens'
          : finishReason === 'tool_calls'
            ? 'tool_use'
            : 'end_turn',
        stop_sequence: null,
      },
      usage,
    },
  } as StreamEvent
}

function createMessageStopEvent(): StreamEvent {
  return {
    type: 'stream_event',
    event: { type: 'message_stop' },
  } as StreamEvent
}

async function* parseSSE(response: Response): AsyncGenerator<OpenAIStreamChunk> {
  if (!response.body) return
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true })
    let boundary: number
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      for (const line of rawEvent.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice('data:'.length).trim()
        if (!data || data === '[DONE]') continue
        yield JSON.parse(data) as OpenAIStreamChunk
      }
    }
  }
}

function completeToolCall(toolCall: PendingOpenAIToolCall): Required<PendingOpenAIToolCall> {
  return {
    index: toolCall.index,
    id: toolCall.id || `call_${randomUUID()}`,
    name: toolCall.name || 'unknown_tool',
    arguments: toolCall.arguments || '{}',
  }
}

function parseToolInput(input: string): Record<string, unknown> {
  const parsed = safeParseJSON(input, false)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : {}
}

export async function* queryOpenAICompatWithStreaming({
  messages,
  systemPrompt,
  tools,
  signal,
  options,
}: {
  messages: Message[]
  systemPrompt: SystemPrompt
  thinkingConfig: ThinkingConfig
  tools: Tools
  signal: AbortSignal
  options: Options
}): AsyncGenerator<StreamEvent | AssistantMessage, void> {
  const apiKey = getOpenAICompatApiKey()
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required when CLAUDE_CODE_USE_OPENAI_COMPAT=1')
  }

  const model = getOpenAIModel(options.model)
  const maxTokens = options.maxOutputTokensOverride ?? 4096
  const openAITools = await convertTools(tools, options, model)
  const body: OpenAICompatRequestBody = {
    model,
    messages: convertMessages(messages, systemPrompt, tools),
    stream: true,
    stream_options: { include_usage: true },
    max_tokens: maxTokens,
    ...(openAITools.length > 0 ? { tools: openAITools, tool_choice: 'auto' as const } : {}),
    ...(options.temperatureOverride !== undefined ? { temperature: options.temperatureOverride } : {}),
  }
  const appliedEffort = applyOpenAICompatEffort(body, model, options.effortValue)

  let response = await sendOpenAICompatRequest(body, apiKey, signal)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    if (shouldRetryWithoutEffort(response.status, text, appliedEffort)) {
      response = await sendOpenAICompatRequest(stripOpenAICompatEffort(body), apiKey, signal)
      if (response.ok) {
        // Some OpenAI-compatible endpoints reject provider-specific effort
        // fields. Keep the session usable and let the server default win.
      } else {
        const retryText = await response.text().catch(() => '')
        throw new Error(`OpenAI-compatible API error ${response.status}: ${retryText || response.statusText}`)
      }
    } else {
      throw new Error(`OpenAI-compatible API error ${response.status}: ${text || response.statusText}`)
    }
  }

  const messageId = `msg_${randomUUID()}`
  let text = ''
  let started = false
  let textBlockIndex: number | null = null
  let nextContentBlockIndex = 0
  let firstChunkAt: number | null = null
  let finishReason: string | null = null
  let usage = usageFromOpenAI()
  const toolCalls = new Map<number, PendingOpenAIToolCall>()
  const emittedToolCallIndexes = new Set<number>()
  const toolCallBlockIndexes = new Map<number, number>()
  const requestStart = Date.now()

  for await (const chunk of parseSSE(response)) {
    if (!started) {
      started = true
      firstChunkAt = Date.now()
      const startEvent = createMessageStartEvent(messageId, model, usage)
      startEvent.ttftMs = firstChunkAt - requestStart
      yield startEvent
    }

    const delta = chunk.choices?.[0]?.delta?.content ?? ''
    if (delta) {
      if (textBlockIndex === null) {
        textBlockIndex = nextContentBlockIndex++
        yield createTextEvent(textBlockIndex)
      }
      text += delta
      yield createTextDeltaEvent(textBlockIndex, delta)
    }

    for (const toolCallDelta of chunk.choices?.[0]?.delta?.tool_calls ?? []) {
      const toolCallIndex = toolCallDelta.index ?? 0
      const existing = toolCalls.get(toolCallIndex) ?? {
        index: toolCallIndex,
        arguments: '',
      }
      if (toolCallDelta.id) {
        existing.id = toolCallDelta.id
      }
      if (toolCallDelta.function?.name) {
        existing.name = toolCallDelta.function.name
      }
      if (toolCallDelta.function?.arguments) {
        existing.arguments += toolCallDelta.function.arguments
      }
      toolCalls.set(toolCallIndex, existing)

      if (!emittedToolCallIndexes.has(toolCallIndex) && existing.id && existing.name) {
        emittedToolCallIndexes.add(toolCallIndex)
        const blockIndex = nextContentBlockIndex++
        toolCallBlockIndexes.set(toolCallIndex, blockIndex)
        yield createToolUseEvent(blockIndex, completeToolCall(existing))
        if (existing.arguments) {
          yield createToolInputDeltaEvent(blockIndex, existing.arguments)
        }
      } else if (emittedToolCallIndexes.has(toolCallIndex) && toolCallDelta.function?.arguments) {
        const blockIndex = toolCallBlockIndexes.get(toolCallIndex)
        if (blockIndex !== undefined) {
          yield createToolInputDeltaEvent(blockIndex, toolCallDelta.function.arguments)
        }
      }
    }
    finishReason = chunk.choices?.[0]?.finish_reason ?? finishReason
    if (chunk.usage) {
      usage = usageFromOpenAI(chunk.usage)
    }
  }

  if (!started) {
    yield createMessageStartEvent(messageId, model, usage)
  }
  if (textBlockIndex !== null) {
    yield createTextStopEvent(textBlockIndex)
  }
  for (const toolCallIndex of Array.from(emittedToolCallIndexes).sort((a, b) => a - b)) {
    const blockIndex = toolCallBlockIndexes.get(toolCallIndex)
    if (blockIndex !== undefined) {
      yield createTextStopEvent(blockIndex)
    }
  }
  yield createMessageDeltaEvent(usage, finishReason)
  yield createMessageStopEvent()

  const content: BetaContentBlock[] = []
  if (text) {
    content.push({ type: 'text', text } as BetaContentBlock)
  }
  for (const toolCall of Array.from(toolCalls.values()).sort((a, b) => a.index - b.index)) {
    const completed = completeToolCall(toolCall)
    content.push({
      type: 'tool_use',
      id: completed.id,
      name: completed.name,
      input: parseToolInput(completed.arguments),
    } as BetaContentBlock)
  }
  if (content.length === 0) {
    content.push({ type: 'text', text: '(no content)' } as BetaContentBlock)
  }
  yield {
    type: 'assistant',
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
    message: {
      id: messageId,
      type: 'message',
      role: 'assistant',
      model,
      content,
      stop_reason: finishReason === 'length'
        ? 'max_tokens'
        : finishReason === 'tool_calls'
          ? 'tool_use'
          : 'end_turn',
      stop_sequence: null,
      usage,
    },
    requestId: response.headers.get('x-request-id') ?? undefined,
  } as AssistantMessage
}
