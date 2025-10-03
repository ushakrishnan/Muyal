import { KnowledgeDescriptorT } from '../schema';
import { ExecutionResult, Executor } from '../types';
import { logErrorToCosmos } from './error-logger';

export const customExecutor: Executor = async (desc: KnowledgeDescriptorT) => {
  // Placeholder: allow projects to register a custom executor by id or through DI
  try {
    return { text: '', metadata: { id: desc.id } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    try {
      const client = desc.metadata?.cosmosClient;
      const dbName = desc.metadata?.cosmosDb || process.env.COSMOS_DB || process.env.COSMOS_DB_DATABASE || 'muyal';
      await logErrorToCosmos(client, dbName, { source: 'custom-exec', descriptorId: desc.id, error: msg, timestamp: new Date().toISOString() });
    } catch {}
    return { text: '', metadata: { id: desc.id, error: msg } };
  }
};
