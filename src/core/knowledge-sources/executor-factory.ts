import { KnowledgeDescriptorT } from './schema';
import { Executor } from './types';
import { staticExecutor } from './executors/static-exec';
import { httpExecutor } from './executors/http-exec';
import { a2aExecutor } from './executors/a2a-exec';
import { cosmosExecutorFactory } from './executors/cosmos-exec';
import { vectorExecutor } from './executors/vector-exec';
import { fileExecutor } from './executors/file-exec';
import { customExecutor } from './executors/custom-exec';

export type ExecutorContext = {
  a2aCommunicator?: any;
  cosmosClient?: any;
  vectorClient?: any;
  cosmosDb?: string;
};

export function getExecutorFor(desc: KnowledgeDescriptorT, ctx?: ExecutorContext): Executor {
  switch (desc.provider) {
    case 'static':
      return staticExecutor;
    case 'http':
      return httpExecutor;
    case 'a2a':
      return a2aExecutor(ctx?.a2aCommunicator);
    case 'cosmos':
      return cosmosExecutorFactory(ctx?.cosmosClient);
    case 'vector':
      return vectorExecutor;
    case 'file':
      return fileExecutor;
    case 'custom':
      return customExecutor;
    default:
      // Fallback to static (safe default)
      return staticExecutor;
  }
}
