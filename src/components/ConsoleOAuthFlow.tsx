import React from 'react'
import { Box, Text } from '../ink.js'

type Props = {
  onDone(): void
  startingMessage?: string
  mode?: 'login' | 'setup-token'
  forceLoginMethod?: 'claudeai' | 'console'
}

export function ConsoleOAuthFlow({
  startingMessage,
  mode = 'login',
}: Props): React.ReactNode {
  const label = mode === 'setup-token' ? 'setup-token' : 'login'
  return (
    <Box flexDirection="column" gap={1}>
      {startingMessage ? <Text>{startingMessage}</Text> : null}
      <Text color="warning">
        Claude.ai OAuth {label} has been removed from Close Code.
      </Text>
      <Text dimColor>
        Configure an API key or OpenAI-compatible provider instead.
      </Text>
    </Box>
  )
}
