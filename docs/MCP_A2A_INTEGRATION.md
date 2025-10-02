# MCP and A2A Integration Guide

This guide explains how Muyal CEA supports **Model Context Protocol (MCP)** and **Agent-to-Agent (A2A)** communication, enabling it to be called by external systems and communicate with other agents.

## 🔍 Overview

### What This Adds to Muyal
- **MCP Server**: Exposes Muyal's capabilities as callable functions via the Model Context Protocol
- **A2A Communication**: Enables Muyal to discover, register, and communicate with other AI agents
- **Function Registry**: Extensible system for adding custom capabilities
- **Agent Discovery**: Automatic registration and discovery of agents in the network

## 🚀 Quick Start

### 1. Enable MCP & A2A in Your Application

Add this to your main `src/index.ts` after your server initialization:

```typescript
import { addMCPandA2ACapabilities } from './integrations/mcp-a2a-addon.js';

// After your existing server setup
async function enhanceWithMCPandA2A() {
  try {
    await addMCPandA2ACapabilities();
    console.log('✅ Muyal now supports MCP and A2A!');
  } catch (error) {
    console.error('Failed to add MCP/A2A:', error);
  }
}

enhanceWithMCPandA2A();
```

### 2. Test MCP Functions

```bash
# Test the integration
npm run test:mcp

# Run MCP demo
npm run mcp
```

### 3. Start MCP Server (for external clients)

```bash
# Start standalone MCP server
npm run mcp:server
```

## 🔧 Available MCP Functions

Once enabled, Muyal exposes these functions via MCP:

### Core Functions
- **`chat`** - Send messages to the AI agent
- **`health`** - Check system and provider health
- **`list_providers`** - List available AI providers
- **`switch_provider`** - Change active AI provider

### Utility Functions
- **`get_weather`** - Get weather information
- **`get_time`** - Get current time/date
- **`get_system_info`** - Get system information

### A2A Functions
- **`list_agents`** - List registered agents
- **`call_agent`** - Call another agent
- **`broadcast`** - Broadcast to all agents

## 🤝 Agent-to-Agent Communication

### Register External Agents

```typescript
import { registerExternalAgent } from './integrations/mcp-a2a-addon.js';

// Register a calendar agent
registerExternalAgent({
  id: 'calendar-agent',
  name: 'Calendar Assistant',
  description: 'Manages scheduling and calendar events',
  capabilities: ['schedule_meeting', 'get_availability', 'list_events'],
  endpoint: 'http://localhost:4000'
});
```

### Call Other Agents

```typescript
import { callAgent } from './integrations/mcp-a2a-addon.js';

// Call the calendar agent
const result = await callAgent('calendar-agent', 'schedule_meeting', {
  title: 'Team Standup',
  date: '2024-12-10',
  time: '09:00',
  participants: ['user1@company.com', 'user2@company.com']
});
```

### Broadcast Messages

```typescript
import { broadcastToAgents } from './integrations/mcp-a2a-addon.js';

// Broadcast a status update to all agents
const responses = await broadcastToAgents('status_update', {
  event: 'system_maintenance',
  scheduled: '2024-12-15T02:00:00Z',
  duration: '2 hours'
});
```

## 📝 Custom Function Development

### Add Custom MCP Functions

```typescript
import { getUnifiedServer } from './integrations/mcp-a2a-addon.js';

const server = getUnifiedServer();

// Register a custom function
server.registerFunction({
  name: 'analyze_document',
  description: 'Analyze a document and extract insights',
  parameters: {
    type: 'object',
    properties: {
      document_url: {
        type: 'string',
        description: 'URL to the document to analyze'
      },
      analysis_type: {
        type: 'string',
        enum: ['summary', 'sentiment', 'entities', 'topics'],
        description: 'Type of analysis to perform'
      }
    },
    required: ['document_url', 'analysis_type']
  },
  handler: async (args) => {
    // Your custom logic here
    const analysis = await performDocumentAnalysis(args.document_url, args.analysis_type);
    return {
      document: args.document_url,
      type: args.analysis_type,
      results: analysis,
      timestamp: new Date().toISOString()
    };
  }
});
```

## 🔌 MCP Client Integration

### Claude Desktop Integration

Add this to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "muyal": {
      "command": "node",
      "args": ["path/to/muyal/lib/src/integrations/mcp-server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Python MCP Client

```python
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def call_muyal():
    server_params = StdioServerParameters(
        command="node",
        args=["path/to/muyal/lib/src/integrations/mcp-server.js"]
    )
    
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize
            await session.initialize()
            
            # List available tools
            tools = await session.list_tools()
            print("Available tools:", [tool.name for tool in tools.tools])
            
            # Call the chat function
            result = await session.call_tool("chat", {
                "message": "Hello from Python MCP client!",
                "platform": "mcp-python"
            })
            
            print("Response:", result.content[0].text)

# Run the client
asyncio.run(call_muyal())
```

## 🌐 Network Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   External      │    │   Muyal CEA     │    │   Calendar      │
│   MCP Client    │◄──►│                 │◄──►│   Agent         │
│   (Claude)      │    │   MCP Server    │    │                 │
└─────────────────┘    │   A2A Hub       │    └─────────────────┘
                       │                 │    
┌─────────────────┐    │                 │    ┌─────────────────┐
│   Email         │◄──►│                 │◄──►│   Slack         │
│   Agent         │    │                 │    │   Agent         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔒 Security Considerations

### Authentication
- Add authentication to A2A endpoints in production
- Use secure channels (HTTPS/WSS) for external communication
- Validate agent identities and capabilities

### Function Security
```typescript
// Add authentication to sensitive functions
server.registerFunction({
  name: 'admin_function',
  description: 'Administrative function',
  parameters: { /* ... */ },
  handler: async (args, context) => {
    // Check authentication
    if (!context?.authenticated || !context?.hasRole('admin')) {
      throw new Error('Unauthorized');
    }
    
    // Your secure logic here
    return await performAdminOperation(args);
  }
});
```

## 📊 Monitoring & Observability

### Function Call Metrics
```typescript
// Monitor function calls
server.registerFunction({
  name: 'monitored_function',
  description: 'Function with monitoring',
  parameters: { /* ... */ },
  handler: async (args) => {
    const startTime = Date.now();
    
    try {
      const result = await yourFunction(args);
      
      // Log success metrics
      console.log('Function call successful', {
        function: 'monitored_function',
        duration: Date.now() - startTime,
        args: args
      });
      
      return result;
    } catch (error) {
      // Log error metrics
      console.error('Function call failed', {
        function: 'monitored_function',
        duration: Date.now() - startTime,
        error: error.message
      });
      throw error;
    }
  }
});
```

### A2A Network Health
```typescript
// Monitor agent health
setInterval(async () => {
  const agents = await server.callFunction('list_agents', {});
  const healthChecks = await Promise.allSettled(
    agents.map(agent => 
      callAgent(agent.id, 'health', {})
    )
  );
  
  console.log('Network health:', {
    totalAgents: agents.length,
    healthyAgents: healthChecks.filter(check => 
      check.status === 'fulfilled' && check.value.success
    ).length
  });
}, 60000); // Check every minute
```

## 🧪 Testing

### Unit Tests for Functions
```typescript
import { getUnifiedServer } from '../integrations/mcp-a2a-addon.js';

describe('MCP Functions', () => {
  let server;
  
  beforeAll(async () => {
    server = getUnifiedServer();
    await server.start();
  });
  
  test('weather function returns valid data', async () => {
    const result = await server.callFunction('get_weather', {
      location: 'San Francisco',
      units: 'celsius'
    });
    
    expect(result.location).toBe('San Francisco');
    expect(result.units).toBe('celsius');
    expect(typeof result.temperature).toBe('number');
  });
  
  test('chat function processes messages', async () => {
    const result = await server.callFunction('chat', {
      message: 'Hello, test message',
      platform: 'test'
    });
    
    expect(result.content).toBeDefined();
    expect(typeof result.content).toBe('string');
  });
});
```

## 🚀 Production Deployment

### Environment Configuration
```bash
# Production .env settings
MCP_ENABLED=true
A2A_ENABLED=true
AGENT_ID=muyal-prod-001
A2A_NETWORK_TIMEOUT=30000
A2A_HEARTBEAT_INTERVAL=30000
```

### Docker Integration
```dockerfile
# Add to your Dockerfile
EXPOSE 3978 3979 3980

# Install MCP dependencies
RUN npm install @modelcontextprotocol/sdk

# Copy MCP configuration
COPY .env.mcp-a2a.example .env.mcp-a2a
```

### Load Balancing
- Use sticky sessions for A2A connections
- Load balance MCP requests across instances
- Implement agent failover mechanisms

## 📚 Further Reading

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Agent Communication Patterns](https://en.wikipedia.org/wiki/Agent_communication_language)
- [Muyal Architecture Guide](./ARCHITECTURE.md)

## 🆘 Troubleshooting

### Common Issues

**MCP Server Not Starting**
```bash
# Check if port is available
netstat -an | findstr :3979

# Test MCP server directly
npm run mcp:server
```

**A2A Agents Not Discovering**
```bash
# Check network connectivity
curl http://localhost:3980/health

# Verify agent registration
npm run test:mcp
```

**Function Calls Failing**
```typescript
// Add debug logging
server.registerFunction({
  name: 'debug_function',
  handler: async (args) => {
    console.log('Function called with:', args);
    try {
      const result = await yourLogic(args);
      console.log('Function result:', result);
      return result;
    } catch (error) {
      console.error('Function error:', error);
      throw error;
    }
  }
});
```

---

🐰 **Ready to make Muyal talk to everyone?** Follow this guide to enable powerful MCP and A2A capabilities!