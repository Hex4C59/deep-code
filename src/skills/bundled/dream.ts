import { getOriginalCwd } from '../../bootstrap/state.js'
import { getAutoMemPath, isAutoMemoryEnabled } from '../../memdir/paths.js'
import { buildConsolidationPrompt } from '../../services/autoDream/consolidationPrompt.js'
import { recordConsolidation } from '../../services/autoDream/consolidationLock.js'
import { getProjectDir } from '../../utils/sessionStorage.js'
import { registerBundledSkill } from '../bundledSkills.js'

export function registerDreamSkill(): void {
  registerBundledSkill({
    name: 'dream',
    description:
      'Reflect over auto-memory and recent sessions, then consolidate durable memories.',
    whenToUse:
      'Use when the user wants to manually run memory consolidation, prune stale memory, or refresh the memory index from recent session history.',
    argumentHint: '[focus]',
    userInvocable: true,
    isEnabled: () => isAutoMemoryEnabled(),
    async getPromptForCommand(args) {
      await recordConsolidation()
      const memoryRoot = getAutoMemPath()
      const transcriptDir = getProjectDir(getOriginalCwd())
      const extra = args.trim()
        ? `User focus for this dream run:\n${args.trim()}`
        : ''
      return [
        {
          type: 'text',
          text: buildConsolidationPrompt(memoryRoot, transcriptDir, extra),
        },
      ]
    },
  })
}
