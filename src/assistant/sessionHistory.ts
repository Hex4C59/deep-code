import type { SDKMessage } from '../entrypoints/agentSdkTypes.js'

export const HISTORY_PAGE_SIZE = 100

export type HistoryPage = {
  /** Chronological order within the page. */
  events: SDKMessage[]
  /** Oldest event ID in this page → before_id cursor for next-older page. */
  firstId: string | null
  /** true = older events exist. */
  hasMore: boolean
}

type SessionEventsResponse = {
  data: SDKMessage[]
  has_more: boolean
  first_id: string | null
  last_id: string | null
}

export type HistoryAuthCtx = {
  baseUrl: string
  headers: Record<string, string>
}

/** Prepare auth + headers + base URL once, reuse across pages. */
export async function createHistoryAuthCtx(
  sessionId: string,
): Promise<HistoryAuthCtx> {
  void sessionId
  return {
    baseUrl: '',
    headers: {},
  }
}

/**
 * Newest page: last `limit` events, chronological, via anchor_to_latest.
 * has_more=true means older events exist.
 */
export async function fetchLatestEvents(
  ctx: HistoryAuthCtx,
  limit = HISTORY_PAGE_SIZE,
): Promise<HistoryPage | null> {
  void ctx
  void limit
  return null
}

/** Older page: events immediately before `beforeId` cursor. */
export async function fetchOlderEvents(
  ctx: HistoryAuthCtx,
  beforeId: string,
  limit = HISTORY_PAGE_SIZE,
): Promise<HistoryPage | null> {
  void ctx
  void beforeId
  void limit
  return null
}
