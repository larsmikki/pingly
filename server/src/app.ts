import express from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import monitorsRouter from './routes/monitors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  const isProduction = process.env.NODE_ENV === 'production';

  app.use(compression());
  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/monitors', monitorsRouter);
  app.use('/favicons', express.static(path.join(config.dataDir, 'favicons')));

  if (isProduction) {
    const clientDist = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientDist));
    app.use('/favicons', express.static(path.join(config.dataDir, 'favicons')));
    app.get('/favicon.ico', (_req, res) => {
      res.sendFile(path.join(clientDist, 'favicon.svg'), { headers: { 'Content-Type': 'image/svg+xml' } });
    });
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}
