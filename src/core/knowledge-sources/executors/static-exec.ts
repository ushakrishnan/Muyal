import { KnowledgeDescriptorT } from '../schema';
import { ExecutionResult, Executor } from '../types';
import observability from '../../observability';

export const staticExecutor: Executor = async (desc: KnowledgeDescriptorT) => {
  const start = Date.now();
  try {
    // Static executor returns the configured static.text and optional suggestions
    const text = desc.static?.text ?? '';
    const suggestions = Array.isArray(desc.static?.suggestions) ? desc.static!.suggestions! : [];
    const res: ExecutionResult = { text, suggestions, metadata: { id: desc.id } };
    const latency = Date.now() - start;
  // record latency metric for static executor
  observability.recordLatency('executor.fetch.latency', latency, { provider: 'static', id: desc.id }).catch(() => {});
    return res;
  } catch (err) {
    const latency = Date.now() - start;
    observability.incrementCounter('executor.fetch.failureCount', { provider: 'static', id: desc.id }).catch(() => {});
  await observability.logError({ timestamp: new Date().toISOString(), sourceId: desc.id, operation: 'static-exec', error: err, notes: 'static executor failure' }, desc.metadata?.cosmosClient, desc.metadata?.cosmosDb).catch(() => {});
    observability.recordLatency('executor.fetch.latency', latency, { provider: 'static', id: desc.id }).catch(() => {});
    try { /* best-effort cosmos writes handled by observability.logError above */ } catch { /* swallow */ }
    throw err;
  }
};
