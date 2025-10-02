import { integratedServer } from '../integrations/mcp-a2a-integration.js';

/**
 * Add MCP and A2A capabilities to your existing Muyal application
 * Call this after your main server is initialized
 */
export async function addMCPandA2ACapabilities() {
  try {
    console.log('🔗 Adding MCP & A2A capabilities to Muyal...');

    // Initialize the integrated server
    await integratedServer.initialize();

    // Register some useful functions for external agents
    registerWeatherFunction();
    registerTimeFunction();
    registerSystemInfoFunction();

    console.log('✅ MCP & A2A capabilities added successfully!');
    console.log('🎯 Available MCP functions:');
    console.log('  - chat: Send messages to the AI agent');
    console.log('  - health: Check system health');
    console.log('  - list_providers: List AI providers');
    console.log('  - switch_provider: Change AI provider');
    console.log('  - get_weather: Get weather information');
    console.log('  - get_time: Get current time');
    console.log('  - get_system_info: Get system information');
    console.log('  - list_agents: List registered agents');
    console.log('  - call_agent: Call another agent');
    console.log('  - broadcast: Broadcast to all agents');

    return integratedServer;
  } catch (error) {
    console.error('❌ Failed to add MCP & A2A capabilities:', error);
    throw error;
  }
}

function registerWeatherFunction() {
  integratedServer.registerFunction({
    name: 'get_weather',
    description: 'Get current weather information for a specified location',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The city or location to get weather for',
        },
        units: {
          type: 'string',
          enum: ['celsius', 'fahrenheit'],
          description: 'Temperature unit preference',
          default: 'celsius',
        },
      },
      required: ['location'],
    },
    handler: async (args) => {
      // This could integrate with a real weather API
      const mockWeatherData = {
        location: args.location,
        temperature: Math.floor(Math.random() * 30) + 5, // 5-35 range
        units: args.units || 'celsius',
        condition: ['sunny', 'cloudy', 'rainy', 'snowy'][Math.floor(Math.random() * 4)],
        humidity: Math.floor(Math.random() * 40) + 40, // 40-80 range
        windSpeed: Math.floor(Math.random() * 20) + 5, // 5-25 range
        forecast: 'Weather conditions are expected to remain stable for the next 24 hours.',
        timestamp: new Date().toISOString(),
      };

      return mockWeatherData;
    },
  });
}

function registerTimeFunction() {
  integratedServer.registerFunction({
    name: 'get_time',
    description: 'Get current time and date information',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'Timezone (e.g., America/New_York, Europe/London)',
          default: 'UTC',
        },
        format: {
          type: 'string',
          enum: ['iso', 'human', 'timestamp'],
          description: 'Output format preference',
          default: 'human',
        },
      },
    },
    handler: async (args) => {
      const now = new Date();
      const timezone = args.timezone || 'UTC';
      
      let formattedTime;
      switch (args.format) {
        case 'iso':
          formattedTime = now.toISOString();
          break;
        case 'timestamp':
          formattedTime = now.getTime().toString();
          break;
        default: // human
          formattedTime = now.toLocaleString('en-US', {
            timeZone: timezone === 'UTC' ? 'UTC' : timezone,
            dateStyle: 'full',
            timeStyle: 'long',
          });
      }

      return {
        time: formattedTime,
        timezone: timezone,
        format: args.format || 'human',
        timestamp: now.getTime(),
        iso: now.toISOString(),
      };
    },
  });
}

function registerSystemInfoFunction() {
  integratedServer.registerFunction({
    name: 'get_system_info',
    description: 'Get system information about the Muyal agent',
    parameters: {
      type: 'object',
      properties: {
        includeProviders: {
          type: 'boolean',
          description: 'Include AI provider status',
          default: true,
        },
        includeStats: {
          type: 'boolean',
          description: 'Include usage statistics',
          default: false,
        },
      },
    },
    handler: async (args) => {
      const info = {
        name: 'Muyal CEA',
        version: '1.0.0',
        description: 'Multi-platform Conversational Experience Application',
        platform: process.platform,
        nodeVersion: process.version,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        capabilities: [
          'multi-platform-chat',
          'ai-provider-switching',
          'mcp-functions',
          'a2a-communication',
          'health-monitoring',
          'observability',
        ],
        supportedPlatforms: ['microsoft365', 'web', 'slack', 'discord'],
        timestamp: new Date().toISOString(),
      };

      if (args.includeProviders) {
        // Get provider info from the unified server
        const unifiedServer = integratedServer.getUnifiedServer();
        try {
          const providers = await unifiedServer.callFunction('list_providers', {});
          (info as any).providers = providers;
        } catch (error) {
          (info as any).providers = 'unavailable';
        }
      }

      if (args.includeStats) {
        // Mock usage stats - you could integrate with real analytics
        (info as any).stats = {
          totalMessages: Math.floor(Math.random() * 10000),
          totalConversations: Math.floor(Math.random() * 1000),
          totalAgents: 3, // Including this agent
          avgResponseTime: '234ms',
        };
      }

      return info;
    },
  });
}

/**
 * Start MCP server (for external MCP clients like Claude Desktop)
 */
export async function startMCPServer() {
  await integratedServer.startMCPServer();
  console.log('🔌 MCP Server started - ready for external MCP clients');
}

/**
 * Register an external agent for A2A communication
 */
export function registerExternalAgent(agent: {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  endpoint?: string;
}) {
  integratedServer.registerAgent(agent);
  console.log(`🤖 Registered external agent: ${agent.name}`);
}

/**
 * Call another agent via A2A
 */
export async function callAgent(agentId: string, capability: string, payload: any) {
  return await integratedServer.callAgent(agentId, capability, payload);
}

/**
 * Broadcast to all agents
 */
export async function broadcastToAgents(capability: string, payload: any) {
  return await integratedServer.broadcast(capability, payload);
}

/**
 * Get the unified server instance for advanced usage
 */
export function getUnifiedServer() {
  return integratedServer.getUnifiedServer();
}