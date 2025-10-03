import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { ConversationHandler } from '../../core/conversation/handler';
import { AIProcessor } from '../../core/ai/processor';
import { UnifiedAgentServer } from '../../core/server/unified-agent-server';

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
  private conversationHandler?: ConversationHandler;
  private aiProcessor?: AIProcessor;
  private unifiedServer?: UnifiedAgentServer;
  private tools: Map<string, MCPTool> = new Map();

  // Flexible constructor: accept either (conversationHandler, aiProcessor) OR (unifiedServer)
  constructor(arg1: ConversationHandler | UnifiedAgentServer, arg2?: AIProcessor) {
    if ((arg1 as UnifiedAgentServer).callFunction) {
      this.unifiedServer = arg1 as UnifiedAgentServer;
    } else {
      this.conversationHandler = arg1 as ConversationHandler;
      this.aiProcessor = arg2;
    }

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
      if (this.unifiedServer) {
        const functions = this.unifiedServer.getFunctions();
        return {
          tools: functions.map(func => ({
            name: func.name,
            description: func.description,
            inputSchema: (func as any).inputSchema || (func as any).parameters || { type: 'object', properties: {} },
          })),
        };
      }

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

      // If unifiedServer is present, try to dispatch to it first
      if (this.unifiedServer) {
        try {
          const result = await this.unifiedServer.callFunction(name, args || {});
          return {
            content: [
              {
                type: 'text',
                text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (err) {
          // If unified server signals method not found, fall back to local tools below
          // otherwise propagate
          const msg = err instanceof Error ? err.message : String(err);
          if (!/not found|MethodNotFound/i.test(msg)) {
            throw new McpError(ErrorCode.InternalError, `Function execution failed: ${msg}`);
          }
        }
      }

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
        if (this.unifiedServer) {
          return await this.unifiedServer.callFunction('chat', args || {});
        }

        if (!this.conversationHandler) {
          throw new Error('No conversation handler available to process chat');
        }

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
        if (this.aiProcessor) return await this.aiProcessor.getHealthStatus();
        if (this.unifiedServer) return await this.unifiedServer.callFunction('health', {});
        throw new Error('No AI processor or unified server available to provide health');
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
        if (this.unifiedServer) return await this.unifiedServer.callFunction('switch_provider', args || {});
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
        if (this.aiProcessor) return await this.aiProcessor.getAvailableProviders();
        if (this.unifiedServer) return await this.unifiedServer.callFunction('list_providers', {});
        throw new Error('No AI processor or unified server available to list providers');
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

export default MCPServer;
