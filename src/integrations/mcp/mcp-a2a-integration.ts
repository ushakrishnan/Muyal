import { UnifiedAgentServer } from '../../core/server/unified-agent-server';
import { ConversationHandler } from '../../core/conversation/handler';
import { AIProcessor } from '../../core/ai/processor';
import A2AClient from '../a2a/a2a-client';

export class IntegratedMuyalServer {
  private conversationHandler: ConversationHandler;
  private aiProcessor: AIProcessor;
  private unifiedServer: UnifiedAgentServer;
  private a2aClient?: A2AClient;
  private mcpServer: any;

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

    // Create default A2A client (no remote baseUrl by default)
    this.a2aClient = new A2AClient({ timeoutMs: 5000, maxRetries: 1 });

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
      try {
        // lazy-load MCP server implementation; it may be optional or not present in some setups
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('./mcp-server');
        const MCPServerImpl = mod && (mod.MCPServer || mod.default || mod);
        if (!MCPServerImpl) throw new Error('No MCPServer export found');
        this.mcpServer = new MCPServerImpl(this.unifiedServer);
      } catch (err: any) {
        console.warn('MCP server implementation not available, MCP features disabled:', err && err.message ? err.message : String(err));
        return; // gracefully do nothing if MCP server isn't available
      }
    }

    if (this.mcpServer && typeof this.mcpServer.start === 'function') {
      await this.mcpServer.start();
    }
  }

  // Get the unified server for advanced usage
  getUnifiedServer(): UnifiedAgentServer {
    return this.unifiedServer;
  }

  // Get or create an A2A client for outbound agent-to-agent calls
  getA2AClient(): A2AClient {
    if (!this.a2aClient) this.a2aClient = new A2AClient({ timeoutMs: 5000, maxRetries: 1 });
    return this.a2aClient;
  }

  // Register a custom function
  registerFunction(func: {
    name: string;
    description: string;
    parameters: any;
    handler: (args: any) => Promise<any>;
  }) {
    // Accept the lightweight registration shape used by integrations and convert
    // to the canonical MCPFunction shape expected by UnifiedAgentServer.
    const mf = {
      name: func.name,
      description: func.description,
      inputSchema: func.parameters,
      handler: func.handler,
    } as any;
    this.unifiedServer.registerFunction(mf);
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
