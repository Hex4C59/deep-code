// Stub for bun:bundle — feature() is compile-time in Bun; replaced by build script
const ENABLED_FEATURES = new Set(['BUDDY', 'KAIROS_DREAM'])

export function feature(flag: string): boolean {
  return ENABLED_FEATURES.has(flag)
}
