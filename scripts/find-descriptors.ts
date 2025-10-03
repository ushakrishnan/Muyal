import 'dotenv/config';
import { CosmosClient } from '@azure/cosmos';

async function run() {
  const endpoint = process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_ENDPOINT || 'https://localhost:8081';
  const key = process.env.COSMOS_DB_KEY || process.env.COSMOS_KEY || '';
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const client = new CosmosClient({ endpoint, key });
  const db = client.database(process.env.COSMOS_DB_DATABASE || process.env.COSMOS_DB || 'muyal');
  const container = db.container(process.env.COSMOS_DB_CONTAINER || process.env.COSMOS_CONTAINER || 'knowledge');

  const q = { query: 'SELECT c.id, c.tenantId, c.name FROM c WHERE IS_DEFINED(c.descriptor) ORDER BY c.id' };
  const res = await container.items.query(q).fetchAll();
  console.log('Found', res.resources.length, 'descriptor documents');
  for (const r of res.resources) console.log('-', r.id, '| tenant:', r.tenantId, '| name:', r.name);
}

run().catch(e => { console.error(e); process.exit(1); });
