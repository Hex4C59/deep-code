import type { Message } from '../types/message.js'

type Props = {
  isLoading: boolean
  assistantMode?: boolean
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
}

export function useScheduledTasks(_props: Props): void {}
