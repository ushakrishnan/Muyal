import 'dotenv/config';
import { CosmosClient } from '@azure/cosmos';

async function run() {
  const endpoint = process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_ENDPOINT || 'https://localhost:8081';
  const key = process.env.COSMOS_DB_KEY || process.env.COSMOS_KEY || '';
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const client = new CosmosClient({ endpoint, key });
  const dbName = process.env.COSMOS_DB_DATABASE || process.env.COSMOS_DB || 'muyal';
  const containerName = process.env.COSMOS_DB_CONTAINER || process.env.COSMOS_CONTAINER || 'knowledge';
  const db = client.database(dbName);
  const container = db.container(containerName);

  console.log('Querying for skill documents...');
  const q = { query: "SELECT c.id, c.tenantId FROM c WHERE STARTSWITH(c.id, 'skill-')" };
  const res = await container.items.query(q).fetchAll();
  console.log('Found', res.resources.length, 'skill documents to remove');
  for (const r of res.resources) {
    try {
      const pk = r.tenantId || undefined;
      await container.item(r.id, pk).delete();
      console.log('Deleted', r.id, 'partition', r.tenantId);
    } catch (e) {
      console.warn('Failed to delete', r.id, e instanceof Error ? e.message : String(e));
    }
  }
  console.log('Cleanup complete');
}

run().catch(e => { console.error(e); process.exit(1); });
