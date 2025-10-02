import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { ConversationHandler } from './conversation-handler.js';
import { AIProcessor } from './ai-processor.js';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  handler: (args: any) => Promise<any>;
}

export class MCPServer {
  private server: Server;
  private conversationHandler: ConversationHandler;
  private aiProcessor: AIProcessor;
  private tools: Map<string, MCPTool> = new Map();

  constructor(conversationHandler: ConversationHandler, aiProcessor: AIProcessor) {
    this.conversationHandler = conversationHandler;
    this.aiProcessor = aiProcessor;
    
    this.server = new Server(
      {
        name: 'muyal-cea',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
    this.registerDefaultTools();
  }

  private setupHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Array.from(this.tools.values()).map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      const tool = this.tools.get(name);
      if (!tool) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Tool "${name}" not found`
        );
      }

      try {
        const result = await tool.handler(args || {});
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private registerDefaultTools() {
    // Chat tool
    this.registerTool({
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
            description: 'Platform identifier (web, m365, etc.)',
            default: 'mcp',
          },
        },
        required: ['message'],
      },
      handler: async (args) => {
        const response = await this.conversationHandler.handleMessage({
          content: args.message,
          conversationId: args.conversationId || 'mcp-session',
          platform: args.platform || 'mcp',
          userId: 'mcp-user',
          metadata: { source: 'mcp' },
        });
        return response.content;
      },
    });

    // Health check tool
    this.registerTool({
      name: 'health',
      description: 'Check the health status of all AI providers',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        const health = await this.aiProcessor.getHealthStatus();
        return health;
      },
    });

    // Provider switch tool
    this.registerTool({
      name: 'switch_provider',
      description: 'Switch the active AI provider for the session',
      inputSchema: {
        type: 'object',
        properties: {
          provider: {
            type: 'string',
            description: 'Provider name (azure-openai-default, openai-default, etc.)',
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
        // This would need implementation in the AI processor
        return `Switched to provider: ${args.provider} for platform: ${args.platform || 'mcp'}`;
      },
    });

    // List providers tool
    this.registerTool({
      name: 'list_providers',
      description: 'List all available AI providers and their status',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        const providers = await this.aiProcessor.getAvailableProviders();
        return providers;
      },
    });
  }

  public registerTool(tool: MCPTool) {
    this.tools.set(tool.name, tool);
  }

  public async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('🔗 Muyal MCP Server started');
  }

  public async stop() {
    await this.server.close();
  }
}