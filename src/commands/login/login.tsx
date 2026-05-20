import * as React from 'react'
import type { LocalJSXCommandContext } from '../../commands.js'
import { Text } from '../../ink.js'
import type { LocalJSXCommandOnDone } from '../../types/command.js'

export async function call(
  onDone: LocalJSXCommandOnDone,
  _context: LocalJSXCommandContext,
): Promise<React.ReactNode> {
  onDone(
    'Claude.ai OAuth login has been removed from Close Code. Configure an API key or OpenAI-compatible provider instead.',
  )
  return null
}

export function Login(props: {
  onDone: (success: boolean, mainLoopModel: string) => void
  startingMessage?: string
}): React.ReactNode {
  void props
  return (
    <Text color="warning">
      Claude.ai OAuth login has been removed from Close Code.
    </Text>
  )
}
