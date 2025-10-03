import fs from 'fs';
import path from 'path';
import { KnowledgeDescriptor, KnowledgeDescriptorT } from './schema';
import { ensureKnowledgeSource } from './ensure-ks';
import { ExecutorContext } from './executor-factory';

export function loadKnowledgeFromDir(dir: string, ctx?: ExecutorContext) {
  const out = [] as ReturnType<typeof ensureKnowledgeSource>[];
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const full = path.join(dir, f);
    try {
      const raw = fs.readFileSync(full, 'utf8');
      const js = JSON.parse(raw);
      const parsed = KnowledgeDescriptor.parse(js as KnowledgeDescriptorT);
      out.push(ensureKnowledgeSource(parsed, ctx));
    } catch (errUnknown) {
      const e = errUnknown as Error;
      console.warn('Failed to load knowledge descriptor', full, e.message ?? String(e));
    }
  }
  return out;
}
