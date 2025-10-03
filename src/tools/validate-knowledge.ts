import fs from 'fs';
import path from 'path';
import { KnowledgeDescriptor } from '../core/knowledge-sources/schema';

async function main() {
  // Allow optional folder arg: `node ./src/tools/validate-knowledge.ts <folder>`
  const argDir = process.argv[2];
  const preferred = path.join(process.cwd(), 'src', 'core', 'knowledge-sources', 'knowledge-data');
  const fallback = path.join(process.cwd(), 'data', 'knowledge');

  let dir = argDir ? path.resolve(argDir) : preferred;
  if (!fs.existsSync(dir)) {
    if (fs.existsSync(fallback)) {
      dir = fallback;
      console.warn('Preferred knowledge folder not found; falling back to legacy path:', fallback);
    } else {
      console.error('No knowledge directory found. Looked for:', preferred, 'and', fallback);
      process.exit(1);
    }
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.warn('No JSON descriptors found in', dir);
    process.exit(0);
  }

  let failed = false;
  for (const f of files) {
    const full = path.join(dir, f);
    try {
      const raw = fs.readFileSync(full, 'utf8');
      const js = JSON.parse(raw);
      KnowledgeDescriptor.parse(js);
      console.log('✅ OK:', f);
    } catch (errUnknown) {
      const e = errUnknown as Error;
      console.error('❌ INVALID:', f, '-', e.message);
      failed = true;
    }
  }

  if (failed) process.exit(2);
  process.exit(0);
}

if (require.main === module) main();
