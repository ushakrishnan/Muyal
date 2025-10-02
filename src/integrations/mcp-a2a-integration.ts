import { UnifiedAgentServer } from '../core/unified-agent-server.js';
import { ConversationHandler } from '../core/conversation-handler.js';
import { AIProcessor } from '../core/ai-processor.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

export class MCPServerIntegration {
  private server: Server;
  private unifiedServer: UnifiedAgentServer;

  constructor(unifiedServer: UnifiedAgentServer) {
    this.unifiedServer = unifiedServer;
    
    this.server = new Server(
      {
        name: 'muyal-cea',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools/functions
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const functions = this.unifiedServer.getFunctions();
      return {
        tools: functions.map(func => ({
          name: func.name,
          description: func.description,
          inputSchema: func.parameters,
        })),
      };
    });

    // Call tools/functions
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

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
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Function execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('🔗 MCP Server Integration started');
  }

  async stop() {
    await this.server.close();
    console.log('🔗 MCP Server Integration stopped');
  }
}

export class IntegratedMuyalServer {
  private conversationHandler: ConversationHandler;
  private aiProcessor: AIProcessor;
  private unifiedServer: UnifiedAgentServer;
  private mcpServer?: MCPServerIntegration;

  constructor() {
    this.conversationHandler = new ConversationHandler();
    this.aiProcessor = new AIProcessor();
    this.unifiedServer = new UnifiedAgentServer(this.conversationHandler, this.aiProcessor);
  }

  async initialize() {
    // Initialize the conversation handler
    await ConversationHandler.initialize();
    
    // Start the unified server
    await this.unifiedServer.start();

    console.log('🚀 Integrated Muyal Server initialized');
    console.log('📋 Available capabilities:');
    console.log('  - Multi-platform chat (web, m365, slack, discord)');
    console.log('  - MCP function calling');
    console.log('  - A2A agent communication');
    console.log('  - Health monitoring');
    console.log('  - Provider switching');
  }

  // Start MCP server (for external MCP clients)
  async startMCPServer() {
    if (!this.mcpServer) {
      this.mcpServer = new MCPServerIntegration(this.unifiedServer);
    }
    await this.mcpServer.start();
  }

  // Get the unified server for advanced usage
  getUnifiedServer(): UnifiedAgentServer {
    return this.unifiedServer;
  }

  // Register a custom function
  registerFunction(func: {
    name: string;
    description: string;
    parameters: any;
    handler: (args: any) => Promise<any>;
  }) {
    this.unifiedServer.registerFunction(func);
  }

  // Register another agent for A2A communication
  registerAgent(agent: {
    id: string;
    name: string;
    description: string;
    capabilities: string[];
    endpoint?: string;
  }) {
    const registry = this.unifiedServer.getA2ARegistry();
    registry.registerAgent({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      version: '1.0.0',
      capabilities: agent.capabilities.map(name => ({
        name,
        description: `${name} capability`,
        inputSchema: { type: 'object' },
        outputSchema: { type: 'object' },
      })),
      endpoints: {
        http: agent.endpoint,
      },
      status: 'online',
      lastSeen: new Date(),
    });
  }

  // Call another agent
  async callAgent(agentId: string, capability: string, payload: any) {
    const communicator = this.unifiedServer.getA2ACommunicator();
    return await communicator.sendRequest(agentId, capability, payload);
  }

  // Broadcast to all agents
  async broadcast(capability: string, payload: any) {
    const communicator = this.unifiedServer.getA2ACommunicator();
    return await communicator.broadcast(capability, payload);
  }

  async stop() {
    if (this.mcpServer) {
      await this.mcpServer.stop();
    }
    await this.unifiedServer.stop();
  }
}

// Export singleton for easy usage
export const integratedServer = new IntegratedMuyalServer();