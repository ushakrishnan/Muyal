import 'dotenv/config';

async function run() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cosmos = require('@azure/cosmos');
    const CosmosClient = cosmos.CosmosClient;

    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;
    const databaseId = process.env.COSMOS_DB_DATABASE;
    const containerId = process.env.COSMOS_DB_CONTAINER;

    if (!endpoint || !key) {
      console.error('COSMOS_DB_ENDPOINT or COSMOS_DB_KEY not set in env');
      process.exit(1);
    }

    try {
      const host = new URL(endpoint).hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        console.warn('\u26a0\ufe0f Connecting to local Cosmos emulator - temporarily disabling TLS verification for this process (NODE_TLS_REJECT_UNAUTHORIZED=0)');
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }
    } catch (e) { /* ignore */ }

    const client = new CosmosClient({ endpoint, key });

    console.log('Connected to endpoint:', endpoint);

    // List all databases available in the account/emulator and enumerate their containers
    try {
      if (client.databases && typeof client.databases.readAll === 'function') {
        const dbs = await client.databases.readAll().fetchAll();
        const dbIds = dbs.resources.map((d: any) => d.id);
        console.log('Databases (readAll):', dbIds);

        for (const dbId of dbIds) {
          try {
            const dbObj = client.database ? client.database(dbId) : ((await client.databases.createIfNotExists({ id: dbId })).database || (await client.databases.createIfNotExists({ id: dbId })));
            // list containers
            if (dbObj.containers && typeof dbObj.containers.readAll === 'function') {
              const conts = await dbObj.containers.readAll().fetchAll();
              const contIds = conts.resources.map((c: any) => c.id);
              console.log(`Database ${dbId} containers:`, contIds);
              for (const contId of contIds) {
                try {
                  const cont = dbObj.container ? dbObj.container(contId) : ((await dbObj.containers.createIfNotExists({ id: contId })).container || (await dbObj.containers.createIfNotExists({ id: contId })));
                  // count items
                  try {
                    const countQuery = { query: 'SELECT VALUE COUNT(1) FROM c' };
                    // prefer cross-partition querying when available
                    const countIter = cont.items.query ? cont.items.query(countQuery, { enableCrossPartitionQuery: true }) : cont.items.query(countQuery);
                    const countRes = countIter.fetchAll ? await countIter.fetchAll() : await countIter.toArray();
                    const countVal = (countRes.resources && countRes.resources[0]) || (Array.isArray(countRes) ? countRes[0] : undefined);
                    console.log(`  ${dbId}/${contId} item count (approx):`, countVal ?? '(unknown)');
                  } catch (e) {
                    console.warn(`  Could not count items for ${dbId}/${contId}:`, String(e));
                  }
                  // Also run a targeted search for our test string to locate writes
                  try {
                    const searchText = 'Hello from memory test';
                    const searchQ = { query: 'SELECT TOP 10 * FROM c WHERE CONTAINS(c.content, @q) OR CONTAINS(c.metadata, @q)', parameters: [{ name: '@q', value: searchText }] };
                    const searchIter = cont.items.query ? cont.items.query(searchQ, { enableCrossPartitionQuery: true }) : cont.items.query(searchQ);
                    const searchRes = searchIter.fetchAll ? await searchIter.fetchAll() : await searchIter.toArray();
                    const searchItems = searchRes.resources || searchRes || [];
                    if (searchItems.length > 0) {
                      console.log(`  >>> Found matching items in ${dbId}/${contId}:`);
                      for (const si of searchItems) console.log('     ', { id: si.id, conversationId: si.conversationId, docType: si.docType, _ts: si._ts, contentPreview: (si.content || '').slice(0,80) });
                    }
                  } catch (e) {
                    /* ignore search failures */
                  }
                } catch (e) {
                  console.warn(`  Could not access container ${contId} in ${dbId}:`, String(e));
                }
              }
            } else {
              console.log(`Database ${dbId} has no readable containers (or older SDK shape).`);
            }
          } catch (e) {
            console.warn(`Failed enumerating containers for database ${dbId}:`, String(e));
          }
        }
      } else if (typeof client.databases === 'object') {
        // older shape may expose read()
        try { const dbs = await client.databases.read(); console.log('Databases (read):', dbs); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.warn('Could not list databases:', String(e));
    }

    if (!databaseId || !containerId) {
      console.log('COSMOS_DB_DATABASE or COSMOS_DB_CONTAINER not set; done');
      return;
    }

    // Try to access database and container and inspect container properties and items
    try {
      const db = client.database ? client.database(databaseId) : ((await client.databases.createIfNotExists({ id: databaseId })).database || (await client.databases.createIfNotExists({ id: databaseId })));
      console.log('Database accessed:', databaseId);
      const container = typeof db.container === 'function' ? db.container(containerId) : ((await db.containers.createIfNotExists({ id: containerId })).container || (await db.containers.createIfNotExists({ id: containerId })));
      console.log('Container accessed:', containerId);

      // Inspect container properties (partition key)
      try {
        const readRes = await (container.read ? container.read() : container.read?.());
        const pk = readRes?.resource?.partitionKey || readRes?.partitionKey || (readRes?.resource?.partitionKey || null);
        console.log('Container partition key:', pk || '(unknown)');
      } catch (e) {
        // try container.container properties
        try { const props = await container.read(); console.log('Container partition key (props):', props.resource.partitionKey); } catch (e2) { /* ignore */ }
      }

      // Query unfiltered items (top 50) to see everything in the container
      const rawQuery = { query: 'SELECT TOP 50 * FROM c ORDER BY c._ts DESC' };
      const rawIter = container.items.query ? container.items.query(rawQuery) : container.items.query(rawQuery);
      const rawRes = rawIter.fetchAll ? await rawIter.fetchAll() : await rawIter.toArray();
      const rawItems = rawRes.resources || rawRes || [];
      console.log(`Found ${rawItems.length} total items (unfiltered) in ${databaseId}/${containerId}:`);
      for (let i = 0; i < Math.min(rawItems.length, 20); i++) {
        const it = rawItems[i];
        console.log('RAW item', i, ':', { id: it.id, conversationId: it.conversationId, docType: it.docType, _ts: it._ts });
      }

    } catch (err) {
      console.error('Error accessing database/container or querying items:', String(err));
      process.exit(2);
    }

  } catch (err) {
    console.error('Failed to load @azure/cosmos or run diagnostics:', String(err));
    process.exit(1);
  }
}

run();
