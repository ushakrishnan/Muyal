import { KnowledgeDescriptorT } from '../schema';
import { ExecutionResult, Executor } from '../types';
import { logErrorToCosmos } from './error-logger';

export const vectorExecutor: Executor = async (desc: KnowledgeDescriptorT) => {
  // Skeleton: query vector index and return top-N hits as text
  try {
    return { text: '', metadata: { id: desc.id } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    try {
      const client = desc.metadata?.cosmosClient;
      const dbName = desc.metadata?.cosmosDb || process.env.COSMOS_DB || process.env.COSMOS_DB_DATABASE || 'muyal';
      await logErrorToCosmos(client, dbName, { source: 'vector-exec', descriptorId: desc.id, error: msg, timestamp: new Date().toISOString() });
    } catch {}
    return { text: '', metadata: { id: desc.id, error: msg } };
  }
};
