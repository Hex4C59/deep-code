// Auto-generated stub
const ENABLED_FEATURES = new Set(['BUDDY', 'KAIROS_DREAM'])

export function feature(flag) {
  return ENABLED_FEATURES.has(flag)
}

export default { feature }
