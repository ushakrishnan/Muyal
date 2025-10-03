import fs from 'fs';
import path from 'path';
import { ExecutionResult } from '../types';

const memoryCache: Map<string, { expiresAt: number; result: ExecutionResult }> = new Map();

export function nowMs() { return Date.now(); }

export async function readFallbackCache(id: string): Promise<ExecutionResult | null> {
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

export async function writeFallbackCache(id: string, res: ExecutionResult) {
  try {
    const dir = path.join(process.cwd(), 'data', 'knowledge-cache');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${id}.json`);
    fs.writeFileSync(file, JSON.stringify(res, null, 2), 'utf8');
  } catch (e) {
    console.warn('Failed to persist knowledge cache for', id, e instanceof Error ? e.message : e);
  }
}

export { memoryCache };
