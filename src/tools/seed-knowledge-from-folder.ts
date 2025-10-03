import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { CosmosClient } from '@azure/cosmos';
import { KnowledgeDescriptor } from '../core/knowledge-sources/schema';

dotenv.config();

async function ensureContainer(db: any, name: string) {
  try {
    const { resources } = await db.containers.readAll().fetchAll();
    const exists = resources.some((r: any) => r.id === name);
    if (!exists) {
      console.log('Creating container', name);
      await db.containers.createIfNotExists({ id: name, partitionKey: { paths: ['/tenantId'] } });
    }
  } catch (e) {
    console.warn('Failed to ensure container', name, e instanceof Error ? e.message : e);
  }
}

async function main() {
  const preferred = path.join(process.cwd(), 'src', 'core', 'knowledge-sources', 'knowledge-data');
  const fallback = path.join(process.cwd(), 'data', 'knowledge');
  let dir = preferred;
  if (!fs.existsSync(dir)) {
    if (fs.existsSync(fallback)) dir = fallback;
    else {
      console.error('No knowledge directory found');
      process.exit(1);
    }
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('No JSON descriptors to seed in', dir);
    return;
  }

  const endpoint = process.env.COSMOS_ENDPOINT || process.env.COSMOS_DB_ENDPOINT;
  const key = process.env.COSMOS_KEY || process.env.COSMOS_DB_KEY;
  const dbName = process.env.COSMOS_DB || process.env.COSMOS_DB_DATABASE || 'muyal';
  // Prefer a dedicated knowledge container env var to avoid colliding with the
  // general Cosmos DB container used for conversations. Fall back to common
  // env names and finally the literal 'knowledge'.
  const containerName = process.env.COSMOS_KS_CONTAINER || process.env.COSMOS_DB_CONTAINER || process.env.COSMOS_CONTAINER || 'knowledge';
  if (!endpoint || !key) {
    console.error('COSMOS credentials not found in env');
    process.exit(1);
  }

  // Allow local emulator with self-signed certs in dev. This is safe for local
  // development but should NOT be used in production environments.
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED || '0';

  const client = new CosmosClient({ endpoint, key });
  const db = client.database(dbName);
  await ensureContainer(db, containerName);
  const container = db.container(containerName);

  const tenantId = process.env.TENANT_ID || process.env.TENANT || 'dev';

  for (const f of files) {
    const full = path.join(dir, f);
    try {
      const raw = fs.readFileSync(full, 'utf8');
      const js = JSON.parse(raw);
      const parsed = KnowledgeDescriptor.parse(js);

      const item = {
        id: parsed.id,
        tenantId: tenantId,
        descriptor: parsed,
        name: parsed.name || parsed.id,
        identity: {
          source: 'seed-knowledge-from-folder',
          seededAt: new Date().toISOString(),
          seededBy: process.env.USER || process.env.USERNAME || 'local-dev',
          tenantId: tenantId
        }
      };

      // Before upserting, remove any duplicate documents with the same id in other partitions
      try {
        const q = { query: 'SELECT c.id, c.tenantId FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: parsed.id }] };
        const found = await container.items.query(q).fetchAll();
        if (found && found.resources && found.resources.length > 0) {
          for (const r of found.resources) {
            const existingTenant = r.tenantId;
            if (existingTenant !== tenantId) {
              try {
                await container.item(r.id, existingTenant === undefined ? undefined : existingTenant).delete();
                console.log('Removed duplicate descriptor', r.id, 'partition', existingTenant);
              } catch (delErr) {
                console.warn('Failed to remove duplicate descriptor', r.id, existingTenant, delErr instanceof Error ? delErr.message : String(delErr));
              }
            }
          }
        }
      } catch (qerr) {
        console.warn('Could not query existing descriptors for id', parsed.id, qerr instanceof Error ? qerr.message : String(qerr));
      }

      const res = await container.items.upsert(item);
      console.log('Upserted descriptor:', parsed.id, 'status', (res as any).statusCode || (res as any).status || 'unknown');

      // Generate a companion skill document for each descriptor unless the
      // descriptor itself is a skill (id starts with 'skill-'). This creates a
      // single-file approach: descriptors are the single source and their skill
      // docs are generated automatically in Cosmos.
      try {
        // Allow descriptors to opt-out of companion skill generation by setting
        // metadata.generateSkill = false or metadata.noSkill = true
        const meta = parsed.metadata || {};
        if (!String(parsed.id).startsWith('skill-')) {
          if (meta.generateSkill === false || meta.noSkill === true) {
            // If a companion skill exists from prior runs, remove it.
            const skillIdToRemove = `skill-${parsed.id}`;
            try {
              const qrem = { query: 'SELECT c.id, c.tenantId FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: skillIdToRemove }] };
              const found = await container.items.query(qrem).fetchAll();
              if (found && found.resources && found.resources.length > 0) {
                for (const r of found.resources) {
                  try { await container.item(r.id, r.tenantId).delete(); console.log('Removed existing companion skill (opt-out):', r.id); } catch (e) { /* ignore */ }
                }
              }
            } catch (e) {
              console.warn('Failed to cleanup companion skill for opt-out', parsed.id, e instanceof Error ? e.message : String(e));
            }
            // Skip generation
            continue;
          }

          const skillMeta = (parsed as any).metadata && (parsed as any).metadata.skill ? (parsed as any).metadata.skill : {};
          const skillId = (skillMeta && skillMeta.id) || `skill-${parsed.id}`;

          // Generate a concise description when none is provided in metadata
          const rawDesc = parsed.description || ((parsed as any).static && (parsed as any).static.text) || '';
          const shortDesc = String(rawDesc).split('\n')[0].split('. ')[0];
          const genDescription = (skillMeta && skillMeta.description) || (shortDesc ? (shortDesc.length > 120 ? shortDesc.slice(0, 117) + '...' : shortDesc) : 'Provides information');

          // Generate suggestions: prefer metadata, then static/suggestions, then keywords
          const genSuggestions = (skillMeta && skillMeta.suggestions) || (parsed as any).suggestions || ((parsed as any).static && (parsed as any).static.suggestions) || (parsed.keywords ? parsed.keywords.slice(0, 3) : []);

          const skillDoc: any = {
            id: skillId,
            tenantId,
            name: (skillMeta && skillMeta.name) || parsed.name || parsed.id,
            description: genDescription,
            suggestions: genSuggestions
          };

          // remove duplicates across partitions for the skill id
          try {
            const q2 = { query: 'SELECT c.id, c.tenantId FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: skillId }] };
            const foundSkill = await container.items.query(q2).fetchAll();
            if (foundSkill && foundSkill.resources && foundSkill.resources.length > 0) {
              for (const r of foundSkill.resources) {
                const existingTenant = r.tenantId;
                if (existingTenant !== tenantId) {
                  try {
                    await container.item(r.id, existingTenant === undefined ? undefined : existingTenant).delete();
                    console.log('Removed duplicate skill', r.id, 'partition', existingTenant);
                  } catch (delErr) {
                    console.warn('Failed to remove duplicate skill', r.id, existingTenant, delErr instanceof Error ? delErr.message : String(delErr));
                  }
                }
              }
            }
          } catch (qerr) {
            console.warn('Could not query existing skill items for id', skillId, qerr instanceof Error ? qerr.message : String(qerr));
          }

          const upSkill = await container.items.upsert(skillDoc);
          console.log('Upserted companion skill:', skillId, 'status', (upSkill as any).statusCode || (upSkill as any).status || 'unknown');
        }
      } catch (genErr) {
        console.warn('Failed to generate companion skill for', parsed.id, genErr instanceof Error ? genErr.message : String(genErr));
      }
    } catch (e) {
      console.warn('Failed to seed', full, e instanceof Error ? e.message : e);
    }
  }

  console.log('Seeding complete');
}

if (require.main === module) main();
