import { KnowledgeDescriptorT } from '../schema';
import { ExecutionResult, Executor } from '../types';
import { logErrorToCosmos } from './error-logger';

export const cosmosExecutorFactory = (client?: any): Executor => {
  return async (desc: KnowledgeDescriptorT) => {
    if (!client) return { text: '', metadata: { id: desc.id } };
    // Expect desc.metadata to contain { database, container, query, params }
    try {
      const db = desc.metadata?.database;
      const container = desc.metadata?.container;
      const query = desc.metadata?.query;
      if (!db || !container || !query) return { text: '', metadata: { id: desc.id } };

      const database = client.database(db);
      const cont = database.container(container);
      const iterator = cont.items.query(query, { parameters: desc.metadata?.params || [] });
      const { resources } = await iterator.fetchAll();

      // Build a compact human-friendly summary from the top results. The summary
      // should be short and informative for model consumption. We will include
      // up to 5 items in the summary and join key summary fields.
      const top = resources.slice(0, 5);
      const summaryLines = top.map((r: any, idx: number) => {
        // Attempt to pick sensible fields for a short line: prefer name/title,
        // fallback to id and a truncated description.
        const title = r.name || r.title || r.id || `item-${idx + 1}`;
        const descText = r.description || r.body || r.summary || '';
        const shortDesc = descText ? (String(descText).slice(0, 140) + (String(descText).length > 140 ? '…' : '')) : '';
        return shortDesc ? `- ${title}: ${shortDesc}` : `- ${title}`;
      });

      const humanSummary = summaryLines.length > 0 ? `Results (${resources.length} total):\n${summaryLines.join('\n')}` : 'No results found.';

      return {
        text: humanSummary,
        structured: resources,
        metadata: { id: desc.id, count: resources.length }
      };
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      try {
        const client = desc.metadata?.cosmosClient;
        const dbName = desc.metadata?.cosmosDb || process.env.COSMOS_DB || process.env.COSMOS_DB_DATABASE || 'muyal';
        await logErrorToCosmos(client, dbName, {
          source: 'cosmos-exec',
          descriptorId: desc.id,
          error: errMsg,
          query: desc.metadata?.query,
          timestamp: new Date().toISOString()
        });
      } catch {}
      return { text: '', metadata: { id: desc.id, error: errMsg } };
    }
  };
};
