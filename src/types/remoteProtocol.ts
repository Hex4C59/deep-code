export type RemoteMessageContent =
  | string
  | Array<{ type: string; [key: string]: unknown }>

export type RemotePermissionResponse =
  | {
      behavior: 'allow'
      updatedInput: Record<string, unknown>
    }
  | {
      behavior: 'deny'
      message: string
    }
