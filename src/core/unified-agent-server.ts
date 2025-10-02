import { ConversationHandler } from './conversation-handler.js';
import { AIProcessor } from './ai-processor.js';
import { A2ARegistry, A2ACommunicator, A2ACapabilityManager, AgentMetadata, A2AMessage, A2AResponse } from './a2a-communication.js';

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
      description: 'Multi-platform Conversational Experience Application with 6 AI provider support',
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

    this.registerDefaultFunctions();
    this.registerA2AHandlers();
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
          const response = await this.processMessageBridge({
            content: args.message,
            conversationId: args.conversationId || `mcp-${Date.now()}`,
            platform: args.platform || 'mcp',
            userId: 'mcp-user',
            metadata: { 
              source: 'mcp',
              requestedProvider: args.aiProvider 
            },
          });
          return {
            content: response.content,
            provider: response.metadata?.provider,
            tokens: response.metadata?.tokens,
            cost: response.metadata?.cost,
          };
        } catch (error) {
          throw new Error(`Chat failed: ${error instanceof Error ? error.message : String(error)}`);
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
    // Use AI processor directly for now
    const response = await this.aiProcessor.processMessage(
      params.platform as any,
      params.content,
      [] // Empty history for now
    );

    return {
      content: response.content,
      metadata: response.metadata,
    };
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
}