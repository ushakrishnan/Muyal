import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface StoredConversationMessage {
  id: string;
  timestamp: Date;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  id: string;
  userId: string;
  platform: string;
  sessionStarted: Date;
  lastActivity: Date;
  [key: string]: any;
}

export interface ConversationSummary {
  id: string;
  title: string;
  lastMessageAt: Date;
  messageCount: number;
  participants: string[];
  topics: string[];
}

export interface MemoryProvider {
  init?: () => Promise<void> | void;
  addMessage(conversationId: string, message: Omit<StoredConversationMessage, 'id'>): Promise<StoredConversationMessage> | StoredConversationMessage;
  getConversation(conversationId: string): Promise<StoredConversationMessage[]> | StoredConversationMessage[];
  getConversationForAI?(conversationId: string, maxMessages?: number): Promise<string> | string;
  createContext(conversationId: string, userId: string, platform: string): Promise<ConversationContext> | ConversationContext;
  updateContext(conversationId: string, updates: Partial<ConversationContext>): Promise<void> | void;
  getContext(conversationId: string): Promise<ConversationContext | undefined> | ConversationContext | undefined;
  clearConversation(conversationId: string): Promise<void> | void;
  getAllConversations?(): Promise<ConversationSummary[]> | ConversationSummary[];
  getStats?(): Promise<any> | any;
}

// Choose provider based on env
const providerName = (process.env.MEMORY_PROVIDER || 'filesystem').toLowerCase();

let provider: MemoryProvider;
if (providerName === 'cosmos' || providerName === 'cosmosdb') {
  // Lazy require to avoid pulling heavy deps when not used
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const CosmosProvider = require('./providers/cosmos-memory').CosmosMemoryProvider;
  provider = new CosmosProvider(process.env.COSMOS_DB_ENDPOINT, process.env.COSMOS_DB_KEY, process.env.COSMOS_DB_DATABASE, process.env.COSMOS_DB_CONTAINER);
} else {
  // filesystem
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const FsProvider = require('./providers/filesystem-memory').FileSystemMemoryProvider;
  const storageDir = process.env.CONVERSATION_STORAGE_DIR || path.join(process.cwd(), 'data', 'conversations');
  provider = new FsProvider(storageDir, Number(process.env.MEMORY_MAX_MESSAGES || 100), Number(process.env.MEMORY_MAX_AGE_DAYS || 30));
}

export const memoryProvider = provider;

export const initMemory = async () => {
  if (provider.init) await provider.init();
};

// Backwards-compatible convenience wrapper used by older imports
export const conversationMemory = {
  createContext: async (conversationId: string, userId: string, platform: string) => {
    if (provider.createContext) return await provider.createContext(conversationId, userId, platform);
    return undefined;
  },
  getContext: async (conversationId: string) => {
    if (provider.getContext) return await provider.getContext(conversationId);
    return undefined;
  },
  addMessage: async (conversationId: string, message: any) => {
    return await provider.addMessage(conversationId, message);
  },
  getConversation: async (conversationId: string) => {
    return await provider.getConversation(conversationId);
  },
  updateContext: async (conversationId: string, updates: any) => {
    if (provider.updateContext) return await provider.updateContext(conversationId, updates);
    return;
  },
  clearConversation: async (conversationId: string) => {
    if (provider.clearConversation) return await provider.clearConversation(conversationId);
    return;
  },
  getAllConversations: async () => {
    if (provider.getAllConversations) return await provider.getAllConversations();
    return [];
  },
  getStats: async () => {
    if (provider.getStats) return await provider.getStats();
    return {};
  }
};
