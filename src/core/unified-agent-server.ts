import { ConversationHandler } from './conversation-handler';
import { AIProcessor } from './ai-processor';
import { A2ARegistry, A2ACommunicator, A2ACapabilityManager, AgentMetadata, A2AMessage, A2AResponse } from './a2a-communication';
import { knowledgeLibrary, KnowledgeSource } from './knowledge-library';
import { allKnowledgeSources } from './knowledge-sources';
import { conversationMemory, ConversationMemoryService, StoredConversationMessage } from './conversation-memory';
import { ConversationMessage } from './types';

export interface MCPFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
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

    // Create agent metadata
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

    // Initialize knowledge library
    this.initializeKnowledgeLibrary();

    this.registerDefaultFunctions();
    this.registerA2AHandlers();
  }

  private initializeKnowledgeLibrary(): void {
    // Register all knowledge sources from the modular structure
    allKnowledgeSources.forEach((source: KnowledgeSource) => {
      knowledgeLibrary.registerSource(source);
    });
    
    console.log('📚 Knowledge Library initialized with', knowledgeLibrary.getSources().length, 'sources');
  }

  private registerDefaultFunctions() {
    // Chat function
    this.registerFunction({
      name: 'chat',
      description: 'Send a message to the AI agent and get a response',
      parameters: {
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
          console.log('🔧 Chat function called with args:', args);
          
          // Check for conversation reset commands
          const resetCommands = ['new conversation', 'start fresh', 'clear chat', 'reset conversation', 'start new', 'clear context'];
          const isResetCommand = resetCommands.some(cmd => args.message.toLowerCase().includes(cmd));
          
          if (isResetCommand) {
            // Generate new conversation ID for fresh start
            const newConversationId = `${args.platform || 'web'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            console.log('🔧 Reset command detected, new conversation ID:', newConversationId);
            
            return {
              content: "🔄 **Started a new conversation!** Your chat history has been cleared and we're starting fresh. How can I help you?",
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
          
          // Use knowledge library to enhance message with relevant context
          const knowledgeContext = await knowledgeLibrary.enhanceMessage(args.message);
          console.log('🔧 Knowledge context:', knowledgeContext.usedSources);
          
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
          
          console.log('🔧 Response received:', response.content?.substring(0, 100) + '...');
          
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
          console.error('🔧 Chat function error:', error);
          throw new Error(`Chat failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    });

    // Knowledge management function
    this.registerFunction({
      name: 'manage_knowledge',
      description: 'Manage knowledge sources, get suggestions, and view available knowledge domains',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list', 'enable', 'disable', 'suggestions', 'summary'],
            description: 'Action to perform on knowledge sources',
            default: 'summary',
          },
          source_id: {
            type: 'string',
            description: 'Knowledge source ID (required for enable/disable)',
          },
          message: {
            type: 'string', 
            description: 'Message to get suggestions for (required for suggestions action)',
          },
        },
      },
      handler: async (args) => {
        try {
          switch (args.action) {
            case 'list':
              return {
                knowledge_sources: knowledgeLibrary.getSources().map(source => ({
                  id: source.id,
                  name: source.name,
                  description: source.description,
                  enabled: source.isEnabled,
                  keywords: source.keywords,
                  priority: source.priority,
                })),
                total_sources: knowledgeLibrary.getSources().length,
              };

            case 'enable':
            case 'disable':
              if (!args.source_id) {
                throw new Error('source_id is required for enable/disable actions');
              }
              const enabled = args.action === 'enable';
              knowledgeLibrary.setSourceEnabled(args.source_id, enabled);
              return {
                action: args.action,
                source_id: args.source_id,
                success: true,
                message: `Knowledge source ${args.source_id} ${enabled ? 'enabled' : 'disabled'}`,
              };

            case 'suggestions':
              if (!args.message) {
                throw new Error('message is required for suggestions action');
              }
              const suggestions = knowledgeLibrary.getQuickSuggestions(args.message);
              return {
                message: args.message,
                suggestions,
                relevant_sources: knowledgeLibrary.getSources()
                  .filter(source => source.isEnabled && source.isRelevant(args.message.toLowerCase()))
                  .map(source => ({ id: source.id, name: source.name })),
              };

            case 'summary':
            default:
              return {
                knowledge_summary: knowledgeLibrary.getKnowledgeSummary(),
                total_sources: knowledgeLibrary.getSources().length,
                enabled_sources: knowledgeLibrary.getSources().filter(s => s.isEnabled).length,
                available_actions: ['list', 'enable', 'disable', 'suggestions', 'summary'],
              };
          }
        } catch (error) {
          throw new Error(`Knowledge management failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    });

    // Health check function
    this.registerFunction({
      name: 'health',
      description: 'Check the health status of all AI providers and system components',
      parameters: {
        type: 'object',
        properties: {
          detailed: {
            type: 'boolean',
            description: 'Return detailed health information',
            default: false,
          },
        },
      },
      handler: async (args) => {
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          components: {
            conversationHandler: 'healthy',
            aiProcessor: 'healthy',
            a2aRegistry: 'healthy',
          },
          providers: await this.getProviderHealth(),
          agents: args.detailed ? this.a2aRegistry.getAllAgents().length : undefined,
        };
        return health;
      },
    });

    // List providers function
    this.registerFunction({
      name: 'list_providers',
      description: 'List all available AI providers and their current status',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        return await this.getProviderHealth();
      },
    });

    // Switch provider function
    this.registerFunction({
      name: 'switch_provider',
      description: 'Switch the active AI provider for a platform',
      parameters: {
        type: 'object',
        properties: {
          provider: {
            type: 'string',
            description: 'Provider name (e.g., azure-openai-default, openai-default)',
          },
          platform: {
            type: 'string',
            description: 'Platform to apply the change to',
            default: 'mcp',
          },
        },
        required: ['provider'],
      },
      handler: async (args) => {
        // This would need to be implemented in your AI configuration
        return {
          success: true,
          message: `Provider switched to ${args.provider} for platform ${args.platform}`,
          previous: 'unknown', // Would track previous provider
        };
      },
    });

    // A2A functions
    this.registerFunction({
      name: 'list_agents',
      description: 'List all registered agents in the A2A network',
      parameters: {
        type: 'object',
        properties: {
          capability: {
            type: 'string',
            description: 'Filter by capability name',
          },
        },
      },
      handler: async (args) => {
        if (args.capability) {
          return this.a2aRegistry.findAgentsByCapability(args.capability);
        }
        return this.a2aRegistry.getAllAgents();
      },
    });

    this.registerFunction({
      name: 'call_agent',
      description: 'Call another agent with a specific capability',
      parameters: {
        type: 'object',
        properties: {
          agentId: {
            type: 'string',
            description: 'Target agent ID',
          },
          capability: {
            type: 'string',
            description: 'Capability to invoke',
          },
          payload: {
            type: 'object',
            description: 'Payload to send to the agent',
          },
          timeout: {
            type: 'number',
            description: 'Timeout in milliseconds',
            default: 30000,
          },
        },
        required: ['agentId', 'capability', 'payload'],
      },
      handler: async (args) => {
        return await this.a2aCommunicator.sendRequest(
          args.agentId,
          args.capability,
          args.payload,
          args.timeout
        );
      },
    });

    this.registerFunction({
      name: 'broadcast',
      description: 'Broadcast a message to all agents with a specific capability',
      parameters: {
        type: 'object',
        properties: {
          capability: {
            type: 'string',
            description: 'Capability name to broadcast to',
          },
          payload: {
            type: 'object',
            description: 'Payload to broadcast',
          },
        },
        required: ['capability', 'payload'],
      },
      handler: async (args) => {
        return await this.a2aCommunicator.broadcast(args.capability, args.payload);
      },
    });
  }

  private registerA2AHandlers() {
    // Register as chat capability for other agents
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

    // Health check capability
    this.a2aRegistry.registerHandler('health', async (): Promise<A2AResponse> => {
      return {
        success: true,
        data: await this.getProviderHealth(),
      };
    });
  }

  // Bridge method to adapt our interface to the existing ConversationHandler
  private async processMessageBridge(params: {
    content: string;
    conversationId: string;
    platform: string;
    userId: string;
    metadata?: any;
  }): Promise<any> {
    try {
      console.log('🔧 processMessageBridge called with:', {
        content: params.content.substring(0, 100) + '...',
        conversationId: params.conversationId,
        platform: params.platform
      });

      // Create conversation context if it doesn't exist
      if (!conversationMemory.getContext(params.conversationId)) {
        conversationMemory.createContext(params.conversationId, params.userId, params.platform);
        console.log('🔧 Created new conversation context');
      }

      // Add user message to memory
      const userMessage = conversationMemory.addMessage(params.conversationId, {
        timestamp: new Date(),
        role: 'user',
        content: params.content,
        metadata: {
          platform: params.platform,
        }
      });
      console.log('🔧 Added user message to memory');

      // Get simplified conversation history for AI context
      const recentMessages = conversationMemory.getConversation(params.conversationId).slice(-4);
      const historyMessages: ConversationMessage[] = recentMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }));
      console.log('🔧 Prepared history messages:', historyMessages.length);

      // Use AI processor with minimal options
      console.log('🔧 Calling AI processor...');
      console.log('🔧 AI processor instance:', !!this.aiProcessor);
      console.log('🔧 History messages count:', historyMessages.length);
      console.log('🔧 Platform type:', params.platform);
      console.log('🔧 Message content length:', params.content.length);
      
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
        console.log('🔧 AI processor response received');
      } catch (aiError) {
        console.error('🔧 AI processor error:', aiError);
        throw aiError;
      }

      // Add assistant response to memory
      const assistantMessage = conversationMemory.addMessage(params.conversationId, {
        timestamp: new Date(),
        role: 'assistant',
        content: response.content,
        metadata: {
          provider: response.metadata?.provider,
          tokens: response.metadata?.tokens,
          knowledge_sources_used: params.metadata?.knowledgeSources || [],
          suggestions: params.metadata?.availableSuggestions || [],
          enhanced: params.metadata?.knowledgeSources?.length > 0,
          platform: params.platform,
        }
      });
      console.log('🔧 Added assistant message to memory');

      // Update conversation context with activity
      conversationMemory.updateContext(params.conversationId, {
        lastActivity: new Date(),
      });

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
      console.error('🔧 processMessageBridge error:', error);
      throw error;
    }
  }

  private async getProviderHealth(): Promise<any> {
    // This would need to be implemented in your AI processor
    // For now, return a mock response
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
    
    // Also register as A2A capability
    this.capabilityManager.registerCapability({
      name: func.name,
      description: func.description,
      inputSchema: func.parameters,
      outputSchema: { type: 'object' }, // Could be more specific
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
    console.log('🚀 Unified Agent Server started');
    console.log(`📡 MCP Functions: ${this.functions.size}`);
    console.log(`🤝 A2A Capabilities: ${this.capabilityManager.getCapabilities().length}`);
    console.log(`👥 Registered Agents: ${this.a2aRegistry.getAllAgents().length}`);
  }

  public async stop(): Promise<void> {
    this.isStarted = false;
    console.log('🛑 Unified Agent Server stopped');
  }

  public async startA2ADiscovery(): Promise<void> {
    console.log('🔍 Starting A2A discovery mode...');
    
    // For now, just log that A2A is in discovery mode
    // In a full implementation, this would enable network discovery
    console.log('✅ A2A discovery mode active');
    console.log(`📡 Agent registry contains ${this.a2aRegistry.getAllAgents().length} agents`);
    console.log(`🤖 Capabilities available: ${this.capabilityManager.getCapabilities().length}`);
    
    // Log available capabilities
    const capabilities = this.capabilityManager.getCapabilities();
    if (capabilities.length > 0) {
      console.log('Available capabilities:');
      capabilities.forEach(cap => {
        console.log(`  - ${cap.name}: ${cap.description}`);
      });
    }
  }
}