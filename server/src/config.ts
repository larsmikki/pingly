import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  port: positiveInteger(process.env.PORT, 3041),
  dataDir: process.env.DATA_DIR || path.join(__dirname, '../../data'),
  logRetentionDays: positiveInteger(process.env.LOG_RETENTION_DAYS, 7),
};
