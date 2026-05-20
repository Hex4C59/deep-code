type HeadersLike = globalThis.Headers | Record<string, string> | null | undefined

function normalizeHeaders(headers: HeadersLike): globalThis.Headers | undefined {
  if (!headers) return undefined
  if (headers instanceof globalThis.Headers) return headers
  return new globalThis.Headers(headers)
}

function getErrorName(error: unknown): string {
  if (!(error instanceof Error)) return ''
  return error.name || error.constructor?.name || ''
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export class APIError extends Error {
  readonly status: number | undefined
  readonly error: unknown
  readonly headers: globalThis.Headers | undefined
  readonly requestID: string | undefined

  constructor(
    status?: number,
    error?: unknown,
    message?: string,
    headers?: HeadersLike,
    requestID?: string,
  ) {
    super(message ?? getNestedErrorMessage(error) ?? 'API request failed')
    this.name = 'APIError'
    this.status = status
    this.error = error
    this.headers = normalizeHeaders(headers)
    this.requestID = requestID
  }
}

export class APIConnectionError extends APIError {
  constructor(options?: { message?: string; cause?: unknown }) {
    super(undefined, undefined, options?.message ?? 'Connection error')
    this.name = 'APIConnectionError'
    if (options?.cause !== undefined) {
      ;(this as Error & { cause?: unknown }).cause = options.cause
    }
  }
}

export class APIConnectionTimeoutError extends APIConnectionError {
  constructor(options?: { message?: string; cause?: unknown }) {
    super({ message: options?.message ?? 'Request timed out', cause: options?.cause })
    this.name = 'APIConnectionTimeoutError'
  }
}

export class APIUserAbortError extends Error {
  constructor(message = 'Request was aborted') {
    super(message)
    this.name = 'APIUserAbortError'
  }
}

export class AuthenticationError extends APIError {
  constructor(error?: unknown, message?: string, headers?: HeadersLike, requestID?: string) {
    super(401, error, message ?? getNestedErrorMessage(error) ?? 'Authentication failed', headers, requestID)
    this.name = 'AuthenticationError'
  }
}

export class NotFoundError extends APIError {
  constructor(error?: unknown, message?: string, headers?: HeadersLike, requestID?: string) {
    super(404, error, message ?? getNestedErrorMessage(error) ?? 'Not found', headers, requestID)
    this.name = 'NotFoundError'
  }
}

function getNestedErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const record = error as {
    message?: unknown
    error?: { message?: unknown; error?: { message?: unknown } }
  }
  if (typeof record.message === 'string') return record.message
  if (typeof record.error?.message === 'string') return record.error.message
  if (typeof record.error?.error?.message === 'string') {
    return record.error.error.message
  }
  return undefined
}

function getRequestID(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const record = error as { requestID?: unknown; request_id?: unknown }
  if (typeof record.requestID === 'string') return record.requestID
  if (typeof record.request_id === 'string') return record.request_id
  return undefined
}

function getStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const record = error as { status?: unknown; statusCode?: unknown }
  if (typeof record.status === 'number') return record.status
  if (typeof record.statusCode === 'number') return record.statusCode
  return undefined
}

function getHeaders(error: unknown): HeadersLike {
  if (!error || typeof error !== 'object') return undefined
  return (error as { headers?: HeadersLike }).headers
}

function getBody(error: unknown): unknown {
  if (!error || typeof error !== 'object') return undefined
  return (error as { error?: unknown }).error
}

export function normalizeProviderError(error: unknown): unknown {
  if (
    error instanceof APIError ||
    error instanceof APIConnectionError ||
    error instanceof APIUserAbortError
  ) {
    return error
  }

  const name = getErrorName(error)
  const message = getErrorMessage(error)
  const lowerMessage = message.toLowerCase()

  if (name === 'APIUserAbortError' || name === 'AbortError') {
    return new APIUserAbortError(message)
  }

  if (name === 'APIConnectionTimeoutError' || lowerMessage.includes('timeout')) {
    return new APIConnectionTimeoutError({ message, cause: error })
  }

  if (name === 'APIConnectionError') {
    return new APIConnectionError({ message, cause: error })
  }

  const status = getStatus(error)
  if (status !== undefined) {
    const body = getBody(error)
    const headers = getHeaders(error)
    const requestID = getRequestID(error)
    if (status === 401 || name === 'AuthenticationError') {
      return new AuthenticationError(body, message, headers, requestID)
    }
    if (status === 404 || name === 'NotFoundError') {
      return new NotFoundError(body, message, headers, requestID)
    }
    return new APIError(status, body, message, headers, requestID)
  }

  return error
}
