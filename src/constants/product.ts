export const PRODUCT_URL = 'https://claude.com/claude-code'

export function isRemoteSessionLocal(
  _sessionId?: string,
  _ingressUrl?: string,
): boolean {
  return true
}

export function getRemoteSessionUrl(
  sessionId: string,
  _ingressUrl?: string,
): string {
  return sessionId
}
