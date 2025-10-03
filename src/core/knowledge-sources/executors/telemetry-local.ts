import * as path from 'path';
import fs from 'fs';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const METRICS_FILE = path.join(LOG_DIR, 'metrics.jsonl');
const ERRORS_FILE = path.join(LOG_DIR, 'error-entities.jsonl');

function ensureDir() { try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch { } }

export async function recordLatency(name: string, ms: number, tags?: Record<string, any>) {
  try {
    ensureDir();
    const payload = { timestamp: new Date().toISOString(), name, value: ms, tags: tags || {} };
    fs.appendFileSync(METRICS_FILE, JSON.stringify(payload) + '\n', { encoding: 'utf8' });
  } catch { /* swallow */ }
}

export async function incrementCounter(name: string, tags?: Record<string, any>) {
  try { ensureDir(); fs.appendFileSync(METRICS_FILE, JSON.stringify({ timestamp: new Date().toISOString(), name, value: 1, tags: tags || {} }) + '\n', { encoding: 'utf8' }); } catch { }
}

export async function logError(entry: any) {
  try {
    ensureDir();
    const payload = {
      timestamp: entry.timestamp || new Date().toISOString(),
      sourceId: entry.sourceId,
      sourceName: entry.sourceName,
      operation: entry.operation,
      attempt: entry.attempt,
      notes: entry.notes,
      error: entry.error,
      extra: entry.extra || {}
    };
    fs.appendFileSync(ERRORS_FILE, JSON.stringify(payload) + '\n', { encoding: 'utf8' });
  } catch { /* swallow */ }
}

export default { recordLatency, incrementCounter, logError };
