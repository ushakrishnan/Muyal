import { CosmosClient, ContainerResponse } from '@azure/cosmos';

// Default container names
const ERRORS_CONTAINER = 'errors';
const LOGS_CONTAINER = 'logs';

async function ensureContainerExists(client: CosmosClient, dbName: string, containerName: string) {
  try {
    const dbResponse = await client.databases.createIfNotExists({ id: dbName });
    const db = dbResponse.database;
    // Choose a safe partition key: '/id' (ids are unique) to simplify upserts
  const { resource: container } = await db.containers.createIfNotExists({ id: containerName, partitionKey: { paths: ['/id'] } as any });
    return container;
  } catch (e) {
    // Best-effort only
    // eslint-disable-next-line no-console
    console.warn('ensureContainerExists failed', e instanceof Error ? e.message : e);
    return undefined;
  }
}

export async function logToCosmos(client: CosmosClient | undefined, dbName: string, containerName: string, doc: Record<string, any>) {
  if (!client) return;
  try {
    // Ensure database and container exist
    await ensureContainerExists(client, dbName, containerName);
    const db = client.database(dbName);
    const cont = db.container(containerName);
    if (!doc.id) doc.id = `${containerName}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    await cont.items.upsert(doc as any);
  } catch (e) {
    // Best-effort
    // eslint-disable-next-line no-console
    console.warn('logToCosmos failed', e instanceof Error ? e.message : e);
  }
}

export async function logErrorToCosmos(client: CosmosClient | undefined, dbName: string, doc: Record<string, any>) {
  return await logToCosmos(client, dbName, ERRORS_CONTAINER, doc);
}

export async function logMetricToCosmos(client: CosmosClient | undefined, dbName: string, doc: Record<string, any>) {
  return await logToCosmos(client, dbName, LOGS_CONTAINER, doc);
}
