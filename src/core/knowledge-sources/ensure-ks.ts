import { KnowledgeDescriptorT } from './schema';
import { getExecutorFor, ExecutorContext } from './executor-factory';
import { Executor } from './types';

function levenshtein(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

function isSimilar(a: string, b: string) {
  if (!a || !b) return false;
  if (a === b) return true;
  const maxLen = Math.max(a.length, b.length);
  const d = levenshtein(a, b);
  // Consider similar when distance is small relative to length
  return d <= Math.max(1, Math.floor(maxLen * 0.25));
}

export type KnowledgeSource = {
  id: string;
  name: string;
  keywords: string[];
  isEnabled: boolean;
  isRelevant: (message: string) => boolean;
  fetchContext: (ctx?: { conversationId?: string }) => Promise<string>;
  getSuggestions?: () => string[];
  descriptor: KnowledgeDescriptorT;
};

export function ensureKnowledgeSource(desc: KnowledgeDescriptorT, ctx?: ExecutorContext): KnowledgeSource {
  // Inject runtime clients into descriptor metadata for executors to use.
  if (ctx?.cosmosClient) {
    desc.metadata = desc.metadata || {};
    // Attach a runtime reference to the client and db name so executors can
    // perform logging or queries without changing the Executor signature.
    desc.metadata.cosmosClient = ctx.cosmosClient;
    if (ctx.cosmosDb) desc.metadata.cosmosDb = ctx.cosmosDb;
  }

  const executor: Executor = getExecutorFor(desc, ctx);

  const name = desc.name ?? desc.id;
  const keywords = desc.keywords ?? [];

  return {
    id: desc.id,
    name,
    keywords,
    // default to enabled unless explicitly disabled in descriptor metadata
    isEnabled: desc.metadata?.enabled === false ? false : true,
    descriptor: desc,
    isRelevant: (message: string) => {
      const debug = !!process.env.KNOWLEDGE_DEBUG;
      const low = message.toLowerCase();
      // exact substring match first
      if (keywords.some(k => low.includes(k.toLowerCase()))) {
        if (debug) console.debug(`[knowledge:isRelevant] direct keyword match for source=${desc.id}`);
        return true;
      }
      // basic name match
      if (low.includes(name.toLowerCase())) {
        if (debug) console.debug(`[knowledge:isRelevant] name substring match for source=${desc.id}`);
        return true;
      }

      // token-level fuzzy match for small typos (e.g., 'kepie' -> 'kelpie')
      const tokens = low.split(/\W+/).filter(Boolean);
      for (const t of tokens) {
        for (const k of keywords) {
          const kk = String(k).toLowerCase();
          if (isSimilar(t, kk)) return true;
        }
        if (isSimilar(t, name.toLowerCase())) return true;
      }
      if (debug) console.debug(`[knowledge:isRelevant] no match for source=${desc.id} tokens=${tokens.join(',')}`);
      return false;
    },
    fetchContext: async (ctx) => {
      const res = await executor(desc, ctx);
      if (process.env.KNOWLEDGE_DEBUG) {
        try {
          console.debug('[knowledge:fetchContext] executor result for', desc.id, { text: res.text, structured: res.structured ? '[structured]' : undefined, metadata: res.metadata });
        } catch (e) {
          // noop
        }
      }
      // Prefer structured JSON if executor returns it (modern executors use
      // `structured`), fall back to metadata.raw (older executors), then text.
      if (res.structured && typeof res.structured === 'object') {
        try {
          return JSON.stringify(res.structured);
        } catch {
          // fallthrough
        }
      }
      if (res.metadata?.raw && typeof res.metadata.raw === 'object') {
        try {
          return JSON.stringify(res.metadata.raw);
        } catch {
          // fallthrough
        }
      }
      return res.text;
    },
    getSuggestions: () => desc.metadata?.suggestions ?? [],
  };
}
