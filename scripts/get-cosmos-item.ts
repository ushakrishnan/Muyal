import 'dotenv/config';

async function run() {
  const id = process.argv[2];
  const partition = process.argv[3];
  if (!id || !partition) {
    console.error('Usage: node get-cosmos-item.ts <id> <partitionKeyValue>');
    process.exit(1);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cosmos = require('@azure/cosmos');
    const CosmosClient = cosmos.CosmosClient;
    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;
    const databaseId = process.env.COSMOS_DB_DATABASE;
    const containerId = process.env.COSMOS_DB_CONTAINER;

    if (!endpoint || !key) throw new Error('COSMOS_DB_ENDPOINT/COSMOS_DB_KEY missing');
    try { const host = new URL(endpoint).hostname; if (host === 'localhost' || host === '127.0.0.1') process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; } catch (e) {}

    const client = new CosmosClient({ endpoint, key });
    const db = client.database(databaseId);
    const container = db.container(containerId);

    const { resource } = await container.item(id, partition).read();
    console.log('Item resource:', JSON.stringify(resource, null, 2));
  } catch (err) {
    console.error('Error reading item:', String(err));
    process.exit(2);
  }
}

run();
