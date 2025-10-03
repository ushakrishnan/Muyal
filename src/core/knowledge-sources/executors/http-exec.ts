import fetch from 'node-fetch';
import { KnowledgeDescriptorT } from '../schema';
import { ExecutionResult, Executor } from '../types';
import fs from 'fs';
import path from 'path';
import observability from '../../observability';

// Simple in-memory TTL cache
const memoryCache: Map<string, { expiresAt: number; result: ExecutionResult }> = new Map();

function nowMs() { return Date.now(); }

async function readFallbackCache(id: string): Promise<ExecutionResult | null> {
  try {
    const file = path.join(process.cwd(), 'data', 'knowledge-cache', `${id}.json`);
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, 'utf8');
    const js = JSON.parse(raw);
    return js as ExecutionResult;
  } catch {
    return null;
  }
}

async function writeFallbackCache(id: string, res: ExecutionResult) {
  try {
    const dir = path.join(process.cwd(), 'data', 'knowledge-cache');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${id}.json`);
    fs.writeFileSync(file, JSON.stringify(res, null, 2), 'utf8');
  } catch (e) {
    console.warn('Failed to persist knowledge cache for', id, e instanceof Error ? e.message : e);
  }
}

export const httpExecutor: Executor = async (desc: KnowledgeDescriptorT) => {
  const cfg = desc.http;
  if (!cfg) return { text: '', metadata: { id: desc.id } };

  const id = desc.id;
  // Check memory cache
  const ttl = (cfg.cacheTtlSeconds && Number(cfg.cacheTtlSeconds)) || 0;
  if (ttl > 0) {
    const cached = memoryCache.get(id);
    if (cached && cached.expiresAt > nowMs()) {
  // record cache hit
  observability.incrementCounter('executor.fetch.cacheHit', { provider: 'http', id }).catch(() => {});
      return cached.result;
    }
  }

  const endpoint = cfg.endpoint;
  const method = (cfg.method ?? 'GET') as string;

  // Resolve secret (if any)
  let authHeader: string | undefined;
  if (cfg.secretEnvName) {
    const secret = process.env[cfg.secretEnvName];
    if (secret) authHeader = `Bearer ${secret}`;
  }

  const headers: Record<string, string> = { 'accept': 'application/json' };
  if (authHeader) headers['authorization'] = authHeader;

  let body: string | undefined;
  if (method === 'POST' && cfg.requestBodyTemplate) {
    body = cfg.requestBodyTemplate.replace('{{id}}', id);
    headers['content-type'] = 'application/json';
  }

  // Retry/backoff
  const maxAttempts = 3;
  let attempt = 0;
  let lastErr: any = null;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      const fetchStart = Date.now();
      const res = await fetch(endpoint, { method, headers, body, timeout: 10000 } as any);
      const text = await res.text();
      const latencyMs = Date.now() - fetchStart;
  observability.recordLatency('executor.fetch.latency', latencyMs, { provider: 'http', id }).catch(() => {});

      // Try parse JSON
      try {
        const js = JSON.parse(text);
        const result: ExecutionResult = { text: js.text ?? (typeof js === 'string' ? js : JSON.stringify(js)), suggestions: js.suggestions, metadata: { id, raw: js, status: res.status } };
        // persist fallback
        await writeFallbackCache(id, result);
        if (ttl > 0) memoryCache.set(id, { expiresAt: nowMs() + ttl * 1000, result });
        return result;
      } catch (e) {
        const result: ExecutionResult = { text, metadata: { id, status: res.status } };
        await writeFallbackCache(id, result);
        if (ttl > 0) memoryCache.set(id, { expiresAt: nowMs() + ttl * 1000, result });
        return result;
      }
    } catch (err) {
      lastErr = err;
      // backoff with jitter
      const backoff = Math.pow(2, attempt) * 100 + Math.floor(Math.random() * 100);
      await new Promise(r => setTimeout(r, backoff));
      // Log transient error to Cosmos if configured
      try {
        const client = desc.metadata?.cosmosClient;
        const dbName = desc.metadata?.cosmosDb || process.env.COSMOS_DB || process.env.COSMOS_DB_DATABASE || 'muyal';
        // centralized telemetry: increment failure counter and log error (local + cosmos if available)
                  observability.incrementCounter('executor.fetch.failureCount', { provider: 'http', id, attempt }).catch(() => {});
        await observability.logError({ timestamp: new Date().toISOString(), sourceId: desc.id, sourceName: desc.name, operation: 'http-exec', error: String(err), attempt, extra: { endpoint, method } }, desc.metadata?.cosmosClient, desc.metadata?.cosmosDb).catch(() => {});
      } catch {
        // swallow
      }
    }
  }

  // All attempts failed — try persisted fallback
  const fallback = await readFallbackCache(id);
  if (fallback) return fallback;

  // Final failure
  if (lastErr) throw lastErr;
  throw new Error('httpExecutor failed');
};
