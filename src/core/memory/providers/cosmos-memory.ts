import { MemoryProvider, StoredConversationMessage, ConversationContext, ConversationSummary } from '../index';

export class CosmosMemoryProvider implements MemoryProvider {
  private client: any = null;
  private container: any = null;
  private databaseId: string | undefined;
  private containerId: string | undefined;
  private endpoint?: string;
  private key?: string;

  constructor(endpoint?: string, key?: string, databaseId?: string, containerId?: string) {
    this.databaseId = databaseId || process.env.COSMOS_DB_DATABASE;
    this.containerId = containerId || process.env.COSMOS_DB_CONTAINER;

    // Store credentials; real CosmosClient will be created in init()
    if (endpoint && key) {
      this.endpoint = endpoint;
      this.key = key;
    }
  }

  async init() {
    // Ensure we have a real SDK client instance
    if (!this.client) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const cosmos = require('@azure/cosmos');
        const CosmosClient = cosmos.CosmosClient;
        const endpoint = this.endpoint || process.env.COSMOS_DB_ENDPOINT;
        const key = this.key || process.env.COSMOS_DB_KEY;
        if (!endpoint || !key) throw new Error('Cosmos endpoint/key missing');

        // If connecting to a local emulator (self-signed cert), relax TLS verification
        try {
          const host = new URL(endpoint).hostname;
          if (host === 'localhost' || host === '127.0.0.1') {
            console.warn('⚠️ Connecting to local Cosmos emulator - temporarily disabling TLS verification for this process (NODE_TLS_REJECT_UNAUTHORIZED=0)');
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
          }
        } catch (e) {
          // ignore URL parse errors
        }

        this.client = new CosmosClient({ endpoint, key });
      } catch (err) {
        throw new Error('Missing @azure/cosmos package or configuration: ' + String(err));
      }
    }

    if (!this.client) throw new Error('Cosmos client not configured. Set COSMOS_DB_ENDPOINT and COSMOS_DB_KEY');
    if (!this.databaseId || !this.containerId) throw new Error('COSMOS_DB_DATABASE and COSMOS_DB_CONTAINER must be set');

    // Try multiple SDK shapes (v3 vs v4) to create or get database and container
    const introspect: Record<string, any> = {};
    try {
      // Try client.databases.createIfNotExists (older v3 shape)
      if (this.client.databases && typeof this.client.databases.createIfNotExists === 'function') {
        const dbResp = await this.client.databases.createIfNotExists({ id: this.databaseId });
        const database = dbResp.database || dbResp;
        introspect['used'] = 'client.databases.createIfNotExists';
        if (database.containers && typeof database.containers.createIfNotExists === 'function') {
          const containerResp = await database.containers.createIfNotExists({ id: this.containerId, partitionKey: { kind: 'Hash', paths: ['/conversationId'] } });
          this.container = containerResp.container || containerResp;
          return;
        }
      }

      // Try v4 style: client.database(dbId).containers.createIfNotExists
      if (typeof this.client.database === 'function') {
        introspect['databaseAsFunction'] = true;
        const dbObj = this.client.database(this.databaseId);
        if (dbObj && dbObj.containers && typeof dbObj.containers.createIfNotExists === 'function') {
          introspect['used'] = 'client.database(...).containers.createIfNotExists';
          const containerResp = await dbObj.containers.createIfNotExists({ id: this.containerId, partitionKey: { paths: ['/conversationId'], kind: 'Hash' } });
          this.container = containerResp.container || containerResp;
          return;
        }

        // Try accessing container object and reading it
        try {
          const cont = dbObj.container(this.containerId);
          if (cont && typeof cont.read === 'function') {
            introspect['used'] = 'client.database(...).container(...).read';
            await cont.read();
            this.container = cont;
            return;
          }
        } catch (innerErr) {
          introspect['containerReadError'] = String(innerErr);
        }
      }

      // As a last attempt, try older nested paths
      if (this.client.databases && typeof this.client.databases.createIfNotExists === 'function') {
        introspect['lastAttempt'] = 'databases.createIfNotExists fallback';
        const dbResp2 = await this.client.databases.createIfNotExists({ id: this.databaseId });
        const database2 = dbResp2.database || dbResp2;
        const containerResp2 = await database2.containers.createIfNotExists({ id: this.containerId, partitionKey: { paths: ['/conversationId'], kind: 'Hash' } });
        this.container = containerResp2.container || containerResp2;
        return;
      }

      // If we reach here, none of the shapes worked — throw with introspection
      const clientShape = Object.keys(this.client).slice(0, 40);
      const message = `Unable to create or access Cosmos DB database/container with detected SDK. provider keys: ${JSON.stringify(clientShape)}; introspect: ${JSON.stringify(introspect)}`;
      throw new Error(message);
    } catch (err) {
      // add introspection to error
      const enhanced = new Error(String(err) + ' | introspect=' + JSON.stringify(introspect));
      throw enhanced;
    }
  }

  // Simple document model: each message stored as item with id, conversationId, timestamp, role, content, metadata
  async addMessage(conversationId: string, message: Omit<StoredConversationMessage, 'id'>): Promise<StoredConversationMessage> {
    if (!this.container) throw new Error('Cosmos container not initialized');
    const doc = {
      conversationId,
      timestamp: message.timestamp.toISOString(),
      role: message.role,
      content: message.content,
      metadata: message.metadata || {},
      docType: 'message',
    } as any;

  const resp = await this.container.items.create(doc);
  // DEBUG: log raw response to help locate created item in emulator
  try { console.log('DEBUG: cosmos create response keys:', Object.keys(resp)); } catch (e) { /* ignore */ }
    const resource = resp.resource || resp;
    // DEBUG: attempt to read the item back by id to verify persistence
    try {
      const readResp = await this.container.item(resource.id, conversationId).read().catch((e: any) => ({ error: String(e) }));
      try { console.log('DEBUG: post-create read result keys:', Object.keys(readResp)); } catch (e) { /* ignore */ }
      try { console.log('DEBUG: post-create read resource:', readResp.resource || readResp.item || readResp); } catch (e) { /* ignore */ }
    } catch (e) { /* ignore */ }
    const saved: StoredConversationMessage = {
      id: resource.id,
      timestamp: new Date(resource.timestamp),
      role: resource.role,
      content: resource.content,
      metadata: resource.metadata,
    };

    return saved;
  }

  async getConversation(conversationId: string): Promise<StoredConversationMessage[]> {
    if (!this.container) throw new Error('Cosmos container not initialized');
    const query = {
      query: "SELECT * FROM c WHERE c.conversationId = @conv AND c.docType = 'message' ORDER BY c.timestamp ASC",
      parameters: [{ name: '@conv', value: conversationId }],
    };

    // Try enabling cross-partition querying if supported by SDK
    try {
      const iterator = this.container.items.query(query, { enableCrossPartitionQuery: true });
      const res = await (iterator.fetchAll ? iterator.fetchAll() : iterator.toArray());
      const resources = res.resources || res || [];
      return resources.map((r: any) => ({ id: r.id, timestamp: new Date(r.timestamp), role: r.role, content: r.content, metadata: r.metadata }));
    } catch (e) {
      // Fallback to default call
      const { resources } = await this.container.items.query(query).fetchAll();
      return resources.map((r: any) => ({ id: r.id, timestamp: new Date(r.timestamp), role: r.role, content: r.content, metadata: r.metadata }));
    }
  }

  async createContext(conversationId: string, userId: string, platform: string): Promise<ConversationContext> {
    if (!this.container) throw new Error('Cosmos container not initialized');
    const contextDoc = {
      id: `ctx_${conversationId}`,
      conversationId,
      userId,
      platform,
      sessionStarted: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      docType: 'context',
    };
    await this.container.items.upsert(contextDoc);
    return { ...contextDoc, sessionStarted: new Date(contextDoc.sessionStarted), lastActivity: new Date(contextDoc.lastActivity) } as ConversationContext;
  }

  async updateContext(conversationId: string, updates: Partial<ConversationContext>): Promise<void> {
    if (!this.container) throw new Error('Cosmos container not initialized');
    const id = `ctx_${conversationId}`;
  const { resource } = await this.container.item(id, conversationId).read().catch(() => ({ resource: null }));
    const existing = resource || { id, conversationId };
    const merged = { ...existing, ...updates, lastActivity: (updates.lastActivity || new Date()).toString() };
    await this.container.items.upsert(merged);
  }

  async getContext(conversationId: string): Promise<ConversationContext | undefined> {
    if (!this.container) throw new Error('Cosmos container not initialized');
    const id = `ctx_${conversationId}`;
    try {
      const { resource } = await this.container.item(id, conversationId).read();
      if (!resource) return undefined;
      return { ...resource, sessionStarted: new Date(resource.sessionStarted), lastActivity: new Date(resource.lastActivity) } as ConversationContext;
    } catch (err) {
      return undefined;
    }
  }

  async clearConversation(conversationId: string): Promise<void> {
    if (!this.container) throw new Error('Cosmos container not initialized');
    // Delete messages
    // Use cross-partition query where supported
    let resources: any[] = [];
    try {
      const iter = this.container.items.query({ query: "SELECT c.id FROM c WHERE c.conversationId = @conv AND c.docType = 'message'", parameters: [{ name: '@conv', value: conversationId }] }, { enableCrossPartitionQuery: true });
      const rr = await (iter.fetchAll ? iter.fetchAll() : iter.toArray());
      resources = rr.resources || rr || [];
    } catch (e) {
      const rr = await this.container.items.query({ query: "SELECT c.id FROM c WHERE c.conversationId = @conv AND c.docType = 'message'", parameters: [{ name: '@conv', value: conversationId }] }).fetchAll();
      resources = rr.resources || rr || [];
    }
    for (const r of resources) {
      try { await this.container.item(r.id, conversationId).delete(); } catch (e) { /* ignore */ }
    }
    // Delete context
    const ctxId = `ctx_${conversationId}`;
    try { await this.container.item(ctxId, conversationId).delete(); } catch (e) { /* ignore */ }
  }

  // Other methods (getAllConversations, getStats) could be added later
}

export default CosmosMemoryProvider;
