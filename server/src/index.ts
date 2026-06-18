import { initDb } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import { createApp } from './app.js';
import { config } from './config.js';
import { startPoller } from './poller.js';

async function main() {
  await initDb();
  runMigrations();
  console.log('Database initialized');

  startPoller();
  console.log('Poller started');

  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Pingr server running on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
