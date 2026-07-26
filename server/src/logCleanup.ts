import { getDb, saveDb } from './db/connection.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function cleanupLogs(retentionDays: number, now = Date.now()): number {
  const db = getDb();
  const cutoff = now - (retentionDays * DAY_MS);

  db.run('DELETE FROM check_logs WHERE checked_at < $cutoff', { $cutoff: cutoff });
  const result = db.exec('SELECT changes()');
  const deleted = Number(result[0]?.values[0]?.[0] ?? 0);
  saveDb();

  return deleted;
}

export function startLogCleanup(retentionDays: number): NodeJS.Timeout {
  const runCleanup = () => {
    try {
      const deleted = cleanupLogs(retentionDays);
      console.log(`Log cleanup completed: deleted ${deleted} entries older than ${retentionDays} days`);
    } catch (error) {
      console.error('Log cleanup failed:', error);
    }
  };

  // Clean up on startup, then repeat every 24 hours.
  runCleanup();
  const timer = setInterval(runCleanup, DAY_MS);
  timer.unref();
  return timer;
}
