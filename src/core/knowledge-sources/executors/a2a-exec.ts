import { KnowledgeDescriptorT } from '../schema';
import { ExecutionResult, Executor } from '../types';
// Note: requires A2A client integration (in-repo) to perform agent-to-agent calls.
import { A2ACommunicator } from '../../a2a/communication';
import { logErrorToCosmos } from './error-logger';

export const a2aExecutor = (comm?: A2ACommunicator): Executor => {
  return async (desc: KnowledgeDescriptorT) => {
    const agentId = desc.metadata?.agentId;
    if (!agentId) return { text: '', metadata: { id: desc.id } };
    if (!comm) return { text: '', metadata: { id: desc.id } };

    try {
      const capability = desc.metadata?.capability || 'knowledge';
      const payload = { query: desc.id, descriptor: desc };
      const res = await comm.sendRequest(agentId, capability, payload);
      if (res && res.success) {
        return { text: typeof res.data === 'string' ? res.data : JSON.stringify(res.data), metadata: { id: desc.id, raw: res } };
      }
      return { text: res?.error ?? '', metadata: { id: desc.id, raw: res } };
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      try {
        const client = desc.metadata?.cosmosClient;
        const dbName = desc.metadata?.cosmosDb || process.env.COSMOS_DB || process.env.COSMOS_DB_DATABASE || 'muyal';
        await logErrorToCosmos(client, dbName, {
          source: 'a2a-exec',
          descriptorId: desc.id,
          error: errMsg,
          timestamp: new Date().toISOString()
        });
      } catch {}
      return { text: '', metadata: { id: desc.id, error: errMsg } };
    }
  };
};
