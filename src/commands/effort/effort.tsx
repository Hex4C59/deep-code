import * as React from 'react'
import { Select } from '../../components/CustomSelect/select.js'
import { COMMON_HELP_ARGS, COMMON_INFO_ARGS } from '../../constants/xml.js'
import { useMainLoopModel } from '../../hooks/useMainLoopModel.js'
import { Box, Text } from '../../ink.js'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '../../services/analytics/index.js'
import { useAppState, useSetAppState } from '../../state/AppState.js'
import type { LocalJSXCommandOnDone } from '../../types/command.js'
import {
  EFFORT_LEVELS,
  type EffortLevel,
  type EffortValue,
  getDisplayedEffortLevel,
  getEffortEnvOverride,
  getEffortValueDescription,
  getDefaultEffortForModel,
  getSelectableEffortLevels,
  isEffortLevel,
  modelSupportsEffort,
  convertEffortValueToLevel,
  toPersistableEffort,
} from '../../utils/effort.js'
import { updateSettingsForSource } from '../../utils/settings/settings.js'

type EffortCommandResult = {
  message: string
  effortUpdate?: {
    value: EffortValue | undefined
  }
}

function setEffortValue(effortValue: EffortValue): EffortCommandResult {
  const persistable = toPersistableEffort(effortValue)
  if (persistable !== undefined) {
    const result = updateSettingsForSource('userSettings', {
      effortLevel: persistable,
    })
    if (result.error) {
      return {
        message: `Failed to set effort level: ${result.error.message}`,
      }
    }
  }

  logEvent('tengu_effort_command', {
    effort:
      effortValue as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  })

  const envOverride = getEffortEnvOverride()
  if (envOverride !== undefined && envOverride !== effortValue) {
    const envRaw = process.env.CLAUDE_CODE_EFFORT_LEVEL
    if (persistable === undefined) {
      return {
        message: `Not applied: CLAUDE_CODE_EFFORT_LEVEL=${envRaw} overrides effort this session, and ${effortValue} is session-only (nothing saved)`,
        effortUpdate: { value: effortValue },
      }
    }
    return {
      message: `CLAUDE_CODE_EFFORT_LEVEL=${envRaw} overrides this session - clear it and ${effortValue} takes over`,
      effortUpdate: { value: effortValue },
    }
  }

  const description = getEffortValueDescription(effortValue)
  const suffix = persistable !== undefined ? '' : ' (this session only)'
  return {
    message: `Set effort level to ${effortValue}${suffix}: ${description}`,
    effortUpdate: { value: effortValue },
  }
}

export function showCurrentEffort(
  appStateEffort: EffortValue | undefined,
  model: string,
): EffortCommandResult {
  const envOverride = getEffortEnvOverride()
  const effectiveValue =
    envOverride === null ? undefined : envOverride ?? appStateEffort
  if (effectiveValue === undefined) {
    const level = getDisplayedEffortLevel(model, appStateEffort)
    return {
      message: `Effort level: auto (currently ${level})`,
    }
  }
  const description = getEffortValueDescription(effectiveValue)
  return {
    message: `Current effort level: ${effectiveValue} (${description})`,
  }
}

function unsetEffortLevel(): EffortCommandResult {
  const result = updateSettingsForSource('userSettings', {
    effortLevel: undefined,
  })
  if (result.error) {
    return {
      message: `Failed to set effort level: ${result.error.message}`,
    }
  }

  logEvent('tengu_effort_command', {
    effort: 'auto' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  })

  const envOverride = getEffortEnvOverride()
  if (envOverride !== undefined && envOverride !== null) {
    const envRaw = process.env.CLAUDE_CODE_EFFORT_LEVEL
    return {
      message: `Cleared effort from settings, but CLAUDE_CODE_EFFORT_LEVEL=${envRaw} still controls this session`,
      effortUpdate: { value: undefined },
    }
  }
  return {
    message: 'Effort level set to auto',
    effortUpdate: { value: undefined },
  }
}

export function executeEffort(args: string): EffortCommandResult {
  const normalized = args.toLowerCase()
  if (normalized === 'auto' || normalized === 'unset') {
    return unsetEffortLevel()
  }

  if (!isEffortLevel(normalized)) {
    return {
      message: `Invalid argument: ${args}. Valid options are: ${EFFORT_LEVELS.join(', ')}, auto`,
    }
  }
  return setEffortValue(normalized)
}

function applyEffortResult(
  result: EffortCommandResult,
  setAppState: ReturnType<typeof useSetAppState>,
  onDone: LocalJSXCommandOnDone,
): void {
  if (result.effortUpdate) {
    setAppState(prev => ({
      ...prev,
      effortValue: result.effortUpdate?.value,
    }))
  }
  onDone(result.message)
}

function ShowCurrentEffort({
  onDone,
}: {
  onDone: LocalJSXCommandOnDone
}): React.ReactNode {
  const effortValue = useAppState(s => s.effortValue)
  const model = useMainLoopModel()
  const { message } = showCurrentEffort(effortValue, model)
  onDone(message)
  return null
}

function ApplyEffortAndClose({
  result,
  onDone,
}: {
  result: EffortCommandResult
  onDone: LocalJSXCommandOnDone
}): React.ReactNode {
  const setAppState = useSetAppState()
  React.useEffect(() => {
    applyEffortResult(result, setAppState, onDone)
  }, [setAppState, result, onDone])
  return null
}

function EffortPicker({
  onDone,
}: {
  onDone: LocalJSXCommandOnDone
}): React.ReactNode {
  const model = useMainLoopModel()
  const effortValue = useAppState(s => s.effortValue)
  const setAppState = useSetAppState()
  const currentLevel = getDisplayedEffortLevel(model, effortValue)
  const modelDefaultLevel = convertEffortValueToLevel(
    getDefaultEffortForModel(model) ?? 'high',
  )
  const selectableLevels = getSelectableEffortLevels(model)

  if (!modelSupportsEffort(model) || selectableLevels.length === 0) {
    onDone(`Effort is not supported for ${model}`)
    return null
  }

  const visibleLevels = selectableLevels.filter(level => level !== 'none')
  const options: Array<{
    label: React.ReactNode
    value: EffortLevel | 'auto'
    description?: string
  }> = [
    {
      label: (
        <Text>
          Model default <Text dimColor={true}>({modelDefaultLevel})</Text>
        </Text>
      ),
      value: 'auto',
      description: 'Clear manual effort and follow this model default',
    },
    ...visibleLevels.map(level => ({
      label: (
        <Text>
          {level}
          {effortValue === level ? <Text color="success"> selected</Text> : null}
        </Text>
      ),
      value: level,
      description: getEffortValueDescription(level),
    })),
  ]

  const defaultFocusValue =
    isEffortLevel(String(effortValue)) && visibleLevels.includes(effortValue)
      ? effortValue
      : 'auto'

  function handleSelect(value: EffortLevel | 'auto'): void {
    const result = value === 'auto' ? unsetEffortLevel() : setEffortValue(value)
    applyEffortResult(result, setAppState, onDone)
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column">
        <Text color="remember" bold={true}>
          Select effort
        </Text>
        <Text dimColor={true}>
          Current model: {model}
        </Text>
      </Box>
      <Select
        options={options}
        onChange={handleSelect}
        onCancel={() => onDone('Effort unchanged')}
        defaultFocusValue={defaultFocusValue}
        visibleOptionCount={Math.min(options.length, 8)}
      />
      <Text dimColor={true} italic={true}>
        Enter to confirm - Esc to cancel
      </Text>
    </Box>
  )
}

export async function call(
  onDone: LocalJSXCommandOnDone,
  _context: unknown,
  args?: string,
): Promise<React.ReactNode> {
  args = args?.trim() || ''
  if (COMMON_HELP_ARGS.includes(args)) {
    onDone(
      'Usage: /effort [none|minimal|low|medium|high|max|xhigh|auto]\n\nRun /effort with no arguments to choose from the levels supported by the current model.\n\nEffort levels:\n- none: No extra reasoning effort\n- minimal: Minimal reasoning for very quick responses\n- low: Quick, straightforward implementation\n- medium: Balanced approach with standard testing\n- high: Comprehensive implementation with extensive testing\n- max: Maximum capability with deeper reasoning\n- xhigh: Extra-high reasoning when supported\n- auto: Use the default effort level for your model',
    )
    return null
  }
  if (COMMON_INFO_ARGS.includes(args)) {
    return <ShowCurrentEffort onDone={onDone} />
  }
  if (!args) {
    return <EffortPicker onDone={onDone} />
  }
  const result = executeEffort(args)
  return <ApplyEffortAndClose result={result} onDone={onDone} />
}
