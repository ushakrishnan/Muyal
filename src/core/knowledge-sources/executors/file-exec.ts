import fs from 'fs';
import path from 'path';
import { KnowledgeDescriptorT } from '../schema';
import { ExecutionResult, Executor } from '../types';
import { logErrorToCosmos } from './error-logger';

export const fileExecutor: Executor = async (desc: KnowledgeDescriptorT) => {
  const metadata = desc.metadata || {};
  const rel = metadata.filePath || metadata.path;
  if (!rel) return { text: '', metadata: { id: desc.id } };

  // Support either a single path or an array of paths
  const pathsToRead: string[] = Array.isArray(rel) ? rel as string[] : [rel as string];
  const fullPaths: string[] = [];
  const pieces: string[] = [];

  for (const p of pathsToRead) {
    const full = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
    fullPaths.push(full);
    try {
      const txt = fs.readFileSync(full, 'utf8');
      pieces.push(`---- ${path.relative(process.cwd(), full)} ----\n` + txt);
    } catch (e) {
      const errMsg = String(e);
      try {
        const client = desc.metadata?.cosmosClient;
        const dbName = desc.metadata?.cosmosDb || process.env.COSMOS_DB || process.env.COSMOS_DB_DATABASE || 'muyal';
        await logErrorToCosmos(client, dbName, {
          source: 'file-exec',
          descriptorId: desc.id,
          error: errMsg,
          path: full,
          timestamp: new Date().toISOString()
        });
      } catch {}
      // include a note for the missing file but continue concatenation
      pieces.push(`---- ${path.relative(process.cwd(), full)} (failed to read) ----\n${errMsg}`);
    }
  }

  const combined = pieces.join('\n\n');
  return { text: combined, metadata: { id: desc.id, files: fullPaths } };
};
