import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import request from 'supertest';
// @ts-ignore
import initSqlJs, { Database } from 'sql.js';
import { createApp } from '../app.js';

// vitest allows variables prefixed with "mock" to be referenced inside vi.mock() factories
let mockDb: Database;

vi.mock('../db/connection.js', () => ({
  getDb: () => mockDb,
  saveDb: vi.fn(),
  initDb: vi.fn(),
}));

vi.mock('../poller.js', () => ({
  addOrUpdatePoller: vi.fn(),
  removePoller: vi.fn(),
  performCheck: vi.fn().mockResolvedValue(undefined),
}));

const schema = `
  CREATE TABLE IF NOT EXISTS monitors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    interval INTEGER NOT NULL DEFAULT 300,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    last_status TEXT,
    last_checked_at INTEGER,
    last_status_code INTEGER,
    last_response_time INTEGER,
    favicon TEXT,
    method TEXT DEFAULT 'HEAD'
  );
  CREATE TABLE IF NOT EXISTS check_logs (
    id TEXT PRIMARY KEY,
    monitor_id TEXT NOT NULL,
    status TEXT NOT NULL,
    status_code INTEGER,
    response_time INTEGER,
    error TEXT,
    checked_at INTEGER NOT NULL
  );
`;

const app = createApp();

beforeAll(async () => {
  const SQL = await initSqlJs();
  mockDb = new SQL.Database();
  mockDb.run(schema);
});

afterEach(() => {
  mockDb.run('DELETE FROM check_logs');
  mockDb.run('DELETE FROM monitors');
});

function insertMonitor(id: string, overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  mockDb.run(
    'INSERT INTO monitors (id, name, url, interval, enabled, created_at) VALUES ($id, $name, $url, $interval, $enabled, $createdAt)',
    {
      $id: id,
      $name: overrides.name ?? 'Test Monitor',
      $url: overrides.url ?? 'https://example.com',
      $interval: overrides.interval ?? 60,
      $enabled: overrides.enabled ?? 1,
      $createdAt: overrides.createdAt ?? now,
    }
  );
}

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('GET /api/monitors', () => {
  it('returns empty array when no monitors', async () => {
    const res = await request(app).get('/api/monitors');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns existing monitors', async () => {
    insertMonitor('id-1', { name: 'My Site', url: 'https://my.com' });
    const res = await request(app).get('/api/monitors');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 'id-1', name: 'My Site', url: 'https://my.com', enabled: true });
  });
});

describe('POST /api/monitors', () => {
  it('creates a monitor and returns 201', async () => {
    const res = await request(app)
      .post('/api/monitors')
      .send({ name: 'New Site', url: 'https://new.com', interval: 120 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'New Site', url: 'https://new.com', interval: 120, enabled: true });
    expect(res.body.id).toBeDefined();
    expect(res.body.lastStatus).toBeNull();
  });

  it('defaults interval to 300 when omitted', async () => {
    const res = await request(app)
      .post('/api/monitors')
      .send({ name: 'Site', url: 'https://site.com' });
    expect(res.status).toBe(201);
    expect(res.body.interval).toBe(300);
  });
});

describe('PUT /api/monitors/:id', () => {
  it('updates an existing monitor', async () => {
    insertMonitor('id-2', { name: 'Old', url: 'https://old.com', interval: 60 });
    const res = await request(app)
      .put('/api/monitors/id-2')
      .send({ name: 'New', url: 'https://new.com', interval: 180, enabled: true });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'id-2', name: 'New', url: 'https://new.com', interval: 180 });
  });

  it('disabling a monitor removes the poller', async () => {
    const { removePoller } = await import('../poller.js');
    insertMonitor('id-3');
    await request(app)
      .put('/api/monitors/id-3')
      .send({ name: 'Test', url: 'https://example.com', interval: 60, enabled: false });
    expect(removePoller).toHaveBeenCalledWith('id-3');
  });
});

describe('DELETE /api/monitors/:id', () => {
  it('deletes a monitor and returns 204', async () => {
    insertMonitor('id-4');
    const res = await request(app).delete('/api/monitors/id-4');
    expect(res.status).toBe(204);

    const list = await request(app).get('/api/monitors');
    expect(list.body).toHaveLength(0);
  });
});

describe('POST /api/monitors/import', () => {
  it('imports an array of monitors', async () => {
    const res = await request(app)
      .post('/api/monitors/import')
      .send([
        { name: 'A', url: 'https://a.com', interval: 60, enabled: true },
        { name: 'B', url: 'https://b.com', interval: 120, enabled: false },
      ]);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ imported: 2 });

    const list = await request(app).get('/api/monitors');
    expect(list.body).toHaveLength(2);
  });

  it('returns 400 for a non-array body', async () => {
    const res = await request(app)
      .post('/api/monitors/import')
      .send({ name: 'A' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Expected array' });
  });
});

describe('GET /api/monitors/:id/logs', () => {
  it('returns empty array when no logs exist', async () => {
    insertMonitor('id-5');
    const res = await request(app).get('/api/monitors/id-5/logs');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns check logs for a monitor', async () => {
    const now = Date.now();
    insertMonitor('id-6');
    mockDb.run(
      'INSERT INTO check_logs (id, monitor_id, status, status_code, response_time, error, checked_at) VALUES ($id, $monId, $status, $code, $rt, $err, $at)',
      { $id: 'log-1', $monId: 'id-6', $status: 'up', $code: 200, $rt: 123, $err: null, $at: now }
    );
    const res = await request(app).get('/api/monitors/id-6/logs');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ monitorId: 'id-6', status: 'up', statusCode: 200, responseTime: 123 });
  });
});

describe('POST /api/monitors/:id/check', () => {
  it('returns 404 for an unknown monitor', async () => {
    const res = await request(app).post('/api/monitors/nonexistent/check');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Monitor not found' });
  });

  it('triggers a check and returns the updated monitor', async () => {
    const { performCheck } = await import('../poller.js');
    insertMonitor('id-7');
    const res = await request(app).post('/api/monitors/id-7/check');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('id-7');
    expect(performCheck).toHaveBeenCalledWith('id-7', 'https://example.com', 'HEAD');
  });
});

describe('PUT /api/monitors/bulk-interval', () => {
  it('updates all monitor intervals', async () => {
    insertMonitor('bulk-1', { interval: 60 });
    insertMonitor('bulk-2', { interval: 300 });
    insertMonitor('bulk-3', { interval: 900 });

    const res = await request(app)
      .put('/api/monitors/bulk-interval')
      .send({ interval: 1800 })
      .timeout(10000);

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(true);

    const list = await request(app).get('/api/monitors');
    expect(list.status).toBe(200);
    expect(list.body.length).toBe(3);
    expect(list.body[0].interval).toBe(1800);
    expect(list.body[1].interval).toBe(1800);
    expect(list.body[2].interval).toBe(1800);
  });

  it('returns 400 for invalid interval', async () => {
    const res = await request(app)
      .put('/api/monitors/bulk-interval')
      .send({ interval: 30 })
      .timeout(10000);
    expect(res.status).toBe(400);
  });
});
