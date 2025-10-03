import { promises as fs } from 'fs';
import path from 'path';

export interface ErrorEntityEntry {
  timestamp: string;
  sourceId?: string;
  sourceName?: string;
  operation?: string;
  error?: any;
  notes?: string;
  attempt?: number;
  extra?: Record<string, any>;
}

const LOG_DIR = path.resolve(__dirname, '..', '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'error-entities.jsonl');

async function ensureLogDir() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (e) {
    // best-effort
  }
}

export async function logErrorEntity(entry: ErrorEntityEntry) {
  try {
    await ensureLogDir();
    const payload = {
      timestamp: entry.timestamp || new Date().toISOString(),
      sourceId: entry.sourceId,
      sourceName: entry.sourceName,
      operation: entry.operation,
      attempt: entry.attempt,
      notes: entry.notes,
      error: entry.error ? (typeof entry.error === 'string' ? entry.error : safeSerialize(entry.error)) : undefined,
      extra: entry.extra || {}
    };
    await fs.appendFile(LOG_FILE, JSON.stringify(payload) + '\n', { encoding: 'utf8' });
  } catch (e) {
    // Do not throw from logger; best-effort only
    // eslint-disable-next-line no-console
    console.warn('Failed to log error entity:', e);
  }
}

function safeSerialize(obj: any) {
  try {
    return JSON.parse(JSON.stringify(obj, Object.getOwnPropertyNames(obj)));
  } catch (e) {
    try { return String(obj); } catch { return 'unserializable'; }
  }
}

export default {
  logErrorEntity
};
