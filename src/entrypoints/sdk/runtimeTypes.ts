import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'
import type { z } from 'zod/v4'
import type { SDKMessage, SDKUserMessage } from './coreTypes.js'

export type AnyZodRawShape = z.ZodRawShape
export type InferShape<Schema extends AnyZodRawShape> = z.infer<z.ZodObject<Schema>>

export type SdkMcpToolDefinition<Schema extends AnyZodRawShape = AnyZodRawShape> = {
  name: string
  description: string
  inputSchema: Schema
  handler: (args: InferShape<Schema>, extra: unknown) => Promise<unknown>
  annotations?: ToolAnnotations
  searchHint?: string
  alwaysLoad?: boolean
}

export type McpSdkServerConfigWithInstance = {
  type: 'sdk'
  name: string
  instance?: unknown
  [key: string]: unknown
}

export type Options = Record<string, unknown>
export type InternalOptions = Options
export type Query = AsyncIterable<SDKMessage>
export type InternalQuery = Query
export type SDKSessionOptions = Options
export type SDKSession = {
  query?: (prompt: string | AsyncIterable<SDKUserMessage>) => Query
  close?: () => void | Promise<void>
  [key: string]: unknown
}
export type SessionMessage = SDKMessage
export type GetSessionMessagesOptions = Record<string, unknown>
export type ListSessionsOptions = Record<string, unknown>
export type GetSessionInfoOptions = Record<string, unknown>
export type SessionMutationOptions = Record<string, unknown>
export type ForkSessionOptions = Record<string, unknown>
export type ForkSessionResult = Record<string, unknown>
export type SDKSessionInfo = any
