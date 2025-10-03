import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { KnowledgeDescriptor, KnowledgeDescriptorT } from '../core/knowledge-sources/schema';

dotenv.config();

type Flags = {
  create?: boolean;
  dryRun?: boolean;
  force?: boolean;
  container?: string;
  db?: string;
};

function parseFlags(argv: string[]): Flags {
  const flags: Flags = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--create') flags.create = true;
    else if (a === '--dry-run') flags.dryRun = true;
    else if (a === '--force') flags.force = true;
    else if (a === '--container' && argv[i + 1]) { flags.container = argv[++i]; }
    else if (a === '--db' && argv[i + 1]) { flags.db = argv[++i]; }
  }
  return flags;
}

function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

function fingerprintDescriptor(desc: KnowledgeDescriptorT): string {
  const s = stableStringify(desc as any);
  return crypto.createHash('sha256').update(s).digest('hex');
}

async function ensureContainerIfNeeded(db: any, name: string, doCreate: boolean) {
  try {
    const { resources } = await db.containers.readAll().fetchAll();
    const exists = resources.some((r: any) => r.id === name);
    if (!exists && doCreate) {
      console.log('Creating container', name, 'with partitionKey /tenantId');
      await db.containers.createIfNotExists({ id: name, partitionKey: { paths: ['/tenantId'] } });
    }
    return exists || doCreate;
  } catch (e) {
    console.warn('Failed to check/create container', name, e instanceof Error ? e.message : e);
    return false;
  }
}

async function main() {
  const flags = parseFlags(process.argv);

  const preferred = path.join(process.cwd(), 'src', 'core', 'knowledge-sources', 'knowledge-data');
  const fallback = path.join(process.cwd(), 'data', 'knowledge');
  let dir = preferred;
  if (!fs.existsSync(dir)) {
    if (fs.existsSync(fallback)) {
      dir = fallback;
      console.warn('Preferred knowledge folder not found; falling back to legacy path:', fallback);
    } else {
      console.error('No knowledge directory found. Looked for:', preferred, 'and', fallback);
      process.exit(2);
    }
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.warn('No JSON descriptors found in', dir);
    process.exit(0);
  }

  const cosmosEndpoint = process.env.COSMOS_ENDPOINT;
  const cosmosKey = process.env.COSMOS_KEY;
  const cosmosDb = flags.db || process.env.COSMOS_DB || process.env.COSMOS_DB_DATABASE || 'muyal';
  const containerName = flags.container || process.env.COSMOS_KS_CONTAINER || 'knowledge';

  let client: any = null;
  if (cosmosEndpoint && cosmosKey) {
    try {
      const { CosmosClient } = require('@azure/cosmos');
      client = new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey });
    } catch (e) {
      console.warn('Failed to initialize Cosmos client', e instanceof Error ? e.message : e);
    }
  }

  let summary = { validated: 0, skipped: 0, upserted: 0, failed: 0 };

  if (client) {
    const db = client.database(cosmosDb);
    const ok = await ensureContainerIfNeeded(db, containerName, !!flags.create);
    if (!ok) {
      console.warn('Container', containerName, 'not available and --create not set or failed. Aborting DB writes.');
    }
  }

  for (const f of files) {
    const full = path.join(dir, f);
    try {
      const raw = fs.readFileSync(full, 'utf8');
      const js = JSON.parse(raw);
      const parsed = KnowledgeDescriptor.parse(js);
      summary.validated += 1;

      const fingerprint = fingerprintDescriptor(parsed as any);

      const tenantId = parsed.metadata?.tenantId || process.env.TENANT_ID || 'dev';

      const doc: any = {
        id: parsed.id,
        tenantId,
        name: parsed.name || parsed.id,
        descriptor: parsed,
        enabled: parsed.enabled ?? true,
        version: parsed.version || '1.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        descriptorFingerprint: fingerprint,
        metadata: {
          sourceFile: path.relative(process.cwd(), full),
          registeredFrom: 'repo',
          registeredBy: process.env.USER || process.env.USERNAME || 'register-script'
        }
      };

      if (!client) {
        console.log('[dry] Valid descriptor:', parsed.id);
        continue;
      }

      try {
        const db = client.database(cosmosDb);
        const container = db.container(containerName);

        // try to read existing item by id + partition (tenantId)
        let existing: any = null;
        try {
          const r = await container.item(parsed.id, tenantId).read();
          existing = r?.resource;
        } catch {
          existing = null;
        }

        if (existing && !flags.force) {
          if (existing.descriptorFingerprint && existing.descriptorFingerprint === fingerprint) {
            console.log('Skipping (unchanged):', parsed.id);
            summary.skipped += 1;
            continue;
          }
        }

        if (flags.dryRun) {
          console.log('[dry-run] Would upsert:', parsed.id, existing ? '(update)' : '(create)');
          summary.upserted += 1;
          continue;
        }

        // ensure identity tenant exists on descriptor
        doc.descriptor.metadata = doc.descriptor.metadata || {};
        doc.descriptor.metadata.tenantId = doc.descriptor.metadata.tenantId || tenantId;

        await container.items.upsert(doc);
        console.log('Upserted descriptor into Cosmos:', parsed.id);
        summary.upserted += 1;
      } catch (e) {
        console.warn('Failed to upsert to Cosmos for', parsed.id, e instanceof Error ? e.message : e);
        summary.failed += 1;
      }
    } catch (errUnknown) {
      const e = errUnknown as Error;
      console.warn('Failed to load or validate descriptor', full, e.message ?? String(e));
      summary.failed += 1;
    }
  }

  console.log('Summary:', summary);
  if (summary.failed > 0) process.exit(3);
  process.exit(0);
}

if (require.main === module) main();
