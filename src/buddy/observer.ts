import type { Message } from '../types/message.js'
import { getCompanion } from './companion.js'

const REACTIONS = [
  'Still here.',
  'Tiny progress counts.',
  'Good instincts.',
  'Nice steady work.',
  'I saw that.',
]

function pickReaction(messages: Message[]): string | undefined {
  const companion = getCompanion()
  if (!companion || messages.length === 0) return undefined
  const index =
    Math.abs(messages.length + companion.name.length + Date.now()) %
    REACTIONS.length
  return REACTIONS[index]
}

export async function fireCompanionObserver(
  messages: Message[],
  onReaction: (reaction: string) => void,
): Promise<void> {
  const reaction = pickReaction(messages)
  if (!reaction) return
  onReaction(reaction)
}
