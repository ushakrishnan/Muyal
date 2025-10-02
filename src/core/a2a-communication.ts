export interface AgentCapability {
  name: string;
  description: string;
  inputSchema: any;
  outputSchema: any;
}

export interface AgentMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: AgentCapability[];
  endpoints: {
    mcp?: string;
    http?: string;
    websocket?: string;
  };
  status: 'online' | 'offline' | 'busy';
  lastSeen: Date;
}

export interface A2AMessage {
  id: string;
  from: string;
  to: string;
  type: 'request' | 'response' | 'notification';
  capability?: string;
  payload: any;
  timestamp: Date;
  correlationId?: string;
}

export interface A2AResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: any;
}

export class A2ARegistry {
  private agents: Map<string, AgentMetadata> = new Map();
  private messageHandlers: Map<string, (message: A2AMessage) => Promise<A2AResponse>> = new Map();

  constructor(private selfId: string, private selfMetadata: AgentMetadata) {
    this.agents.set(selfId, selfMetadata);
  }

  // Register another agent
  registerAgent(agent: AgentMetadata): void {
    this.agents.set(agent.id, agent);
    console.log(`🤝 Registered agent: ${agent.name} (${agent.id})`);
  }

  // Unregister an agent
  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
    console.log(`👋 Unregistered agent: ${agentId}`);
  }

  // Find agents by capability
  findAgentsByCapability(capability: string): AgentMetadata[] {
    return Array.from(this.agents.values()).filter(agent =>
      agent.capabilities.some(cap => cap.name === capability)
    );
  }

  // Get all registered agents
  getAllAgents(): AgentMetadata[] {
    return Array.from(this.agents.values());
  }

  // Get agent by ID
  getAgent(agentId: string): AgentMetadata | undefined {
    return this.agents.get(agentId);
  }

  // Register a message handler for a capability
  registerHandler(capability: string, handler: (message: A2AMessage) => Promise<A2AResponse>): void {
    this.messageHandlers.set(capability, handler);
  }

  // Handle incoming message
  async handleMessage(message: A2AMessage): Promise<A2AResponse> {
    if (!message.capability) {
      return { success: false, error: 'No capability specified' };
    }

    const handler = this.messageHandlers.get(message.capability);
    if (!handler) {
      return { success: false, error: `No handler for capability: ${message.capability}` };
    }

    try {
      return await handler(message);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

export class A2ACommunicator {
  private registry: A2ARegistry;
  private messageCounter = 0;

  constructor(registry: A2ARegistry) {
    this.registry = registry;
  }

  // Send a request to another agent
  async sendRequest(
    targetAgentId: string,
    capability: string,
    payload: any,
    timeout: number = 30000
  ): Promise<A2AResponse> {
    const targetAgent = this.registry.getAgent(targetAgentId);
    if (!targetAgent) {
      return { success: false, error: `Agent not found: ${targetAgentId}` };
    }

    const message: A2AMessage = {
      id: `msg_${++this.messageCounter}`,
      from: this.registry['selfId'],
      to: targetAgentId,
      type: 'request',
      capability,
      payload,
      timestamp: new Date(),
    };

    // In a real implementation, this would send over network
    // For now, we'll simulate local delivery
    return await this.deliverMessage(message, targetAgent);
  }

  // Send a notification (fire and forget)
  async sendNotification(
    targetAgentId: string,
    capability: string,
    payload: any
  ): Promise<void> {
    const targetAgent = this.registry.getAgent(targetAgentId);
    if (!targetAgent) {
      console.warn(`Cannot send notification to unknown agent: ${targetAgentId}`);
      return;
    }

    const message: A2AMessage = {
      id: `notif_${++this.messageCounter}`,
      from: this.registry['selfId'],
      to: targetAgentId,
      type: 'notification',
      capability,
      payload,
      timestamp: new Date(),
    };

    await this.deliverMessage(message, targetAgent);
  }

  // Broadcast to all agents with a capability
  async broadcast(capability: string, payload: any): Promise<A2AResponse[]> {
    const targetAgents = this.registry.findAgentsByCapability(capability);
    const promises = targetAgents.map(agent =>
      this.sendRequest(agent.id, capability, payload)
    );

    return await Promise.all(promises);
  }

  private async deliverMessage(message: A2AMessage, targetAgent: AgentMetadata): Promise<A2AResponse> {
    // In a real implementation, this would use the agent's endpoints
    // For local delivery, we use the registry
    if (message.to === this.registry['selfId']) {
      return await this.registry.handleMessage(message);
    }

    // For external agents, we'd implement actual network communication
    // This is a placeholder for HTTP/WebSocket/MCP delivery
    console.log(`📤 Would deliver message to ${targetAgent.name}: ${message.capability}`);
    return { success: true, data: 'Message would be delivered externally' };
  }
}

export class A2ACapabilityManager {
  private capabilities: Map<string, AgentCapability> = new Map();

  // Register a capability
  registerCapability(capability: AgentCapability): void {
    this.capabilities.set(capability.name, capability);
  }

  // Get all capabilities
  getCapabilities(): AgentCapability[] {
    return Array.from(this.capabilities.values());
  }

  // Check if capability exists
  hasCapability(name: string): boolean {
    return this.capabilities.has(name);
  }

  // Get capability by name
  getCapability(name: string): AgentCapability | undefined {
    return this.capabilities.get(name);
  }
}