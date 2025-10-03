import telemetryLocal from '../knowledge-sources/executors/telemetry-local';
import { logErrorToCosmos, logMetricToCosmos } from '../knowledge-sources/executors/error-logger';

export async function recordLatency(name: string, ms: number, tags?: Record<string, any>, cosmosClient?: any, dbName?: string) {
  try { await telemetryLocal.recordLatency(name, ms, tags); } catch { }
  try { await recordMetricToDb(`${name}.latency`, ms, tags, cosmosClient, dbName); } catch { }
}

export async function recordMetric(name: string, value: number | Record<string, any>, tags?: Record<string, any>, cosmosClient?: any, dbName?: string) {
  try {
    if ((telemetryLocal as any).recordMetric) await (telemetryLocal as any).recordMetric(name, value, tags);
    else if (typeof value === 'number') await telemetryLocal.recordLatency(name, Number(value), tags);
  } catch { }
  try { await recordMetricToDb(name, value, tags, cosmosClient, dbName); } catch { }
}

export async function incrementCounter(name: string, tags?: Record<string, any>, cosmosClient?: any, dbName?: string) {
  try { await telemetryLocal.incrementCounter(name, tags); } catch { }
  try { await recordMetricToDb(`${name}.count`, 1, tags, cosmosClient, dbName); } catch { }
}

export async function logError(entry: any, cosmosClient?: any, dbName?: string) {
  try {
    // write local copy first
    await telemetryLocal.logError(entry).catch(() => {});
  } catch { }

  if (cosmosClient) {
    try {
      const db = cosmosClient.database(dbName || process.env.COSMOS_DB || process.env.COSMOS_DB_DATABASE || 'muyal');
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
    } catch { /* swallow */ }
  }
}

export async function recordMetricToDb(name: string, value: number | Record<string, any>, tags?: Record<string, any>, cosmosClient?: any, dbName?: string) {
  try {
    if (!cosmosClient) return;
    const db = cosmosClient.database(dbName || process.env.COSMOS_DB || process.env.COSMOS_DB_DATABASE || 'muyal');
    await logMetricToCosmos(cosmosClient, db.id || (dbName as string) || (process.env.COSMOS_DB_DATABASE as string) || 'muyal', {
      id: `metric-${name}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      name,
      value,
      tags: tags || {}
    });
  } catch { /* swallow */ }
}

export default { recordMetric, recordLatency, incrementCounter, logError };
