import 'dotenv/config';
import { CosmosClient } from '@azure/cosmos';

async function run() {
  const endpoint = process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_ENDPOINT || 'https://localhost:8081';
  const key = process.env.COSMOS_DB_KEY || process.env.COSMOS_KEY || '';
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const client = new CosmosClient({ endpoint, key });
  const dbName = process.env.COSMOS_DB_DATABASE || process.env.COSMOS_DB || 'muyal';
  const db = client.database(dbName);

  const envContainer = process.env.COSMOS_DB_CONTAINER || process.env.COSMOS_CONTAINER || process.env.COSMOS_KS_CONTAINER;
  const containers = Array.from(new Set([envContainer, 'knowledge', 'conversations'])).filter(Boolean) as string[];

  console.log('Checking database', dbName, 'containers:', containers.join(', '));

  for (const cName of containers) {
    try {
      const container = db.container(cName);
      const qSkills = { query: "SELECT c.id, c.tenantId, c.name FROM c WHERE STARTSWITH(c.id, 'skill-') ORDER BY c.id" };
      const rSkills = await container.items.query(qSkills).fetchAll();
      console.log('\nContainer', cName, '=> skill docs found:', rSkills.resources.length);
      for (const r of rSkills.resources) console.log(' -', r.id, '| tenant:', r.tenantId, '| name:', r.name);

      const qDesc = { query: 'SELECT c.id, c.tenantId, c.name FROM c WHERE IS_DEFINED(c.descriptor) ORDER BY c.id' };
      const rDesc = await container.items.query(qDesc).fetchAll();
      console.log('Container', cName, '=> descriptor docs found:', rDesc.resources.length);
      for (const r of rDesc.resources) console.log(' *', r.id, '| tenant:', r.tenantId, '| name:', r.name);
    } catch (e) {
      console.warn('Failed to query container', cName, e instanceof Error ? e.message : e);
    }
  }
}

run().catch(e => { console.error(e); process.exit(1); });
