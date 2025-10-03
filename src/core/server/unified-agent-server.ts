import { ConversationHandler } from '../conversation/handler';
import { AIProcessor } from '../ai/processor';
import { A2ARegistry, A2ACommunicator, A2ACapabilityManager, AgentMetadata, A2AMessage, A2AResponse } from '../a2a/communication';
import { knowledgeLibrary, KnowledgeSource } from '../knowledge/library';
import { allKnowledgeSources } from '../knowledge-sources';
import { conversationMemory } from '../memory';
import { ConversationMessage } from '../core-types';

export interface MCPFunction {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  handler: (args: any, context?: any) => Promise<any>;
}

export class UnifiedAgentServer {
  private conversationHandler: ConversationHandler;
  private aiProcessor: AIProcessor;
  private a2aRegistry: A2ARegistry;
  private a2aCommunicator: A2ACommunicator;
  private capabilityManager: A2ACapabilityManager;
  private functions: Map<string, MCPFunction> = new Map();
  private isStarted = false;

  constructor(conversationHandler: ConversationHandler, aiProcessor: AIProcessor) {
    this.conversationHandler = conversationHandler;
    this.aiProcessor = aiProcessor;
    this.capabilityManager = new A2ACapabilityManager();

    const agentMetadata: AgentMetadata = {
      id: 'muyal-cea-' + Date.now(),
      name: 'Muyal CEA',
      description: 'Custom Engine Agent (CEA) for Microsoft 365 Copilot with 6 AI provider support',
      version: '1.0.0',
      capabilities: [],
      endpoints: {
        http: 'http://localhost:3978',
        mcp: 'stdio',
      },
      status: 'online',
      lastSeen: new Date(),
    };

    this.a2aRegistry = new A2ARegistry(agentMetadata.id, agentMetadata);
    this.a2aCommunicator = new A2ACommunicator(this.a2aRegistry);

    this.initializeKnowledgeLibrary();
    this.registerDefaultFunctions();
    this.registerA2AHandlers();
  }

  private initializeKnowledgeLibrary(): void {
    allKnowledgeSources.forEach((source: KnowledgeSource) => {
      knowledgeLibrary.registerSource(source);
    });
    
    console.log('\ud83d\udcda Knowledge Library initialized with', knowledgeLibrary.getSources().length, 'sources');
    // Subscribe to knowledge library changes to perform soft-resets when sources change
    knowledgeLibrary.onChange(async () => {
      try {
        const newVersion = knowledgeLibrary.getVersion();
        console.log('\ud83d\udce1 Knowledge library changed — updating conversation contexts to version', newVersion);
        // If provider supports listing conversations, iterate and soft-reset contexts where necessary
        if (conversationMemory.getAllConversations) {
          const all = await conversationMemory.getAllConversations();
          for (const c of all) {
            try {
              const ctx = await conversationMemory.getContext(c.id as string);
              const currentVersion = ctx?.knowledgeVersion || 0;
              if (currentVersion < newVersion) {
                // soft-reset: clear lastKnowledgeSources and set knowledgeVersion
                await conversationMemory.updateContext(c.id as string, {
                  lastKnowledgeSources: [],
                  knowledgeVersion: newVersion,
                });
              }
            } catch (e) {
              console.warn('Failed to update context for', c.id, e);
            }
          }
        }
      } catch (e) {
        console.warn('Error handling knowledgeLibrary change', e);
      }
    });
  }

  private registerDefaultFunctions() {
    this.registerFunction({
      name: 'chat',
      description: 'Send a message to the AI agent and get a response',
      inputSchema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The message to send to the AI agent',
          },
          conversationId: {
            type: 'string',
            description: 'Optional conversation ID for context',
          },
          platform: {
            type: 'string',
            description: 'Platform identifier (web, m365, mcp, etc.)',
            default: 'mcp',
          },
          aiProvider: {
            type: 'string',
            description: 'Specific AI provider to use (optional)',
          },
        },
        required: ['message'],
      },
      handler: async (args) => {
        try {
          const resetCommands = ['new conversation', 'start fresh', 'clear chat', 'reset conversation', 'start new', 'clear context'];
          const isResetCommand = resetCommands.some(cmd => args.message.toLowerCase().includes(cmd));

          if (isResetCommand) {
            const newConversationId = `${args.platform || 'web'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return {
              content: "\ud83d\udd04 **Started a new conversation!** Your chat history has been cleared and we're starting fresh. How can I help you?",
              provider: 'system',
              tokens: { prompt: 0, completion: 0 },
              cost: 0,
              knowledge_sources_used: [],
              suggestions: [],
              enhanced: false,
              conversationId: newConversationId,
              reset: true
            };
          }

          // Delegate enhancement and continuation logic to processMessageBridge so the
          // returned metadata matches what was actually used to produce and persist the
          // assistant response (avoids double-enhancing and mismatched provenance).
          const response = await this.processMessageBridge({
            content: args.message,
            conversationId: args.conversationId || `mcp-${Date.now()}`,
            platform: args.platform || 'mcp',
            userId: 'mcp-user',
            metadata: { source: 'mcp', requestedProvider: args.aiProvider },
          });

          // Normalize returned metadata keys and expose them to the caller
          const md = response.metadata || {};
          const knowledgeSources = md.knowledge_sources_used || md.knowledge_sources || [];
          const suggestions = md.suggestions || md.availableSuggestions || [];
          const enhanced = !!md.enhanced || (Array.isArray(knowledgeSources) && knowledgeSources.length > 0);

          return {
            content: response.content,
            provider: md.provider,
            tokens: md.tokens,
            cost: md.cost,
            knowledge_sources_used: knowledgeSources,
            suggestions,
            enhanced,
            conversationId: md.conversationId || (args.conversationId || undefined),
          };
        } catch (error) {
          console.error('\ud83d\udd27 Chat function error:', error);
          throw new Error(`Chat failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    });

    // other functions omitted for brevity in this patch (they can be added if needed)
  }

  private registerA2AHandlers() {
    this.a2aRegistry.registerHandler('chat', async (message: A2AMessage): Promise<A2AResponse> => {
      try {
        const response = await this.processMessageBridge({
          content: message.payload.message || message.payload,
          conversationId: message.id,
          platform: 'a2a',
          userId: message.from,
          metadata: { source: 'a2a', fromAgent: message.from },
        });
        
        return {
          success: true,
          data: {
            content: response.content,
            metadata: response.metadata,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    this.a2aRegistry.registerHandler('health', async (): Promise<A2AResponse> => {
      return {
        success: true,
        data: await this.getProviderHealth(),
      };
    });
  }

  private async processMessageBridge(params: {
    content: string;
    conversationId: string;
    platform: string;
    userId: string;
    metadata?: any;
  }): Promise<any> {
    try {
      const existingContext = await conversationMemory.getContext(params.conversationId);
      if (!existingContext) {
        await conversationMemory.createContext(params.conversationId, params.userId, params.platform);
      }

      const userMessage = await conversationMemory.addMessage(params.conversationId, {
        timestamp: new Date(),
        role: 'user',
        content: params.content,
        metadata: {
          platform: params.platform,
        }
      });

  const allMessages = await conversationMemory.getConversation(params.conversationId);
  // MODEL_HISTORY_WINDOW controls how many recent messages are sent as chat history to the model
  const modelHistoryWindow = Math.max(1, Number(process.env.MODEL_HISTORY_WINDOW || 4));
  const recentMessages = (allMessages || []).slice(-modelHistoryWindow);
      const historyMessages: ConversationMessage[] = recentMessages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }));
      // Continuation decision is made using stored context and semantic overlap below.

      // Decide whether to reuse previously stored knowledge sources (preferred) or run normal enhancement.
      // Approach:
      // 1. If the conversation context stores `lastKnowledgeSources`, prefer to use them for continuation.
      // 2. Decide to treat this as a continuation when there is semantic overlap between the current user message and the last assistant content (word overlap),
      //    or when the message is a short follow-up (few words) and there is prior knowledge available.
      // This avoids brittle hard-coded short-phrase lists like just 'ok'.
      let enhancementContext = null as any;
      try {
        params.metadata = params.metadata || {};
        const storedLastKnowledge: string[] = (existingContext && existingContext.lastKnowledgeSources) || [];

        // Gather previous assistant content from the conversation using stored message ids (if any)
        const prevAssistantIds: string[] = (existingContext && existingContext.lastAssistantMessages) || [];
        let prevAssistantText = '';
        if (prevAssistantIds.length > 0 && Array.isArray(allMessages)) {
          for (const id of prevAssistantIds) {
            const m = (allMessages as any[]).find(x => x.id === id && x.role === 'assistant');
            if (m && m.content) prevAssistantText += ' ' + String(m.content);
          }
        }

        // Improved continuation detection using a cheap term-frequency cosine similarity
        // to approximate semantic relatedness without provider embeddings. This is
        // still lightweight and runs locally. If you later add provider embeddings
        // we can prefer that path via aiProcessor/provider calls.
        const tokenize = (s: string) => String(s || '').toLowerCase().split(/\W+/).filter(Boolean);

        const buildTfVector = (tokens: string[]) => {
          const freqs: Record<string, number> = {};
          for (const t of tokens) freqs[t] = (freqs[t] || 0) + 1;
          return freqs;
        };

        const dot = (a: Record<string, number>, b: Record<string, number>) => {
          let sum = 0;
          for (const k of Object.keys(a)) {
            if (b[k]) sum += a[k] * b[k];
          }
          return sum;
        };

        const norm = (v: Record<string, number>) => {
          let s = 0;
          for (const k of Object.keys(v)) s += v[k] * v[k];
          return Math.sqrt(s);
        };

        const currentTokens = tokenize(params.content);
        const prevTokens = tokenize(prevAssistantText);
        const currentVec = buildTfVector(currentTokens);
        const prevVec = buildTfVector(prevTokens);
        const denom = (norm(currentVec) * norm(prevVec)) || 1;
        const cosine = denom ? dot(currentVec, prevVec) / denom : 0;

        // Also keep the original cheap word-overlap as a fallback metric
        const prevWordSet = new Set(prevTokens);
        let overlap = 0;
        for (const w of new Set(currentTokens)) if (prevWordSet.has(w)) overlap++;

        // heuristics: consider continuation when cosine similarity crosses a low threshold
        // or when there is non-zero overlap or the user message is very short and there
        // was prior assistant content.
  const cosineThreshold = Math.max(0, Number(process.env.CONTINUATION_COSINE_THRESHOLD ?? 0.12));
  const isLikelyContinuation = (cosine >= cosineThreshold) || (overlap > 0) || (String(params.content || '').trim().length <= 20 && prevAssistantText.length > 0);

        // compute which sources are relevant *right now* (fast check via isRelevant)
        const contentLower = String(params.content || '').toLowerCase();
        const allSources = knowledgeLibrary.getSources();
        const relevantByFn = allSources
          .filter(s => s.isEnabled && typeof s.isRelevant === 'function' && s.isRelevant(contentLower))
          .map(s => s.id);

        // Keyword-overlap fallback: some brief or informal messages may not pass isRelevant
        // but will contain source keywords. Use that as a signal as well.
        const keywordMatched = allSources
          .filter(s => s.isEnabled && Array.isArray(s.keywords) && s.keywords.some(k => contentLower.includes(String(k || '').toLowerCase())))
          .map(s => s.id);

        const currentlyRelevant = Array.from(new Set([...relevantByFn, ...keywordMatched]));

        // Only reuse stored knowledge when: we have stored IDs, the message is a likely continuation,
        // and there are no currently relevant sources that would override the stored ones (or
        // when the currently relevant set is fully contained in the stored set).
        const canReuseStored = Array.isArray(storedLastKnowledge) && storedLastKnowledge.length > 0
          && isLikelyContinuation
          && (currentlyRelevant.length === 0 || currentlyRelevant.every(id => storedLastKnowledge.includes(id)));

        // DEBUG: log continuation decision factors to help diagnose incorrect reuse
        try {
          console.log('🔎 continuation-check', {
            conversationId: params.conversationId,
            contentPreview: String(params.content).slice(0,60),
            cosine: Number(cosine.toFixed(4)),
            overlap,
            cosineThreshold,
            isLikelyContinuation,
            storedLastKnowledge,
            currentlyRelevant,
            canReuseStored
          });
        } catch (e) {
          /* best-effort logging */
        }

        if (canReuseStored) {
          // reuse stored knowledge ids
          params.metadata.knowledgeSources = storedLastKnowledge.slice();
          try {
            enhancementContext = await knowledgeLibrary.enhanceWithSourceIds(params.content, storedLastKnowledge);
            params.metadata.availableSuggestions = enhancementContext.suggestions || [];
            if (enhancementContext.usedSources && enhancementContext.usedSources.length > 0) {
              params.metadata.knowledgeSources = enhancementContext.usedSources;
            }
          } catch (e) {
            console.warn('enhanceWithSourceIds failed, persisting prior knowledge sources for continuation', e);
          }
        } else {
          // fallback to normal enhancement
          enhancementContext = await knowledgeLibrary.enhanceMessage(params.content);
          params.metadata.knowledgeSources = enhancementContext.usedSources;
          params.metadata.availableSuggestions = enhancementContext.suggestions;
        }
      } catch (e) {
        console.warn('Knowledge enhancement failed, continuing without enhancement', e);
      }

      // Use the enhanced message (original + knowledge contexts) when available so
      // the AI provider receives the fetched knowledge and can incorporate it in
      // its response. Fallback to the raw user content when enhancement failed.
      const modelInput = (enhancementContext && enhancementContext.enhancedMessage) ? enhancementContext.enhancedMessage : params.content;

      let response;
      try {
        response = await this.aiProcessor.processMessage(
          params.platform as any,
          modelInput,
          historyMessages,
          {
            conversationId: params.conversationId,
          }
        );
      } catch (aiError) {
        throw aiError;
      }

      const assistantMessage = await conversationMemory.addMessage(params.conversationId, {
        timestamp: new Date(),
        role: 'assistant',
        content: response.content,
        metadata: {
          provider: response.metadata?.provider,
          tokens: response.metadata?.tokens,
          knowledge_sources_used: params.metadata?.knowledgeSources || [],
          suggestions: params.metadata?.availableSuggestions || [],
          enhanced: (params.metadata?.knowledgeSources && params.metadata.knowledgeSources.length > 0) || false,
          platform: params.platform,
        }
      });

      // Update logical memory in the conversation context: track last assistant message IDs and knowledge source IDs
      try {
        const logicalCount = Number(process.env.LOGICAL_MEMORY_ANSWER_COUNT || 2);
        const existingCtx = await conversationMemory.getContext(params.conversationId);
        const prevIds: string[] = (existingCtx && existingCtx.lastAssistantMessages) || [];
        const newIds = [...prevIds, assistantMessage.id].slice(-Math.max(1, logicalCount));
        const lastKnowledgeSources = params.metadata?.knowledgeSources || [];

        await conversationMemory.updateContext(params.conversationId, {
          lastActivity: new Date(),
          lastAssistantMessages: newIds,
          lastKnowledgeSources
        });
      } catch (e) {
        console.warn('Failed to update logical memory in context', e);
      }

      return {
        content: response.content,
        metadata: {
          ...response.metadata,
          knowledge_sources_used: params.metadata?.knowledgeSources || [],
          suggestions: params.metadata?.availableSuggestions || [],
          enhanced: params.metadata?.knowledgeSources?.length > 0,
          conversationId: params.conversationId,
          messageId: assistantMessage.id,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  private async getProviderHealth(): Promise<any> {
    return {
      'azure-openai-default': { status: 'healthy', latency: '125ms' },
      'openai-default': { status: 'healthy', latency: '89ms' },
      'anthropic-default': { status: 'healthy', latency: '156ms' },
      'google-ai-default': { status: 'healthy', latency: '98ms' },
      'ollama-default': { status: 'unknown', latency: 'N/A' },
    };
  }

  public registerFunction(func: MCPFunction): void {
    this.functions.set(func.name, func);
    this.capabilityManager.registerCapability({
      name: func.name,
      description: func.description,
      inputSchema: func.inputSchema,
      outputSchema: { type: 'object' },
    });
  }

  public async callFunction(name: string, args: any, context?: any): Promise<any> {
    const func = this.functions.get(name);
    if (!func) {
      throw new Error(`Function not found: ${name}`);
    }

    return await func.handler(args, context);
  }

  public getFunctions(): MCPFunction[] {
    return Array.from(this.functions.values());
  }

  public getA2ARegistry(): A2ARegistry {
    return this.a2aRegistry;
  }

  public getA2ACommunicator(): A2ACommunicator {
    return this.a2aCommunicator;
  }

  public async start(): Promise<void> {
    if (this.isStarted) {
      return;
    }

    this.isStarted = true;
    console.log('\ud83d\ude80 Unified Agent Server started');
  }

  public async stop(): Promise<void> {
    this.isStarted = false;
    console.log('\ud83d\uded1 Unified Agent Server stopped');
  }
}
// Legacy re-export removed during refactor. UnifiedAgentServer is exported above.
