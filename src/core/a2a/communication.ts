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

  registerAgent(agent: AgentMetadata): void {
    this.agents.set(agent.id, agent);
    console.log(`\ud83e\udd1d Registered agent: ${agent.name} (${agent.id})`);
  }

  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
    console.log(`\ud83d\udc4b Unregistered agent: ${agentId}`);
  }

  findAgentsByCapability(capability: string): AgentMetadata[] {
    return Array.from(this.agents.values()).filter(agent =>
      agent.capabilities.some(cap => cap.name === capability)
    );
  }

  getAllAgents(): AgentMetadata[] {
    return Array.from(this.agents.values());
  }

  getAgent(agentId: string): AgentMetadata | undefined {
    return this.agents.get(agentId);
  }

  registerHandler(capability: string, handler: (message: A2AMessage) => Promise<A2AResponse>): void {
    this.messageHandlers.set(capability, handler);
  }

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

    return await this.deliverMessage(message, targetAgent);
  }

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

  async broadcast(capability: string, payload: any): Promise<A2AResponse[]> {
    const targetAgents = this.registry.findAgentsByCapability(capability);
    const promises = targetAgents.map(agent =>
      this.sendRequest(agent.id, capability, payload)
    );

    return await Promise.all(promises);
  }

  private async deliverMessage(message: A2AMessage, targetAgent: AgentMetadata): Promise<A2AResponse> {
    if (message.to === this.registry['selfId']) {
      return await this.registry.handleMessage(message);
    }

    console.log(`\ud83d\udce4 Would deliver message to ${targetAgent.name}: ${message.capability}`);
    return { success: true, data: 'Message would be delivered externally' };
  }
}

export class A2ACapabilityManager {
  private capabilities: Map<string, AgentCapability> = new Map();

  registerCapability(capability: AgentCapability): void {
    this.capabilities.set(capability.name, capability);
  }

  getCapabilities(): AgentCapability[] {
    return Array.from(this.capabilities.values());
  }

  hasCapability(name: string): boolean {
    return this.capabilities.has(name);
  }

  getCapability(name: string): AgentCapability | undefined {
    return this.capabilities.get(name);
  }
}
// Legacy re-export removed during refactor. Canonical A2A implementations are above.
