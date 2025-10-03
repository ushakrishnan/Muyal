import { KnowledgeDescriptorT } from './schema';

export type ExecutionResult = {
  // Human-friendly summary text (for direct consumption by models / users)
  text: string;
  // Full structured JSON result returned by the executor (if applicable)
  structured?: any;
  metadata?: Record<string, any>;
  suggestions?: string[];
};

export type Executor = (desc: KnowledgeDescriptorT, ctx?: { conversationId?: string }) => Promise<ExecutionResult>;
