import type { Command } from '../../commands.js'

const buddy = {
  type: 'local-jsx',
  name: 'buddy',
  description: 'Hatch, show, mute, or pet your terminal companion',
  argumentHint: '[show|mute|reroll]',
  immediate: true,
  load: () => import('./buddy.js'),
} satisfies Command

export default buddy
