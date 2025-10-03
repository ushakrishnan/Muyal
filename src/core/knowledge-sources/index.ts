/**
 * Knowledge Sources Index
 *
 * NOTE: this project now loads knowledge descriptors from JSON files under
 * `src/core/knowledge-sources/knowledge-data`. The old TypeScript-based
 * knowledge source modules were intentionally removed after migration to
 * JSON descriptors. To preserve backward compatibility for code that
 * imports `allKnowledgeSources`, we export an empty array here — the
 * runtime loader (`loadKnowledgeFromDir`) will register JSON-based sources at
 * startup instead.
 */

export const allKnowledgeSources: any[] = [];