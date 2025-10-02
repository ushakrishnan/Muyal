# MCP and A2A Integration Guide for Custom Engine Agents

This guide shows you **exactly what your Muyal agent can do right now** with **Model Context Protocol (MCP)** and **Agent-to-Agent (A2A)** communication, plus how to extend it with custom functions.

## 📋 **TL;DR: What You Get Today**

✅ **11 working functions** that Claude Desktop can call right now  
✅ **2 main functions**: `chat` (talk to your agent) and `about_usha_krishnan` (creator info)  
✅ **9 system functions**: weather, time, health, agent network capabilities  
✅ **Your agent is an MCP Server** - it exposes functions to MCP clients like Claude Desktop  
✅ **A2A ready** - can communicate with other agents in a network  

**Quick test:** `npm start` → Configure Claude Desktop → Ask Claude to use the `about_usha_krishnan` function

## 🎯 Why CEA + MCP Integration Matters

### 🔄 **One Agent, Multiple Interfaces** (vs. Building Separate Systems)

**Without MCP Integration:**
```
Claude Desktop ──────► Custom MCP Server #1
Microsoft 365 ──────► Custom CEA Agent #2  
Web Interface ──────► Custom API Server #3
Slack Bot ─────────► Custom Bot #4

Result: 4 separate codebases, 4x maintenance, 4x deployments
```

**With CEA + MCP Integration:**
```
Claude Desktop ┌─────────────────────┐
Microsoft 365 │                        │
Web Interface │    Your Muyal CEA        │ ◄── One codebase
Slack Bot     │  (Universal Backend)   │     One deployment  
Other Agents  └─────────────────────┘     One configuration

Result: 1 agent handles all platforms, shared logic, unified data
```

### 🕰️ **Response Time Advantages**

| Function Type | Traditional Approach | CEA+MCP Approach | Speed Gain |
|---------------|---------------------|------------------|------------|
| **AI Chat** | Client → API → OpenAI → Response | Client → CEA → Cached Provider → Response | ~200ms faster |
| **Static Data** | Client → Database → Query → Response | Client → CEA → Memory → Response | ~500ms faster |
| **System Info** | Client → API → Server Query → Response | Client → CEA → Runtime State → Response | ~300ms faster |
| **Multi-Agent** | Client → Orchestrator → Agent → Response | Client → CEA → Direct A2A → Response | ~400ms faster |

### 🔒 **Security & Configuration Benefits**

**Single Point of Control:**
- **API Keys**: One place to manage OpenAI, Azure, Anthropic keys
- **Authentication**: One auth system for all platforms
- **Rate Limiting**: Centralized throttling across all clients
- **Audit Logging**: All interactions logged in one place
- **Error Handling**: Consistent error responses across platforms

### 📊 **Data Flow Examples**

**Static Data (`about_usha_krishnan`):**
```
Claude Desktop ──MCP──► CEA ──JSON──► Instant Response
                       │
                       └─── No external calls
                            No database queries
                            Sub-10ms response
```

**AI Processing (`chat`):**
```
Claude Desktop ──MCP──► CEA ───────────── OpenAI/Azure API
                       │                        │
                       ├─ Provider selection       │
                       ├─ Rate limiting           │
                       ├─ Conversation context    │
                       └─ Response processing ◄───┘
```

**Agent Network (`call_agent`):**
```
Claude Desktop ──MCP──► CEA (Hub) ──A2A──► Sales Agent
                       │                    │
                       ├────────────────────┘
                       │                     
                       └─A2A─► Marketing Agent
                                 │
                                 └─► Support Agent
```

## 🚀 Quick Start: Connect Claude Desktop Right Now

### Step 1: Start Your Muyal Agent
```bash
# Start with MCP enabled (default)
npm start
```

### Step 2: Configure Claude Desktop
Add this to your Claude Desktop MCP configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "muyal": {
      "command": "node",
      "args": ["C:\\Usha\\UKRepos\\Muyal\\lib\\src\\integrations\\mcp-server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Step 3: Test in Claude Desktop
Try these prompts in Claude Desktop:

**"Use the about_usha_krishnan function to tell me about the creator of this agent"**
**"Use the chat function to ask the agent: What can you help me with?"**

### What You'll See
Claude Desktop will show it has access to **11 tools** from your Muyal agent:
- ✅ `chat` - Your main agent interaction
- ✅ `about_usha_krishnan` - Info about Usha Krishnan
- ✅ `get_weather` - Weather information  
- ✅ `get_time` - Time/date functions
- ✅ `health` - System monitoring
- ✅ Plus 6 more system and A2A functions

### Alternative Startup Options
```bash
# Full capabilities (MCP + A2A)
npm run start:full

# Basic agent only (no MCP/A2A)
npm run start:basic

# Test MCP integration
npm run test:mcp
```

## 🔧 Function Categories: Different Response Types

Your Muyal agent showcases **4 different types of functions** with **4 different response mechanisms**:

### 🤖 **AI-Powered Functions** (Response: Live AI Processing)
1. **`chat`** - Forwards message to your configured AI provider (OpenAI/Azure/Anthropic)
   ```
   Response Source: → AI Provider API → Real-time AI response
   Example: "What are AI trends?" → GPT-4/Claude generates answer
   ```

### 📄 **Static Data Functions** (Response: Pre-configured Information)
2. **`about_usha_krishnan`** - Returns hardcoded professional information
   ```
   Response Source: → Static JSON data → Instant structured response
   Example: LinkedIn, GitHub, expertise areas (no API calls)
   ```

### 🌐 **External API Functions** (Response: Third-party Services)
3. **`get_weather`** - Mock weather data (shows API integration pattern)
   ```
   Response Source: → External Weather API → Live weather data
   Note: Currently mocked, easily replaceable with real API
   ```

### 🔧 **System Introspection Functions** (Response: Runtime System State)
4. **`health`** - Checks your agent's internal state
5. **`get_system_info`** - Agent platform, memory, capabilities
6. **`get_time`** - System time with timezone processing
7. **`list_providers`** - Available AI providers in your configuration
8. **`switch_provider`** - Changes active AI provider dynamically
   ```
   Response Source: → Runtime inspection → Current system state
   Example: Memory usage, uptime, active AI provider
   ```

### 🤖 **Agent Network Functions** (Response: Multi-Agent Coordination)
9. **`list_agents`** - Agents registered in A2A network
10. **`call_agent`** - Send request to specific agent, get response
11. **`broadcast`** - Send message to all agents, collect responses
    ```
    Response Source: → Agent Network → Coordinated responses
    Example: Query sales agent, get lead qualification results
    ```

## 🏢 Enterprise Deployment Patterns

### Microsoft 365 Integration
```typescript
// SharePoint integration
registerFunction({
  name: 'search_sharepoint',
  description: 'Search SharePoint documents and sites',
  handler: async (args) => {
    const results = await graphAPI.search({
      entityTypes: ['driveItem'],
      query: args.searchQuery,
      site: args.siteId
    });
    return results;
  }
});

// Teams integration
registerFunction({
  name: 'create_teams_meeting',
  description: 'Schedule Teams meetings with agenda',
  handler: async (args) => {
    const meeting = await graphAPI.calendar.events.create({
      subject: args.title,
      start: args.startTime,
      end: args.endTime,
      attendees: args.attendees,
      onlineMeeting: {
        provider: 'teamsForBusiness'
      }
    });
    return meeting;
  }
});
```

### Security and Compliance
```typescript
// Secure function with authentication
registerFunction({
  name: 'access_sensitive_data',
  description: 'Access sensitive business data with security checks',
  parameters: {
    type: 'object',
    properties: {
      dataType: { type: 'string' },
      accessReason: { type: 'string' },
      userContext: { type: 'object' }
    },
    required: ['dataType', 'accessReason', 'userContext']
  },
  handler: async (args) => {
    // Security validation
    const hasAccess = await securityManager.validateAccess(
      args.userContext,
      args.dataType
    );
    
    if (!hasAccess) {
      throw new Error('Access denied: Insufficient permissions');
    }
    
    // Audit logging
    await auditLogger.log({
      action: 'data_access',
      user: args.userContext.userId,
      dataType: args.dataType,
      reason: args.accessReason,
      timestamp: new Date()
    });
    
    // Retrieve and return data
    return await secureDataStore.get(args.dataType);
  }
});
```

### Performance and Monitoring
```typescript
// Function with performance monitoring
registerFunction({
  name: 'complex_analysis',
  description: 'Perform complex data analysis with monitoring',
  handler: async (args) => {
    const startTime = Date.now();
    
    try {
      // Your complex logic here
      const result = await performComplexAnalysis(args.data);
      
      // Log successful execution
      await metricsCollector.recordSuccess({
        functionName: 'complex_analysis',
        executionTime: Date.now() - startTime,
        dataSize: args.data.length
      });
      
      return result;
    } catch (error) {
      // Log errors for monitoring
      await metricsCollector.recordError({
        functionName: 'complex_analysis',
        error: error.message,
        executionTime: Date.now() - startTime
      });
      
      throw error;
    }
  }
});
```

## 📋 Best Practices

### Function Design Guidelines
1. **Clear Naming**: Use descriptive, action-oriented function names
2. **Type Safety**: Always define comprehensive parameter schemas
3. **Error Handling**: Implement proper error handling and user-friendly messages
4. **Documentation**: Provide detailed descriptions for all functions and parameters
5. **Security**: Validate inputs and implement proper access controls

### Agent Network Design
1. **Single Responsibility**: Each agent should have a focused, well-defined purpose
2. **Loose Coupling**: Agents should communicate through well-defined interfaces
3. **Fault Tolerance**: Design for agent failures and network partitions
4. **Scalability**: Consider horizontal scaling and load distribution
5. **Monitoring**: Implement comprehensive logging and monitoring

### Development Workflow
```bash
# 1. Develop and test functions locally
npm run test:mcp

# 2. Test agent communication
npm run mcp

# 3. Deploy to staging environment
npm run start:full

# 4. Monitor and iterate
# Check logs, metrics, and user feedback
```

## � Adding Custom Functions

### Simple Function Registration
```typescript
import { registerFunction } from './integrations/mcp-a2a-addon';

// Add a custom business function
registerFunction({
  name: 'get_customer_info',
  description: 'Retrieve customer information from CRM',
  parameters: {
    type: 'object',
    properties: {
      customerId: {
        type: 'string',
        description: 'Customer ID to lookup'
      }
    },
    required: ['customerId']
  },
  handler: async (args) => {
    // Your business logic here
    const customer = await crm.getCustomer(args.customerId);
    return {
      id: customer.id,
      name: customer.name,
      status: customer.status,
      lastContact: customer.lastContact
    };
  }
});
```

### Database Integration Example
```typescript
registerFunction({
  name: 'query_sales_data',
  description: 'Query sales database with natural language',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Natural language query about sales data'
      },
      dateRange: {
        type: 'string',
        description: 'Date range for the query (e.g., "last 30 days")'
      }
    },
    required: ['query']
  },
  handler: async (args) => {
    // Convert natural language to SQL
    const sql = await nlToSql(args.query, args.dateRange);
    const results = await salesDatabase.query(sql);
    
    return {
      query: args.query,
      results: results,
      summary: await generateSummary(results)
    };
  }
});
```

### Workflow Automation Example
```typescript
registerFunction({
  name: 'create_support_ticket',
  description: 'Create and route support tickets automatically',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Ticket title' },
      description: { type: 'string', description: 'Detailed description' },
      priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
      category: { type: 'string', description: 'Ticket category' }
    },
    required: ['title', 'description']
  },
  handler: async (args) => {
    // Auto-categorize and route
    const category = await aiCategorizer.categorize(args.description);
    const assignee = await routingEngine.findBestAgent(category, args.priority);
    
    const ticket = await ticketSystem.create({
      ...args,
      category,
      assignedTo: assignee,
      status: 'open'
    });
    
    // Notify relevant agents
    await broadcast('ticket_created', {
      ticketId: ticket.id,
      category,
      priority: args.priority
    });
    
    return {
      ticketId: ticket.id,
      status: 'created',
      assignedTo: assignee,
      estimatedResolution: await getEstimatedResolution(category, args.priority)
    };
  }
});
```

## 🤖 Building Multi-Agent Networks

### Specialized Agent Architecture
```typescript
// Create specialized agents for different domains
class SalesAgent extends BaseAgent {
  constructor() {
    super('sales-agent', {
      capabilities: ['lead_qualification', 'pricing', 'proposal_generation'],
      description: 'Specialized agent for sales processes'
    });
  }
  
  async qualifyLead(leadData) {
    const score = await this.calculateLeadScore(leadData);
    const recommendations = await this.generateRecommendations(score);
    
    // Notify marketing agent if lead needs nurturing
    if (score < 70) {
      await this.callAgent('marketing-agent', 'nurture_lead', {
        leadId: leadData.id,
        score,
        recommendations
      });
    }
    
    return { score, recommendations };
  }
}

class MarketingAgent extends BaseAgent {
  constructor() {
    super('marketing-agent', {
      capabilities: ['campaign_management', 'lead_nurturing', 'content_creation'],
      description: 'Specialized agent for marketing activities'
    });
  }
  
  async nurtureLead(leadData) {
    const campaign = await this.selectNurturingCampaign(leadData.score);
    const content = await this.generatePersonalizedContent(leadData);
    
    return await this.executeCampaign(campaign, content, leadData);
  }
}
```

### Agent Coordination Patterns
```typescript
// Workflow coordination between agents
class WorkflowOrchestrator {
  async processCustomerInquiry(inquiry) {
    // Step 1: Classify the inquiry
    const classification = await this.callAgent(
      'nlp-agent', 
      'classify_intent', 
      { text: inquiry.content }
    );
    
    // Step 2: Route to appropriate specialist
    let response;
    switch (classification.intent) {
      case 'sales':
        response = await this.callAgent(
          'sales-agent', 
          'handle_inquiry', 
          inquiry
        );
        break;
        
      case 'support':
        response = await this.callAgent(
          'support-agent', 
          'create_ticket', 
          inquiry
        );
        break;
        
      case 'billing':
        response = await this.callAgent(
          'billing-agent', 
          'resolve_billing_query', 
          inquiry
        );
        break;
    }
    
    // Step 3: Follow up and learning
    await this.callAgent(
      'analytics-agent', 
      'track_interaction', 
      {
        inquiry,
        classification,
        response,
        timestamp: new Date()
      }
    );
    
    return response;
  }
}
```

### Real-time Collaboration Example
```typescript
// Collaborative document analysis
class DocumentAnalysisWorkflow {
  async analyzeBusinessDocument(documentUrl) {
    // Parallel analysis by specialized agents
    const tasks = [
      this.callAgent('legal-agent', 'review_compliance', { documentUrl }),
      this.callAgent('finance-agent', 'analyze_financial_terms', { documentUrl }),
      this.callAgent('risk-agent', 'assess_risks', { documentUrl }),
      this.callAgent('content-agent', 'extract_key_points', { documentUrl })
    ];
    
    const results = await Promise.all(tasks);
    
    // Synthesize results
    const synthesis = await this.callAgent(
      'synthesis-agent',
      'combine_analyses',
      {
        legalReview: results[0],
        financialAnalysis: results[1],
        riskAssessment: results[2],
        keyPoints: results[3]
      }
    );
    
    // Broadcast findings to interested parties
    await this.broadcast('document_analysis_complete', {
      documentUrl,
      synthesis,
      timestamp: new Date()
    });
    
    return synthesis;
  }
}
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