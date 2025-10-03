import 'dotenv/config';
import { CosmosClient } from '@azure/cosmos';
import * as fs from 'fs';
import * as path from 'path';

const skillsJsonPath = path.join(process.cwd(), 'src', 'core', 'knowledge-sources', 'knowledge-data', 'skills.json');
let skillsDesc: any = null;
try {
  const raw = fs.readFileSync(skillsJsonPath, 'utf8');
  skillsDesc = JSON.parse(raw);
} catch (e) {
  // ignore - will fallback to env container
}

async function run() {
  // Prefer the project's canonical env keys (COSMOS_DB_*) defined in .env
  const endpoint = process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_ENDPOINT || process.env.AZURE_COSMOS_ENDPOINT || 'https://localhost:8081';
  const key = process.env.COSMOS_DB_KEY || process.env.COSMOS_KEY || process.env.AZURE_COSMOS_KEY || '';
  const dbName = process.env.COSMOS_DB_DATABASE || process.env.COSMOS_DB || 'muyal';
  // Prefer a dedicated knowledge container env var for knowledge sources and
  // skills. If the skills descriptor explicitly sets a container, honor it;
  // otherwise prefer COSMOS_KS_CONTAINER then the general COSMOS_DB_CONTAINER.
  const descriptorContainer = skillsDesc?.metadata?.container;
  const containerName = descriptorContainer || process.env.COSMOS_KS_CONTAINER || process.env.COSMOS_DB_CONTAINER || process.env.COSMOS_CONTAINER || 'knowledge';

  // Allow local emulator with self-signed certs in dev
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  console.log('Connecting to Cosmos at', endpoint, 'db=', dbName, 'container=', containerName);
  const client = new CosmosClient({ endpoint, key });

  // create database if missing
  const { database } = await client.databases.createIfNotExists({ id: dbName });
  console.log('Using database:', database.id);

  // create container if missing (partitioned by tenantId to match other code)
  const { container } = await database.containers.createIfNotExists({ id: containerName, partitionKey: { paths: ['/tenantId'] } as any });
  console.log('Using container:', container.id);

  const tenantId = process.env.TENANT_ID || 'dev';
  // Look for skill JSON files in the canonical knowledge-data folder (same folder as descriptors).
  // We seed only files whose id starts with 'skill-' or whose filename starts with 'skill-'.
  const knowledgeData = path.join(process.cwd(), 'src', 'core', 'knowledge-sources', 'knowledge-data');
  let toSeed: any[] = [];

  if (fs.existsSync(knowledgeData) && fs.statSync(knowledgeData).isDirectory()) {
    const files = fs.readdirSync(knowledgeData).filter(f => f.endsWith('.json'));
    for (const f of files) {
      const full = path.join(knowledgeData, f);
      const content = fs.readFileSync(full, 'utf-8');
      try {
        const parsed = JSON.parse(content);
        const filenameBase = path.basename(f, '.json');
        // Use parsed.id if it exists and starts with skill-, otherwise use filename starting with skill-
        if ((parsed.id && String(parsed.id).startsWith('skill-')) || filenameBase.startsWith('skill-')) {
          if (!parsed.id) parsed.id = filenameBase;
          toSeed.push(parsed);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('Skipping invalid json in knowledge-data', f, msg);
      }
    }
  }

  if (toSeed.length === 0) {
    console.log('No skill items found to seed in knowledge-data. Create files named skill-*.json in the knowledge-data folder.');
  }

  for (const s of toSeed) {
    const stableId = s.id || `skill-${path.basename(s.name || s.title || Math.random().toString(36).slice(2, 9))}`;
    const doc = { id: stableId, tenantId, ...s };
    // Remove any accidental nested descriptor/partitionKey from previous runs
    delete (doc as any).partitionKey;

    // Check for existing items with the same id in other partitions and remove them
    try {
      const q = {
        query: 'SELECT c.id, c.tenantId FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: stableId }]
      };
  // Query without a partitionKey to run across partitions
  const found = await container.items.query(q).fetchAll();
      if (found && found.resources && found.resources.length > 0) {
        for (const r of found.resources) {
          // If the existing doc is in a different partition (tenantId mismatch), delete it
          const existingTenant = r.tenantId;
          if (existingTenant !== tenantId) {
            try {
              await container.item(r.id, existingTenant === undefined ? undefined : existingTenant).delete();
              console.log('Removed duplicate item', r.id, 'partition', existingTenant);
            } catch (delErr) {
              console.warn('Failed to remove duplicate', r.id, existingTenant, delErr instanceof Error ? delErr.message : String(delErr));
            }
          }
        }
      }
    } catch (qerr) {
      console.warn('Could not query existing items for id', stableId, qerr instanceof Error ? qerr.message : String(qerr));
    }

    const up = await container.items.upsert(doc);
    console.log('Upserted', doc.id, 'statusCode', (up as any).statusCode || (up as any).status || 'unknown');

    try {
  const verify = await container.items.query({ query: 'SELECT c.id, c.tenantId FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: doc.id }] }).fetchAll();
      console.log('Post-upsert count for', doc.id, ':', (verify && verify.resources && verify.resources.length) || 0);
    } catch (verErr) {
      console.warn('Verification query failed for', doc.id, verErr instanceof Error ? verErr.message : String(verErr));
    }
  }

  console.log('Seeding complete');
}

if (require.main === module) run().catch(err => {
  console.error('Seeding failed', err);
  process.exit(1);
});
