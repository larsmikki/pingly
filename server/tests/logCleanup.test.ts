import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error sql.js has no bundled types
import initSqlJs, { Database } from 'sql.js';
import { cleanupLogs, startLogCleanup } from '../src/logCleanup.js';

const mocks = vi.hoisted(() => ({
  db: undefined as Database | undefined,
  saveDb: vi.fn(),
}));

vi.mock('../src/db/connection.js', () => ({
  getDb: () => mocks.db,
  saveDb: mocks.saveDb,
}));

const DAY_MS = 24 * 60 * 60 * 1000;

beforeAll(async () => {
  const SQL = await initSqlJs();
  mocks.db = new SQL.Database();
  mocks.db.run('CREATE TABLE check_logs (id TEXT PRIMARY KEY, checked_at INTEGER NOT NULL)');
});

beforeEach(() => {
  mocks.db!.run('DELETE FROM check_logs');
  mocks.saveDb.mockClear();
  vi.useRealTimers();
});

describe('log cleanup', () => {
  it('deletes only entries older than the configured retention', () => {
    const now = Date.UTC(2026, 6, 12);
    mocks.db!.run('INSERT INTO check_logs VALUES (?, ?), (?, ?), (?, ?)', [
      'old', now - 8 * DAY_MS,
      'boundary', now - 7 * DAY_MS,
      'recent', now - DAY_MS,
    ]);

    expect(cleanupLogs(7, now)).toBe(1);
    expect(mocks.db!.exec('SELECT id FROM check_logs ORDER BY id')[0].values).toEqual([
      ['boundary'],
      ['recent'],
    ]);
    expect(mocks.saveDb).toHaveBeenCalledOnce();
  });

  it('runs on startup and once per day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T00:00:00Z'));
    mocks.db!.run('INSERT INTO check_logs VALUES (?, ?)', ['old', Date.now() - 8 * DAY_MS]);

    const timer = startLogCleanup(7);
    expect(mocks.db!.exec('SELECT COUNT(*) FROM check_logs')[0].values[0][0]).toBe(0);
    expect(mocks.saveDb).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(DAY_MS);
    expect(mocks.saveDb).toHaveBeenCalledTimes(2);
    clearInterval(timer);
  });
});
