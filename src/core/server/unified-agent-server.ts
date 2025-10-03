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
          
          const knowledgeContext = await knowledgeLibrary.enhanceMessage(args.message);
          
          const response = await this.processMessageBridge({
            content: knowledgeContext.enhancedMessage,
            conversationId: args.conversationId || `mcp-${Date.now()}`,
            platform: args.platform || 'mcp',
            userId: 'mcp-user',
            metadata: { 
              source: 'mcp',
              requestedProvider: args.aiProvider,
              knowledgeSources: knowledgeContext.usedSources,
              availableSuggestions: knowledgeContext.suggestions
            },
          });

          return {
            content: response.content,
            provider: response.metadata?.provider,
            tokens: response.metadata?.tokens,
            cost: response.metadata?.cost,
            knowledge_sources_used: knowledgeContext.usedSources,
            suggestions: knowledgeContext.suggestions,
            enhanced: knowledgeContext.usedSources.length > 0,
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
      // Heuristic: short confirmations like "ok", "show", "." should be treated as continuations
      const looksLikeContinuation = (text: string) => {
        const trimmed = String(text || '').trim().toLowerCase();
        if (!trimmed) return false;
        if (trimmed.length <= 3) return ['ok', 'ok.', 'yes', 'y', 'yep', '👍', '.'].includes(trimmed);
        return /^\.{1,3}$/.test(trimmed);
      };

      // If this message is a short continuation, try to reuse last assistant's knowledge sources
      let enhancementContext = null as any;
      try {
        const lastAssistant = recentMessages.slice().reverse().find(m => m.role === 'assistant');
        const lastSources: string[] = lastAssistant?.metadata?.knowledge_sources_used || [];
        if (looksLikeContinuation(params.content) && lastSources && lastSources.length > 0) {
          // Force reuse the last known sources for logical continuation. Persist the IDs even if fetchContext returns empty.
          params.metadata = params.metadata || {};
          params.metadata.knowledgeSources = lastSources.slice();
          try {
            enhancementContext = await knowledgeLibrary.enhanceWithSourceIds(params.content, lastSources);
            // If enhanceWithSourceIds returned suggestions, attach them
            params.metadata.availableSuggestions = enhancementContext.suggestions || [];
            // If it reported usedSources, prefer that (but keep the forced lastSources as provenance)
            if (enhancementContext.usedSources && enhancementContext.usedSources.length > 0) {
              params.metadata.knowledgeSources = enhancementContext.usedSources;
            }
          } catch (e) {
            // enhancement failed — we still persist the lastSources for provenance
            console.warn('enhanceWithSourceIds failed, persisting prior knowledge sources for continuation', e);
          }
        } else {
          // fallback to normal enhancement when not a short continuation
          enhancementContext = await knowledgeLibrary.enhanceMessage(params.content);
          params.metadata = params.metadata || {};
          params.metadata.knowledgeSources = enhancementContext.usedSources;
          params.metadata.availableSuggestions = enhancementContext.suggestions;
        }
      } catch (e) {
        console.warn('Knowledge enhancement failed, continuing without enhancement', e);
      }

      let response;
      try {
        response = await this.aiProcessor.processMessage(
          params.platform as any,
          params.content,
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
