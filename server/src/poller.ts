import { getDb, saveDb } from './db/connection.js';

const timers = new Map<string, ReturnType<typeof setInterval>>();

async function doFetch(url: string, method: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, method });
    return { status: res.status, ok: res.status < 400 };
  } finally {
    clearTimeout(timeout);
  }
}

export async function performCheck(monitorId: string, url: string, method = 'HEAD'): Promise<void> {
  const start = Date.now();
  let status: 'up' | 'down' | 'error' = 'error';
  let statusCode: number | null = null;
  let responseTime: number | null = null;
  let error: string | null = null;
  let updatedMethod = false;

  try {
    const result = await doFetch(url, method, 10_000);
    responseTime = Date.now() - start;
    statusCode = result.status;
    status = result.ok ? 'up' : 'down';

    if (status === 'down' && method === 'HEAD') {
      const fallback = await doFetch(url, 'GET', 10_000);
      responseTime = Date.now() - start;
      statusCode = fallback.status;
      if (fallback.ok) {
        status = 'up';
        updatedMethod = true;
      }
    }
  } catch (err: unknown) {
    responseTime = Date.now() - start;
    error = err instanceof Error ? err.message : 'Unknown error';
    status = 'error';
  }

  const db = getDb();
  const logId = crypto.randomUUID();
  const now = Date.now();

  db.run(
    `INSERT INTO check_logs (id, monitor_id, status, status_code, response_time, error, checked_at)
     VALUES ($id, $monitorId, $status, $statusCode, $responseTime, $error, $checkedAt)`,
    { $id: logId, $monitorId: monitorId, $status: status, $statusCode: statusCode, $responseTime: responseTime, $error: error, $checkedAt: now }
  );

  if (updatedMethod) {
    db.run(`UPDATE monitors SET method = $method WHERE id = $id`, { $method: 'GET', $id: monitorId });
  }

  db.run(
    `UPDATE monitors SET last_status = $status, last_checked_at = $checkedAt, last_status_code = $statusCode, last_response_time = $responseTime WHERE id = $id`,
    { $status: status, $checkedAt: now, $statusCode: statusCode, $responseTime: responseTime, $id: monitorId }
  );
  saveDb();
}

export function addOrUpdatePoller(id: string, url: string, interval: number, method = 'HEAD', runImmediately = true): void {
  const existing = timers.get(id);
  if (existing) clearInterval(existing);

  if (runImmediately) performCheck(id, url, method).catch(console.error);

  const timer = setInterval(() => performCheck(id, url, method).catch(console.error), interval * 1000);
  timers.set(id, timer);
}

export function removePoller(id: string): void {
  const existing = timers.get(id);
  if (existing) clearInterval(existing);
  timers.delete(id);
}

export function startPoller(): void {
  const db = getDb();
  const results = db.exec('SELECT id, url, interval, COALESCE(method, "HEAD") FROM monitors WHERE enabled = 1');
  if (!results.length) return;

  for (const row of results[0].values as [string, string, number, string][]) {
    const [id, url, interval, method] = row;
    addOrUpdatePoller(id, url, interval, method);
  }
}
