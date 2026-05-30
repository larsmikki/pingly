import { Router } from 'express';
import { getDb, saveDb } from '../db/connection.js';
import { addOrUpdatePoller, removePoller, performCheck } from '../poller.js';
import { fetchAndSaveFavicon, deleteFavicon } from '../favicon.js';

const router = Router();

function rowToMonitor(row: unknown[]) {
  return {
    id: row[0],
    name: row[1],
    url: row[2],
    interval: row[3],
    enabled: Boolean(row[4]),
    createdAt: row[5],
    lastStatus: row[6] ?? null,
    lastCheckedAt: row[7] ?? null,
    lastStatusCode: row[8] ?? null,
    lastResponseTime: row[9] ?? null,
    favicon: row[10] ?? '',
    method: row[11] ?? 'HEAD',
  };
}

router.get('/', (req, res) => {
  const db = getDb();
  const results = db.exec(
    'SELECT id, name, url, interval, enabled, created_at, last_status, last_checked_at, last_status_code, last_response_time, COALESCE(favicon, \'\'), COALESCE(method, \'HEAD\') FROM monitors ORDER BY created_at DESC'
  );
  if (!results.length) { res.json([]); return; }
  const host = `${req.protocol}://${req.get('host')}`;
  res.json(results[0].values.map((row: unknown[]) => {
    const monitor = rowToMonitor(row);
    if (monitor.favicon && typeof monitor.favicon === 'string' && !monitor.favicon.startsWith('http')) {
      monitor.favicon = `${host}${monitor.favicon}`;
    }
    return monitor as any;
  }));
});

router.post('/', async (req, res) => {
  const db = getDb();
  const { name, url, interval, method } = req.body as { name: string; url: string; interval: number; method?: string };
  const id = crypto.randomUUID();
  const now = Date.now();
  const checkMethod = method === 'GET' ? 'GET' : 'HEAD';

  const favicon = await fetchAndSaveFavicon(url, id);

  db.run(
    'INSERT INTO monitors (id, name, url, interval, enabled, created_at, favicon, method) VALUES ($id, $name, $url, $interval, 1, $createdAt, $favicon, $method)',
    { $id: id, $name: name, $url: url, $interval: interval ?? 300, $createdAt: now, $favicon: favicon ?? '', $method: checkMethod }
  );
  saveDb();

  addOrUpdatePoller(id, url, interval ?? 300, checkMethod);

  const host = `${req.protocol}://${req.get('host')}`;
  const fullFavicon = favicon ? `${host}${favicon}` : '';

  res.status(201).json({ id, name, url, interval: interval ?? 300, enabled: true, createdAt: now, lastStatus: null, lastCheckedAt: null, lastStatusCode: null, lastResponseTime: null, favicon: fullFavicon as any });
});

router.put('/bulk-interval', (req, res) => {
  const db = getDb();
  const intervalRaw = req.body?.interval;
  const intervalNum = intervalRaw ? parseInt(intervalRaw, 10) : 0;
  
  if (!intervalNum || intervalNum < 60 || isNaN(intervalNum)) { 
    res.status(400).json({ error: 'Invalid interval' }); 
    return; 
  }

  db.run(`UPDATE monitors SET interval = ${intervalNum}`);
  saveDb();

  const enabledResults = db.exec('SELECT id, url, interval FROM monitors WHERE enabled = 1');
  if (enabledResults.length && enabledResults[0].values) {
    for (const row of enabledResults[0].values) {
      const id = String(row[0]);
      const url = String(row[1]);
      const int = Number(row[2]);
      addOrUpdatePoller(id, url, int, 'HEAD', false);
    }
  }

  res.json({ updated: true });
});

router.post('/clean-logs', (req, res) => {
  const db = getDb();
  const { days } = req.body as { days: number };
  if (!days || days < 1) { res.status(400).json({ error: 'Invalid days' }); return; }

  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  db.run('DELETE FROM check_logs WHERE checked_at < $cutoff', { $cutoff: cutoff });
  const result = db.exec('SELECT changes()');
  saveDb();
  res.json({ deleted: result[0]?.values[0]?.[0] as number || 0 });
});

router.put('/:id', async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { name, url, interval, enabled, method } = req.body as { name: string; url: string; interval: number; enabled: boolean; method?: string };
  const checkMethod = method === 'GET' ? 'GET' : 'HEAD';

  const favicon = await fetchAndSaveFavicon(url, id);

  db.run(
    'UPDATE monitors SET name = $name, url = $url, interval = $interval, enabled = $enabled, favicon = $favicon, method = $method WHERE id = $id',
    { $id: id, $name: name, $url: url, $interval: interval, $enabled: enabled ? 1 : 0, $favicon: favicon ?? '', $method: checkMethod }
  );
  saveDb();

  if (enabled) {
    addOrUpdatePoller(id, url, interval, checkMethod, false);
  } else {
    removePoller(id);
  }

  const rows = db.exec(
    'SELECT id, name, url, interval, enabled, created_at, last_status, last_checked_at, last_status_code, last_response_time, COALESCE(favicon, \'\') FROM monitors WHERE id = $id',
    { $id: id }
  );
  const monitor = rows.length && rows[0].values.length ? rowToMonitor(rows[0].values[0]) : { id: id };
  const m = monitor as any;
  if (m.favicon && typeof m.favicon === 'string' && !m.favicon.startsWith('http')) {
    m.favicon = `${req.protocol}://${req.get('host')}${m.favicon}`;
  }
  res.json(m);
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  removePoller(id);
  deleteFavicon(id);
  db.run('DELETE FROM check_logs WHERE monitor_id = $id', { $id: id });
  db.run('DELETE FROM monitors WHERE id = $id', { $id: id });
  saveDb();
  res.status(204).end();
});

router.post('/import', async (req, res) => {
  const db = getDb();
  const monitors = req.body as { name: string; url: string; interval: number; enabled: boolean; method?: string }[];
  if (!Array.isArray(monitors)) { res.status(400).json({ error: 'Expected array' }); return; }

  const now = Date.now();
  for (const m of monitors) {
    const id = crypto.randomUUID();
    const checkMethod = m.method === 'GET' ? 'GET' : 'HEAD';
    const favicon = await fetchAndSaveFavicon(m.url, id);
    db.run(
      'INSERT INTO monitors (id, name, url, interval, enabled, created_at, favicon, method) VALUES ($id, $name, $url, $interval, $enabled, $createdAt, $favicon, $method)',
      { $id: id, $name: m.name, $url: m.url, $interval: m.interval ?? 300, $enabled: m.enabled ? 1 : 0, $createdAt: now, $favicon: favicon ?? '', $method: checkMethod }
    );
    if (m.enabled !== false) addOrUpdatePoller(id, m.url, m.interval ?? 300, checkMethod);
  }
  saveDb();
  res.json({ imported: monitors.length });
});

router.get('/:id/logs', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const limit = Math.min(parseInt(req.query['limit'] as string, 10) || 20, 100);
  const offset = parseInt(req.query['offset'] as string, 10) || 0;
  
  const results = db.exec(
    'SELECT id, monitor_id, status, status_code, response_time, error, checked_at FROM check_logs WHERE monitor_id = $id ORDER BY checked_at DESC LIMIT $limit OFFSET $offset',
    { $id: id, $limit: limit, $offset: offset }
  );
  if (!results.length) { res.json([]); return; }
  res.json(results[0].values.map((row: unknown[]) => ({
    id: row[0],
    monitorId: row[1],
    status: row[2],
    statusCode: row[3] ?? null,
    responseTime: row[4] ?? null,
    error: row[5] ?? null,
    checkedAt: row[6],
  })));
});

router.get('/down-events', (req, res) => {
  const db = getDb();
  const since = Date.now() - (24 * 60 * 60 * 1000);
  
  const results = db.exec(
    `SELECT cl.id, cl.monitor_id, cl.status, cl.status_code, cl.response_time, cl.error, cl.checked_at, m.name, m.url 
     FROM check_logs cl 
     JOIN monitors m ON cl.monitor_id = m.id 
     WHERE cl.status IN ('down', 'error') AND cl.checked_at >= $since AND (cl.seen = 0 OR cl.seen IS NULL)
     ORDER BY cl.checked_at DESC`,
    { $since: since }
  );
  if (!results.length) { res.json([]); return; }
  res.json(results[0].values.map((row: unknown[]) => ({
    id: row[0],
    monitorId: row[1],
    status: row[2],
    statusCode: row[3] ?? null,
    responseTime: row[4] ?? null,
    error: row[5] ?? null,
    checkedAt: row[6],
    monitorName: row[7],
    monitorUrl: row[8],
  })));
});

router.post('/dismiss-event/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  db.run('UPDATE check_logs SET seen = 1 WHERE id = $id', { $id: id });
  saveDb();
  res.json({ dismissed: true });
});

router.post('/dismiss-all-events', (req, res) => {
  const db = getDb();
  const since = Date.now() - (24 * 60 * 60 * 1000);
  db.run(
    'UPDATE check_logs SET seen = 1 WHERE status IN (\'down\', \'error\') AND checked_at >= $since',
    { $since: since }
  );
  saveDb();
  res.json({ dismissed: true });
});

router.post('/:id/check', async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const rows = db.exec(
    'SELECT id, url, interval, COALESCE(method, \'HEAD\') FROM monitors WHERE id = $id',
    { $id: id }
  );
  if (!rows.length || !rows[0].values.length) {
    res.status(404).json({ error: 'Monitor not found' });
    return;
  }
  const [, url, interval, methodRow] = rows[0].values[0] as [string, string, number, string | null];
  const checkMethod = methodRow === 'GET' ? 'GET' : 'HEAD';

  await performCheck(id, url, checkMethod);

  const favicon = await fetchAndSaveFavicon(url, id);
  db.run('UPDATE monitors SET favicon = $favicon WHERE id = $id', { $favicon: favicon ?? '', $id: id });
  saveDb();

  addOrUpdatePoller(id, url, interval, checkMethod, false);

  const updated = db.exec(
    'SELECT id, name, url, interval, enabled, created_at, last_status, last_checked_at, last_status_code, last_response_time, COALESCE(favicon, \'\') FROM monitors WHERE id = $id',
    { $id: id }
  );
  const monitor = updated.length && updated[0].values.length ? rowToMonitor(updated[0].values[0]) : { id: id };
  const m = monitor as any;
  if (m.favicon && typeof m.favicon === 'string' && !m.favicon.startsWith('http')) {
    m.favicon = `${req.protocol}://${req.get('host')}${m.favicon}`;
  }
  res.json(m);
});

export default router;
