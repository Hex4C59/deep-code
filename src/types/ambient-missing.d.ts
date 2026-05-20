declare module 'react' {
  export type ReactNode = any
  export type ReactElement = any
  export type FC<P = any> = (props: P) => ReactNode
  export type RefObject<T = any> = { current: T | null }
  export type MutableRefObject<T = any> = { current: T }
  export type Dispatch<A = any> = (value: A) => void
  export type SetStateAction<S = any> = S | ((prevState: S) => S)
  export function useState<S = any>(initialState?: S | (() => S)): [S, Dispatch<SetStateAction<S>>]
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void
  export function useMemo<T = any>(factory: () => T, deps?: any[]): T
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps?: any[]): T
  export function useRef<T = any>(initialValue?: T): MutableRefObject<T>
  export function memo<T = any>(component: T): T
  export function createElement(...args: any[]): ReactElement
  const React: {
    createElement: typeof createElement
    memo: typeof memo
  }
  export default React
}

declare module 'react/jsx-runtime' {
  export const jsx: any
  export const jsxs: any
  export const Fragment: any
}

declare module './transports/Transport.js' {
  export type Transport = any
}

declare module './types.js' {
  export type SecureStorage = any
  export type SecureStorageData = any
}

declare module '@anthropic-ai/claude-agent-sdk' {
  export type PermissionMode = any
  export type SDKMessage = any
  export type SDKUserMessage = any
}

declare module '@anthropic-ai/mcpb' {
  export type McpbManifest = any
  export type McpbManifestAny = any
  export type McpbUserConfigurationOption = any
}

declare module '*' {
  export type ReactNode = any
  export type Transport = any
  export type OAuthTokens = any
  export type SecureStorage = any
  export type SecureStorageData = any
  export type SpinnerMode = any
  export type Workflow = any
  export type Warning = any
  export type State = any
  export type ViewState = any
  export type ParentViewState = any
  export type UnifiedInstalledItem = any
  const value: any
  export default value
}
