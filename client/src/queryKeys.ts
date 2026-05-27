export const queryKeys = {
  monitors: ['monitors'] as const,
  logs: (monitorId: string, offset: number, limit: number) =>
    ['monitor-logs', monitorId, { offset, limit }] as const,
  downEvents: ['down-events'] as const,
}
