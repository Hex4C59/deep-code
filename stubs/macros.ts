// Global compile-time MACRO constants
// In the real Bun build, these are injected via --define at compile time.
// Here we provide runtime values matching the published v2.1.88.
declare global {
  var Bun: any
  namespace React {
    type ReactNode = import('react').ReactNode
  }
}

// This is never actually executed — the global is set in the entrypoint wrapper.
// But we need it so TypeScript doesn't complain about `MACRO` being undeclared.
export {}
