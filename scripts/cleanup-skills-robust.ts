import 'dotenv/config';
import { CosmosClient } from '@azure/cosmos';

function wait(ms: number) { return new Promise(res => setTimeout(res, ms)); }

async function run() {
  const endpoint = process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_ENDPOINT || 'https://localhost:8081';
  const key = process.env.COSMOS_DB_KEY || process.env.COSMOS_KEY || '';
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const client = new CosmosClient({ endpoint, key });
  const dbName = process.env.COSMOS_DB_DATABASE || process.env.COSMOS_DB || 'muyal';
  const containerName = process.env.COSMOS_DB_CONTAINER || process.env.COSMOS_CONTAINER || 'knowledge';
  const db = client.database(dbName);
  const container = db.container(containerName);

  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Cleanup attempt ${attempt}/${maxAttempts} - querying skill documents...`);
    const q = { query: "SELECT c.id, c.tenantId, c._rid FROM c WHERE STARTSWITH(c.id, 'skill-')" };
    let res;
    try {
      res = await container.items.query(q).fetchAll();
    } catch (e) {
      console.warn('Query failed', e instanceof Error ? e.message : String(e));
      await wait(500);
      continue;
    }
    const docs = res.resources || [];
    console.log('Found', docs.length, 'skill documents');
    if (docs.length === 0) {
      console.log('No skill documents remaining. Cleanup finished.');
      return;
    }

    for (const d of docs) {
      const id = d.id;
      const pk = d.tenantId || undefined;
      let deleted = false;
      try {
        await container.item(id, pk).delete();
        console.log('Deleted', id, 'with partition', pk);
        deleted = true;
      } catch (e: any) {
        const msg = e && e.message ? e.message : String(e);
        console.warn('Delete by partition failed for', id, 'pk=', pk, 'err=', msg);
      }
      if (!deleted) {
        // try delete without partition key
        try {
          await container.item(id).delete();
          console.log('Deleted', id, 'without partition key');
          deleted = true;
        } catch (e: any) {
          console.warn('Delete without partition failed for', id, e && e.message ? e.message : String(e));
        }
      }
    }

    // small delay before next attempt to allow emulator to settle
    await wait(700);
  }

  console.warn('Reached max cleanup attempts - some skill documents may remain.');
}

run().catch(e => { console.error(e); process.exit(1); });
