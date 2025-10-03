import path = require('path');
import fs = require('fs');
import { logErrorToCosmos, logMetricToCosmos } from '../knowledge-sources/executors/error-logger';

const ERROR_LOG_DIR = path.resolve(__dirname, '..', '..', 'logs');
const ERROR_LOG_FILE = path.join(ERROR_LOG_DIR, 'error-entities.jsonl');

function writeLocalError(entry: any) {
  try {
    try { fs.mkdirSync(ERROR_LOG_DIR, { recursive: true }); } catch { /* best-effort */ }
    let errorSerialized: any = undefined;
    if (entry.error) {
      try { errorSerialized = JSON.parse(JSON.stringify(entry.error, Object.getOwnPropertyNames(entry.error))); } catch { try { errorSerialized = String(entry.error); } catch { errorSerialized = 'unserializable'; } }
    }
    const payload = {
      timestamp: entry.timestamp || new Date().toISOString(),
      sourceId: entry.sourceId,
      sourceName: entry.sourceName,
      operation: entry.operation,
      attempt: entry.attempt,
      notes: entry.notes,
      error: entry.error ? (typeof entry.error === 'string' ? entry.error : errorSerialized) : undefined,
      extra: entry.extra || {}
    };
    try { fs.appendFileSync(ERROR_LOG_FILE, JSON.stringify(payload) + '\n', { encoding: 'utf8' }); } catch { /* swallow */ }
  } catch (e) {
    // swallow
  }
}

function safeSerialize(obj: any) {
  try { return JSON.parse(JSON.stringify(obj, Object.getOwnPropertyNames(obj))); } catch { try { return String(obj); } catch { return 'unserializable'; } }
}

const METRICS_DIR = path.resolve(__dirname, '..', '..', 'logs');
const METRICS_FILE = path.join(METRICS_DIR, 'metrics.jsonl');

function ensureDir() {
  try { fs.mkdirSync(METRICS_DIR, { recursive: true }); } catch { /* best-effort */ }
}

export async function recordMetric(name: string, value: number | Record<string, any>, tags?: Record<string, any>, cosmosClient?: any, dbName?: string) {
  try {
    ensureDir();
    const payload = { timestamp: new Date().toISOString(), name, value, tags: tags || {} };
    try { fs.appendFileSync(METRICS_FILE, JSON.stringify(payload) + '\n', { encoding: 'utf8' }); } catch { /* swallow */ }
  } catch (e) {
    // best-effort
    // eslint-disable-next-line no-console
    console.warn('Failed to write metric', e);
  }
  try {
    if (cosmosClient) {
      const db = cosmosClient.database(dbName || process.env.COSMOS_DB || process.env.COSMOS_DB_DATABASE || 'muyal');
      await logMetricToCosmos(cosmosClient, db.id || (dbName as string) || (process.env.COSMOS_DB_DATABASE as string) || 'muyal', {
        id: `metric-${name}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        timestamp: new Date().toISOString(),
        name,
        value,
        tags: tags || {}
      });
    }
  } catch { /* swallow */ }
}

export async function incrementCounter(name: string, tags?: Record<string, any>, cosmosClient?: any, dbName?: string) {
  await recordMetric(name, 1, tags, cosmosClient, dbName);
}

export async function recordLatency(name: string, ms: number, tags?: Record<string, any>, cosmosClient?: any, dbName?: string) {
  await recordMetric(name, ms, tags, cosmosClient, dbName);
}

export async function logError(entry: any, cosmosClient?: any, dbName?: string) {
  try {
    // Write to local file first
    await writeLocalError(entry);
  } catch {
    // swallow
  }

  try {
    // Try to write to Cosmos errors container if client provided
    if (cosmosClient) {
      const db = cosmosClient.database(dbName || process.env.COSMOS_DB_DATABASE || process.env.COSMOS_DB || 'muyal');
      await logErrorToCosmos(cosmosClient, db.id || (dbName as string) || (process.env.COSMOS_DB_DATABASE as string) || 'muyal', {
        id: entry.sourceId ? `error-${entry.sourceId}-${Date.now()}` : `error-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        timestamp: entry.timestamp || new Date().toISOString(),
        sourceId: entry.sourceId,
        sourceName: entry.sourceName,
        operation: entry.operation,
        error: entry.error,
        notes: entry.notes,
        attempt: entry.attempt || 0,
        extra: entry.extra || {}
      });
    }
  } catch (e) {
    // best-effort
    // eslint-disable-next-line no-console
    console.warn('Failed to log error to cosmos in telemetry', e instanceof Error ? e.message : e);
  }
}

export default { recordMetric, incrementCounter, recordLatency, logError };
