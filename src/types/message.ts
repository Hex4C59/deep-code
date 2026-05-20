import type { ContentBlockParam, MessageParam } from 'src/types/api-types.js'
import type { UUID } from 'crypto'

export type BaseLocalMessage = {
  uuid: UUID
  type: string
  timestamp: string
  isMeta?: boolean
  [key: string]: any
}

export type AssistantMessage<T = any> = BaseLocalMessage & {
  type: 'assistant'
  message: T
  requestId?: string
}

export type UserMessage<T = any> = BaseLocalMessage & {
  type: 'user'
  message: T
  toolUseResult?: unknown
  sourceToolAssistantUUID?: UUID
  imagePasteIds?: number[]
}

export type AttachmentMessage<T = any> = BaseLocalMessage & {
  type: 'attachment'
  attachment: T
  message?: MessageParam
}

export type ProgressMessage<T = any> = BaseLocalMessage & {
  type: 'progress'
  data: T
  toolUseID?: string
}

export type SystemMessage<T = any> = BaseLocalMessage & {
  type: 'system'
  message?: T
  content?: string
}

export type SystemLocalCommandMessage = SystemMessage & {
  subtype?: 'local_command'
  command?: string
}

export type SystemAPIErrorMessage = SystemMessage
export type SystemAgentsKilledMessage = SystemMessage
export type SystemApiMetricsMessage = SystemMessage
export type SystemAwaySummaryMessage = SystemMessage
export type SystemBridgeStatusMessage = SystemMessage
export type SystemCompactBoundaryMessage = SystemMessage
export type SystemInformationalMessage = SystemMessage
export type SystemMemorySavedMessage = SystemMessage
export type SystemMicrocompactBoundaryMessage = SystemMessage
export type SystemPermissionRetryMessage = SystemMessage
export type SystemScheduledTaskFireMessage = SystemMessage
export type SystemStopHookSummaryMessage = SystemMessage
export type SystemTurnDurationMessage = SystemMessage
export type SystemThinkingMessage = SystemMessage
export type SystemFileSnapshotMessage = SystemMessage

export type HookResultMessage = AttachmentMessage
export type PartialCompactDirection = Record<string, any>
export type StopHookInfo = { command: string; durationMs: number; [key: string]: any }
export type TombstoneMessage = BaseLocalMessage & { type: 'tombstone' }
export type ToolUseSummaryMessage = BaseLocalMessage & { type: 'tool_use_summary' }
export type GroupedToolUseMessage = BaseLocalMessage & { type: 'grouped_tool_use' }
export type CollapsedReadSearchGroup = Record<string, any>

export type NormalizedAssistantMessage<T = any> = AssistantMessage<T>
export type NormalizedUserMessage<T = any> = UserMessage<T>
export type NormalizedMessage = any
export type RenderableMessage = any
export type Message = any

export type UserContent = string | ContentBlockParam[]
