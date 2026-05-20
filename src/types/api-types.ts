export type APIRecord = Record<string, any>

export type CacheControlEphemeral = {
  type?: 'ephemeral'
  ttl?: string
  [key: string]: any
}

export type Base64ImageSource = {
  type?: 'base64'
  media_type?: string
  data?: string
  [key: string]: any
}

export type TextBlockParam = {
  type: 'text'
  text: string
  cache_control?: CacheControlEphemeral | null
  [key: string]: any
}

export type ThinkingBlockParam = {
  type: 'thinking'
  thinking: string
  signature?: string
  [key: string]: any
}

export type ThinkingBlock = ThinkingBlockParam

export type ToolUseBlockParam = {
  type: 'tool_use'
  id: string
  name: string
  input?: unknown
  [key: string]: any
}

export type ToolUseBlock = ToolUseBlockParam
export type BetaToolUseBlock = ToolUseBlockParam

export type ToolResultBlockParam = {
  type: 'tool_result'
  tool_use_id: string
  content?: string | ContentBlockParam[]
  is_error?: boolean
  [key: string]: any
}

export type ImageBlockParam = {
  type: 'image'
  source: Base64ImageSource | APIRecord
  [key: string]: any
}

export type ContentBlockParam =
  | string
  | TextBlockParam
  | ThinkingBlockParam
  | ToolUseBlockParam
  | ToolResultBlockParam
  | ImageBlockParam
  | APIRecord

export type ContentBlock = APIRecord
export type BetaContentBlock = APIRecord

export type MessageParam = {
  role: 'user' | 'assistant'
  content: string | ContentBlockParam[]
  [key: string]: any
}

export type BetaMessageParam = MessageParam

export type BetaTool = {
  name?: string
  description?: string
  input_schema?: unknown
  [key: string]: any
}

export type BetaToolUnion = BetaTool | APIRecord

export type Usage = {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
  [key: string]: any
}

export type BetaUsage = Usage
export type BetaMessageStreamParams = APIRecord

export type ClientOptions = {
  fetch?: typeof fetch
  fetchOptions?: unknown
  logger?: {
    error?: (...args: any[]) => void
    warn?: (...args: any[]) => void
    info?: (...args: any[]) => void
    debug?: (...args: any[]) => void
  }
  [key: string]: any
}

export type Stream<T = unknown> = AsyncIterable<T> & APIRecord

export interface Anthropic {
  beta: APIRecord
  messages?: APIRecord
  [key: string]: any
}

export namespace Anthropic {
  export type ContentBlock = import('./api-types.js').ContentBlock
  export type ContentBlockParam = import('./api-types.js').ContentBlockParam

  export namespace Beta {
    export namespace Messages {
      export type BetaMessageParam =
        import('./api-types.js').BetaMessageParam
      export type BetaToolUnion = import('./api-types.js').BetaToolUnion
    }
  }
}
