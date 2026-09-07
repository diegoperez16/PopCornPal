function errorRecord(error: unknown): Record<string, unknown> {
  return error !== null && typeof error === 'object'
    ? (error as Record<string, unknown>)
    : {}
}

export function isAuthError(error: unknown): boolean {
  const record = errorRecord(error)
  const message =
    typeof record.message === 'string' ? record.message.toLowerCase() : ''
  return (
    record.code === 'PGRST301' ||
    record.code === 'PGRST303' ||
    record.status === 401 ||
    message.includes('jwt') ||
    message.includes('token is expired')
  )
}

export function isNetworkError(error: unknown): boolean {
  // Supabase returns plain error records as well as Error instances.
  const record = errorRecord(error)
  const message =
    typeof record.message === 'string' ? record.message.toLowerCase() : ''
  return ['network', 'failed to fetch', 'fetch failed', 'load failed'].some(
    (value) => message.includes(value)
  )
}
