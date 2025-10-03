import { integratedServer } from './mcp-a2a-integration';

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
    registerAboutUshaKrishnanFunction();
    registerEmployeeKnowledgeFunction();
    registerEmployeeSearchFunction();

    console.log('✅ MCP & A2A capabilities added successfully!');
    console.log('🎯 Available MCP functions:');
    console.log('  - chat: Send messages to the AI agent (now with smart knowledge injection)');
    console.log('  - manage_knowledge: Control knowledge sources and get suggestions');
    console.log('  - health: Check system health');
    console.log('  - list_providers: List AI providers');
    console.log('  - switch_provider: Change AI provider');
    console.log('  - get_weather: Get weather information');
    console.log('  - get_time: Get current time');
    console.log('  - get_system_info: Get system information');
    console.log('  - about_usha_krishnan: Information about Usha Krishnan');
    console.log('  - get_employees: Get all employee data from company database');
    console.log('  - search_employees: Search employees by name, salary range, or age');
    console.log('  - list_agents: List registered agents');
    console.log('  - call_agent: Call another agent');
    console.log('  - broadcast: Broadcast to all agents');

    return integratedServer;
  } catch (error) {
    console.error('❌ Failed to add MCP & A2A capabilities:', error);
    throw error;
  }
}

function registerAboutUshaKrishnanFunction() {
  integratedServer.registerFunction({
    name: 'about_usha_krishnan',
    description: 'Get information about Usha Krishnan, the creator of this agent',
    parameters: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          enum: ['overview', 'professional', 'technical', 'contact', 'all'],
          description: 'Which section of information to retrieve',
          default: 'all',
        },
      },
    },
    handler: async (args) => {
      const info = {
        name: 'Usha Krishnan',
        title: 'Technology Leader & AI Innovation Specialist',
        overview: 'Usha Krishnan is a technology leader with extensive experience in AI, cloud computing, and enterprise software development. She specializes in building innovative AI solutions and has a passion for creating intelligent systems that enhance human productivity.',
        
        professional: {
          expertise: [
            'AI & Machine Learning Solutions',
            'Cloud Architecture & Development',
            'Enterprise Software Engineering',
            'Microsoft 365 & Azure Integration',
            'Custom Engine Agents (CEA)',
            'Multi-Agent Systems'
          ],
          focus_areas: [
            'Building AI agents for Microsoft 365 Copilot',
            'Model Context Protocol (MCP) integration',
            'Agent-to-Agent (A2A) communication systems',
            'Enterprise AI automation',
            'Conversational AI interfaces'
          ],
        },
        
        technical: {
          languages: ['TypeScript', 'JavaScript', 'Python', 'C#', '.NET'],
          platforms: ['Azure', 'Microsoft 365', 'Node.js', 'Express.js'],
          specializations: [
            'Microsoft 365 Agents SDK',
            'Azure Bot Service',
            'Model Context Protocol (MCP)',
            'AI function calling interfaces',
            'Multi-platform agent deployment'
          ],
          current_project: 'Muyal - A Custom Engine Agent (CEA) for Microsoft 365 Copilot with MCP and A2A capabilities',
        },
        
        contact: {
          linkedin: 'https://linkedin.com/in/ushak',
          github: 'https://github.com/UKRepos', // Based on the repo path structure
          title: 'Technology Professional',
        },
        
        about_this_agent: {
          name: 'Muyal CEA',
          purpose: 'Custom Engine Agent built by Usha Krishnan to demonstrate advanced AI agent capabilities',
          features: [
            'Microsoft 365 Copilot integration',
            'Model Context Protocol (MCP) support',
            'Agent-to-Agent (A2A) communication',
            'Multi-platform deployment (Teams, Web, API)',
            'Function calling interface for external systems'
          ],
          repository: 'Private development repository for AI agent research and development',
        },
        
        timestamp: new Date().toISOString(),
      };

      // Return specific section or all info
      const section = args.section || 'all';
      if (section === 'all') {
        return info;
      } else if (info[section as keyof typeof info]) {
        return {
          section: section,
          data: info[section as keyof typeof info],
          timestamp: info.timestamp,
        };
      } else {
        return {
          error: `Unknown section: ${section}`,
          available_sections: ['overview', 'professional', 'technical', 'contact', 'all'],
        };
      }
    },
  });
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
        description: 'Custom Engine Agent (CEA) for Microsoft 365 Copilot',
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

async function fetchEmployeeData(): Promise<any[]> {
  try {
    const response = await fetch('https://dummy.restapiexample.com/api/v1/employees');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.status === 'success' ? data.data : [];
  } catch (error) {
    console.error('Failed to fetch employee data:', error);
    return [];
  }
}

function registerEmployeeKnowledgeFunction() {
  integratedServer.registerFunction({
    name: 'get_employees',
    description: 'Get all employee data from the company database - useful for HR queries, salary analysis, and team information',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of employees to return (default: all)',
          minimum: 1,
          maximum: 100,
        },
        include_stats: {
          type: 'boolean',
          description: 'Include salary statistics and summary',
          default: false,
        },
      },
    },
    handler: async (args) => {
      const employees = await fetchEmployeeData();
      
      if (employees.length === 0) {
        return {
          error: 'Unable to fetch employee data',
          message: 'The employee database is currently unavailable',
          timestamp: new Date().toISOString(),
        };
      }

      const limitedEmployees = args.limit ? employees.slice(0, args.limit) : employees;
      
      const result: any = {
        employees: limitedEmployees,
        total_count: employees.length,
        returned_count: limitedEmployees.length,
        timestamp: new Date().toISOString(),
      };

      if (args.include_stats) {
        const salaries = employees.map(emp => emp.employee_salary);
        const ages = employees.map(emp => emp.employee_age);
        
        result.statistics = {
          salary: {
            average: Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length),
            min: Math.min(...salaries),
            max: Math.max(...salaries),
            median: salaries.sort((a, b) => a - b)[Math.floor(salaries.length / 2)],
          },
          age: {
            average: Math.round(ages.reduce((a, b) => a + b, 0) / ages.length),
            min: Math.min(...ages),
            max: Math.max(...ages),
          },
          departments: {
            total_employees: employees.length,
            note: 'This is sample employee data for demonstration purposes',
          },
        };
      }

      return result;
    },
  });
}

function registerEmployeeSearchFunction() {
  integratedServer.registerFunction({
    name: 'search_employees',
    description: 'Search employees by name, salary range, age, or other criteria - perfect for HR queries like "find employees earning over 300k" or "who is the youngest employee"',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query (e.g., "employees over 50", "highest paid", "youngest employee")',
        },
        name: {
          type: 'string',
          description: 'Search by employee name (partial match)',
        },
        min_salary: {
          type: 'number',
          description: 'Minimum salary filter',
        },
        max_salary: {
          type: 'number',
          description: 'Maximum salary filter',
        },
        min_age: {
          type: 'number',
          description: 'Minimum age filter',
        },
        max_age: {
          type: 'number',
          description: 'Maximum age filter',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 10,
        },
      },
    },
    handler: async (args) => {
      const employees = await fetchEmployeeData();
      
      if (employees.length === 0) {
        return {
          error: 'Unable to fetch employee data',
          message: 'The employee database is currently unavailable',
        };
      }

      let filteredEmployees = [...employees];

      // Apply filters
      if (args.name) {
        const searchName = args.name.toLowerCase();
        filteredEmployees = filteredEmployees.filter(emp =>
          emp.employee_name.toLowerCase().includes(searchName)
        );
      }

      if (args.min_salary !== undefined) {
        filteredEmployees = filteredEmployees.filter(emp => emp.employee_salary >= args.min_salary);
      }

      if (args.max_salary !== undefined) {
        filteredEmployees = filteredEmployees.filter(emp => emp.employee_salary <= args.max_salary);
      }

      if (args.min_age !== undefined) {
        filteredEmployees = filteredEmployees.filter(emp => emp.employee_age >= args.min_age);
      }

      if (args.max_age !== undefined) {
        filteredEmployees = filteredEmployees.filter(emp => emp.employee_age <= args.max_age);
      }

      // Handle natural language queries
      if (args.query) {
        const query = args.query.toLowerCase();
        
        if (query.includes('highest paid') || query.includes('most expensive') || query.includes('richest')) {
          filteredEmployees.sort((a, b) => b.employee_salary - a.employee_salary);
        } else if (query.includes('lowest paid') || query.includes('cheapest') || query.includes('least salary')) {
          filteredEmployees.sort((a, b) => a.employee_salary - b.employee_salary);
        } else if (query.includes('youngest')) {
          filteredEmployees.sort((a, b) => a.employee_age - b.employee_age);
        } else if (query.includes('oldest')) {
          filteredEmployees.sort((a, b) => b.employee_age - a.employee_age);
        } else if (query.includes('over') && query.includes('salary')) {
          // Extract number from "over 300k" or "over 300000"
          const match = query.match(/over\s+(\d+)([k]?)/);
          if (match) {
            const amount = parseInt(match[1]) * (match[2] === 'k' ? 1000 : 1);
            filteredEmployees = filteredEmployees.filter(emp => emp.employee_salary > amount);
          }
        } else if (query.includes('under') && query.includes('age')) {
          // Extract number from "under 30"
          const match = query.match(/under\s+(\d+)/);
          if (match) {
            const age = parseInt(match[1]);
            filteredEmployees = filteredEmployees.filter(emp => emp.employee_age < age);
          }
        }
      }

      // Apply limit
      const limitedResults = filteredEmployees.slice(0, args.limit || 10);

      return {
        query: args.query || 'Custom filter',
        filters_applied: {
          name: args.name,
          salary_range: args.min_salary || args.max_salary ? `${args.min_salary || 0} - ${args.max_salary || 'unlimited'}` : null,
          age_range: args.min_age || args.max_age ? `${args.min_age || 0} - ${args.max_age || 'unlimited'}` : null,
        },
        results: limitedResults,
        total_matches: filteredEmployees.length,
        returned_count: limitedResults.length,
        timestamp: new Date().toISOString(),
      };
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

/**
 * Start A2A server in standalone mode
 * This enables agent discovery and inter-agent communication
 */
export async function startA2AServer() {
  try {
    console.log('🌐 Starting A2A (Agent-to-Agent) Communication Server...');
    
    // Initialize if not already done
    if (!integratedServer) {
      await addMCPandA2ACapabilities();
    }
    
    // Enable A2A discovery mode
    const unifiedServer = integratedServer.getUnifiedServer();
    if (typeof (unifiedServer as any).startA2ADiscovery === 'function') {
      await (unifiedServer as any).startA2ADiscovery();
    } else {
      console.log('A2A discovery not available on this UnifiedAgentServer build; skipping');
    }
    
    console.log('✅ A2A server started successfully');
    console.log('🤖 Agent discovery and inter-agent communication active');
    console.log('📡 Listening for agent registration and communication requests');
    
    // Keep the process alive
    process.stdin.resume();
    
  } catch (error) {
    console.error('❌ Failed to start A2A server:', error);
    process.exit(1);
  }
}
// Note: no top-level re-export — keep references to the single implementation in src/integrations/mcp/
