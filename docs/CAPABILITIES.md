# 🐰 Muyal Current Capabilities & Function Reference

## ✅ **What Works Right Now**

**Total functions available: 13**
- 2 main business functions (chat, about_usha_krishnan)
- 3 external API functions (get_weather, get_employees, search_employees)
- 5 system functions (health, time, etc.)
- 3 agent network functions (list_agents, call_agent, broadcast)

## 🎯 **Core Functions by Category**

### 🤖 **AI-Powered Functions**
**`chat`** - Enhanced with automatic knowledge injection
- **What it does:** Forwards messages to configured AI provider with auto-enhanced context
- **Smart enhancement:** Automatically detects employee-related questions and injects live data
- **Example:** `chat({message: "Who are our highest paid employees?", platform: "claude-desktop"})`
- **Response time:** 1-3 seconds
- **Trigger words:** employee, staff, salary, team, hr, "highest paid", etc.

### 📊 **Data Functions**
**`about_usha_krishnan`** - Creator information
- **Response:** Professional info, LinkedIn, GitHub, expertise areas
- **Response time:** <10ms (static data)

**`get_employees`** - Complete employee database
- **What it does:** Returns all 24 employees with optional statistics
- **Data source:** Live API (dummy.restapiexample.com)
- **Response time:** ~300ms

**`search_employees`** - Smart employee search
- **Natural language queries:** "highest paid", "youngest", "over 300k salary"
- **Supports:** Name searches, salary/age ranges, sorting
- **Response time:** ~300ms

**`get_weather`** - Weather information
- **Currently:** Mock data (easily replaceable with real API)
- **Template for:** Any external API integration
- **Response time:** ~200ms

### 🔧 **System Functions**
- **`health`** - System status and provider health
- **`get_system_info`** - Platform info, memory usage
- **`get_time`** - Current time with timezone support
- **`list_providers`** - Available AI providers
- **`switch_provider`** - Change AI provider runtime

### 🤝 **Agent Network Functions**
- **`list_agents`** - Show connected agents in network
- **`call_agent`** - Send requests to specific agents
- **`broadcast`** - Message all agents in network

## 🔌 **MCP Integration with Claude Desktop**

### Quick Setup
1. Start your agent: `npm start`
2. Add to Claude Desktop config (`%APPDATA%\Claude\claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "muyal": {
      "command": "node",
      "args": ["C:\\Usha\\UKRepos\\Muyal\\lib\\src\\integrations\\mcp-server.js"],
      "env": { "NODE_ENV": "production" }
    }
  }
}
```

### Test Prompts
```
"Use the chat function to ask: What can you help me with?"
"Use search_employees to find employees earning over 400k"
"Use get_employees with include_stats true to analyze our workforce"
```

## 🏗️ **Architecture Patterns**

### Response Types Demonstrated
1. **AI-Enhanced** (chat) - Live AI + auto knowledge injection
2. **Static Data** (about_usha_krishnan) - Instant memory responses  
3. **External APIs** (weather, employees) - Live third-party data
4. **System State** (health, info) - Runtime introspection
5. **Agent Network** (A2A functions) - Multi-agent coordination

### Integration Benefits
- **Single codebase** serves all platforms (M365, MCP, Web, APIs)
- **Unified configuration** for all AI providers and platforms
- **Shared business logic** across all interfaces
- **Consistent error handling** everywhere

## 🌐 **Employee Knowledge Integration**

### Automatic Enhancement
The `chat` function now automatically detects employee-related queries and enhances responses with live employee data from the API.

**Example Flow:**
```
User: "Who are the highest paid employees?"
→ Agent detects employee keywords
→ Fetches live data from API (24 employees)
→ AI gets rich context about salaries, ages, etc.
→ Responds with accurate, data-driven answer
```

**Sample Response:** *"Based on current data, the highest paid employees are: Paul Byrd ($725,000), Yuri Berry ($675,000), Charde Marshall ($470,600). The company has 24 employees with an average salary of $266,000."*

### Storage & Conversation Memory

Muyal supports two persistent memory backends: filesystem JSON storage (default for local dev) and Azure Cosmos DB for scalable production storage. The memory provider is configurable via `MEMORY_PROVIDER` in `.env` and the Cosmos connection via `COSMOS_ENDPOINT` / `COSMOS_KEY` when selected.

Key memory concepts:
- MODEL_HISTORY_WINDOW: how many recent chat turns are sent to the LLM (default 4).
- LOGICAL_MEMORY_ANSWER_COUNT: how many assistant messages and knowledge source IDs are kept in conversation context for quick continuation and provenance (default 10).
- Continuation heuristic: short confirmations and one-line replies trigger reuse of prior knowledge source IDs to keep follow-ups coherent without re-querying all sources.

These features improve response relevance while controlling token usage and providing clear provenance for answers.

## 🚀 **Adding New Functions**

### Pattern for External APIs
```typescript
// 1. Create API function
async function fetchYourData() {
  const response = await fetch('https://your-api.com/data');
  return response.json();
}

// 2. Register MCP function
registerFunction({
  name: 'get_your_data',
  description: 'Description for Claude',
  handler: async (args) => {
    const data = await fetchYourData();
    return { data, timestamp: new Date() };
  }
});

// 3. Optional: Add to chat enhancement
const isYourDataQuery = message.includes('your-keywords');
```

### Recommended Demo APIs
- **Users:** `https://dummy.restapiexample.com/api/v1/users`
- **Posts:** `https://dummy.restapiexample.com/api/v1/posts`
- **Products:** `https://dummy.restapiexample.com/api/v1/products`
- **Orders:** `https://dummy.restapiexample.com/api/v1/orders`

## 🎯 **What This Demonstrates**

Your Muyal CEA showcases **enterprise-grade AI agent architecture** with:

✅ **Knowledge-enhanced conversations** (automatic context injection)  
✅ **Multi-platform deployment** (one backend, multiple interfaces)  
✅ **External API integration** (live data sources)  
✅ **Agent network coordination** (A2A communication)  
✅ **Runtime flexibility** (switch providers, monitor health)  

---

**Ready to extend your agent?** Start with existing functions, then add your own business logic!