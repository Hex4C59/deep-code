import { useCallback, useMemo } from 'react'
import type { ToolUseConfirm } from '../components/permissions/PermissionRequest.js'
import type { SpinnerMode } from '../components/Spinner/types.js'
import type { Tool } from '../Tool.js'
import type { Message as MessageType } from '../types/message.js'
import type { RemoteMessageContent } from '../types/remoteProtocol.js'
import type { StreamingToolUse } from '../utils/messages.js'

export type RemoteSessionConfig = never

type UseRemoteSessionProps = {
  config: RemoteSessionConfig | undefined
  setMessages: React.Dispatch<React.SetStateAction<MessageType[]>>
  setIsLoading: (loading: boolean) => void
  onInit?: (slashCommands: string[]) => void
  setToolUseConfirmQueue: React.Dispatch<React.SetStateAction<ToolUseConfirm[]>>
  tools: Tool[]
  setStreamingToolUses?: React.Dispatch<
    React.SetStateAction<StreamingToolUse[]>
  >
  setStreamMode?: React.Dispatch<React.SetStateAction<SpinnerMode>>
  setInProgressToolUseIDs?: (f: (prev: Set<string>) => Set<string>) => void
}

type UseRemoteSessionResult = {
  isRemoteMode: boolean
  sendMessage: (
    content: RemoteMessageContent,
    opts?: { uuid?: string },
  ) => Promise<boolean>
  cancelRequest: () => void
  disconnect: () => void
}

export function useRemoteSession({
  config: _config,
  setMessages: _setMessages,
  setIsLoading,
  onInit: _onInit,
  setToolUseConfirmQueue: _setToolUseConfirmQueue,
  tools: _tools,
  setStreamingToolUses: _setStreamingToolUses,
  setStreamMode: _setStreamMode,
  setInProgressToolUseIDs: _setInProgressToolUseIDs,
}: UseRemoteSessionProps): UseRemoteSessionResult {
  const isRemoteMode = false
  const sendMessage = useCallback(
    async (_content: RemoteMessageContent): Promise<boolean> => {
      setIsLoading(false)
      return false
    },
    [setIsLoading],
  )
  const cancelRequest = useCallback(() => {
    setIsLoading(false)
  }, [setIsLoading])
  const disconnect = useCallback(() => {}, [])

  return useMemo(
    () => ({ isRemoteMode, sendMessage, cancelRequest, disconnect }),
    [isRemoteMode, sendMessage, cancelRequest, disconnect],
  )
}
