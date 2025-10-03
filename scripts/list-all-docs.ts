import 'dotenv/config';
import { CosmosClient } from '@azure/cosmos';

async function run() {
  const endpoint = process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_ENDPOINT || 'https://localhost:8081';
  const key = process.env.COSMOS_DB_KEY || process.env.COSMOS_KEY || '';
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const client = new CosmosClient({ endpoint, key });
  const db = client.database(process.env.COSMOS_DB_DATABASE || process.env.COSMOS_DB || 'muyal');
  const container = db.container(process.env.COSMOS_DB_CONTAINER || process.env.COSMOS_CONTAINER || 'knowledge');

  const res = await container.items.query({ query: 'SELECT TOP 100 c.id, c.tenantId, c.descriptor, STARTSWITH(c.id, "skill-") AS isSkill FROM c ORDER BY c.id' }).fetchAll();
  console.log('Total documents returned:', res.resources.length);
  for (const r of res.resources) {
    console.log('-', r.id, '| tenant:', r.tenantId, '| isSkill:', r.isSkill, '| hasDescriptor:', !!r.descriptor);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
