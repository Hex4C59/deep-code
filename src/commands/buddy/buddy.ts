import type { LocalJSXCommandContext } from '../../commands.js'
import type { LocalJSXCommandOnDone } from '../../types/command.js'
import { companionUserId, getCompanion, roll } from '../../buddy/companion.js'
import type { StoredCompanion } from '../../buddy/types.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'

const NAMES = [
  'Pip',
  'Bit',
  'Miso',
  'Nori',
  'Widget',
  'Kernel',
  'Pebble',
  'Scout',
  'Nova',
  'Patch',
]

function makeStoredCompanion(seedOffset = 0): StoredCompanion {
  const { bones, inspirationSeed } = roll(companionUserId())
  const name = NAMES[Math.abs(inspirationSeed + seedOffset) % NAMES.length]!
  return {
    name,
    personality: `A ${bones.rarity} ${bones.species} who keeps quiet company while you code.`,
    hatchedAt: Date.now(),
  }
}

function saveCompanion(update: {
  companion?: StoredCompanion
  companionMuted?: boolean
}): void {
  saveGlobalConfig(current => ({
    ...current,
    ...update,
  }))
}

function pet(context: LocalJSXCommandContext): void {
  context.setAppState(prev => ({
    ...prev,
    companionPetAt: Date.now(),
  }))
}

export async function call(
  onDone: LocalJSXCommandOnDone,
  context: LocalJSXCommandContext,
  args: string,
): Promise<null> {
  const command = args.trim().toLowerCase()
  const config = getGlobalConfig()

  if (command === 'mute' || command === 'hide') {
    saveCompanion({ companionMuted: true })
    onDone('Buddy hidden. Run /buddy show to bring them back.', {
      display: 'system',
    })
    return null
  }

  if (command === 'reroll' || command === 'reset') {
    const companion = makeStoredCompanion(Date.now())
    saveCompanion({ companion, companionMuted: false })
    pet(context)
    onDone(`Buddy re-hatched as ${companion.name}.`, { display: 'system' })
    return null
  }

  if (command === 'show' || command === 'unmute') {
    const companion = config.companion ?? makeStoredCompanion()
    saveCompanion({ companion, companionMuted: false })
    pet(context)
    onDone(`Buddy is here: ${companion.name}.`, { display: 'system' })
    return null
  }

  const companion = getCompanion()
  if (companion) {
    if (config.companionMuted) {
      saveCompanion({ companionMuted: false })
    }
    pet(context)
    onDone(`You pet ${companion.name}.`, { display: 'system' })
    return null
  }

  const hatched = makeStoredCompanion()
  saveCompanion({ companion: hatched, companionMuted: false })
  pet(context)
  onDone(`Buddy hatched: ${hatched.name}.`, { display: 'system' })
  return null
}
