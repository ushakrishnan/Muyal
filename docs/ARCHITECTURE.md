# 🏗️ Muyal Custom Engine Agent (CEA) - Architecture

## Custom Engine Agent (CEA) Pattern

Muyal implements the **Custom Engine Agent (CEA)** pattern using the **Microsoft 365 Agents SDK**. This architecture allows you to integrate your existing multi-agent AI application into Microsoft 365 Copilot without adding extra orchestration layers.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Platform Interfaces                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Microsoft   │  │   Web App   │  │   Slack     │  │   Discord   │ │
│  │     365     │  │             │  │             │  │             │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
              │              │              │              │
              ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Platform Adapters                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ M365Adapter │  │ WebAdapter  │  │SlackAdapter │  │DiscordAdapter│ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Core Business Logic                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │               ConversationHandler                       │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │             AIProcessor                        │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┐    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI Provider Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   OpenAI    │  │ Anthropic   │  │Azure OpenAI│  │ Google AI   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│  ┌─────────────┐  ┌─────────────┐                                │ │
│  │ Azure AI    │  │   Ollama    │                                │ │
│  │  Foundry    │  │   (Local)   │                                │ │
│  └─────────────┘  └─────────────┘                                │ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Observability Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Metrics   │  │   Logging   │  │ User Feedback│ │ Cost Track  │ │
│  │  Tracking   │  │   Service   │  │   Collection │ │  & Health   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │           W&B/LangFuse Provider Integration             │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Platform Adapters (`src/adapters/`)

**Purpose**: Handle platform-specific message formats and authentication

**Location**: `src/adapters/base/`, `src/adapters/microsoft365/`, `src/adapters/web/`

**Key Features**:
- **Unified Interface**: All adapters implement `PlatformAdapter` interface
- **Message Transformation**: Convert platform messages to internal format
- **Template System**: `_template/` folder for creating new adapters
- **Registry Pattern**: Automatic adapter discovery and registration

### 2. Conversation Handler (`src/core/conversation-handler.ts`)

**Purpose**: Central processing unit for all conversations

**Key Features**:
- **Platform Agnostic**: Works with any adapter
- **AI Provider Routing**: Selects appropriate AI provider per platform
- **Context Management**: Maintains conversation state and history
- **Error Handling**: Graceful fallbacks and error recovery

### 3. AI Provider System (`src/core/providers/`)

**Purpose**: Abstracted AI provider interface with multiple implementations

**Available Providers**:
- **OpenAI**: `openai-provider.ts` - GPT-4o, GPT-4, GPT-3.5
- **Anthropic**: `anthropic-provider.ts` - Claude-3 Sonnet, Haiku
- **Azure OpenAI**: `azure-openai-provider.ts` - Enterprise GPT models
- **Google AI**: `google-ai-provider.ts` - Gemini Pro, Flash
- **Azure AI Foundry**: `azure-ai-foundry-provider.ts` - Open models (hosted/local)
- **Ollama**: `ollama-provider.ts` - Local AI models

### 4. Services Layer (`src/services/`)

**Purpose**: Shared business logic and utilities

**Components**:
- **Analytics Service**: Usage tracking and metrics
- **Formatting Service**: Message formatting and templates
- **Validation Service**: Input validation and sanitization
- **Observability Service**: AI metrics tracking, cost monitoring, user feedback collection
  - **W&B Provider**: Weights & Biases integration with free tier support
  - **Provider Abstraction**: Easy switching between observability solutions
  - **Health Monitoring**: Real-time AI provider status tracking
  - **Cost Estimation**: Track spending across all AI providers

### 5. Unified Entry Point (`src/index.ts`)

**Purpose**: Single entry point with integrated API endpoints and server setup

**Available Endpoints**:
- **Chat API**: `/api/chat` - Direct chat interface
- **Health Check**: `/api/health` - System health status  
- **AI Configuration**: `/api/ai/config` - Current AI settings
- **AI Health**: `/api/ai/health` - AI provider status
- **User Feedback**: `/api/feedback` - Collect user feedback on AI responses
- **Analytics**: `/api/analytics` - Usage and performance metrics
- **Conversation Management**: `/api/conversation/:id` - History and management
- **Static Assets**: Serves web interface and API documentation

## Design Patterns

### 1. Adapter Pattern
```typescript
abstract class PlatformAdapter {
  abstract async handleMessage(message: any): Promise<ConversationResult>;
  abstract async sendResponse(response: string, context: any): Promise<void>;
}
```

### 2. Registry Pattern
```typescript
class AdapterRegistry {
  static register(name: string, adapter: PlatformAdapter): void;
  static get(name: string): PlatformAdapter | undefined;
  static getAll(): Map<string, PlatformAdapter>;
}
```

### 3. Provider Pattern
```typescript
interface AIProvider {
  generateResponse(message: string, context: AIContext): Promise<string>;
  getHealth(): Promise<ProviderHealth>;
  validateConfig(): boolean;
}
```

### 4. Configuration Pattern
```typescript
class AIConfiguration {
  static getProviderForPlatform(platform: string): string;
  static initializeProviders(): Map<string, AIProvider>;
  static validateConfiguration(): ConfigValidation;
  static getObservability(): ObservabilityProvider;
}
```

### 5. Observability Pattern
```typescript
abstract class ObservabilityProvider {
  abstract async logAIRequest(metrics: AIRequestMetrics): Promise<void>;
  abstract async logUserFeedback(feedback: UserFeedback): Promise<void>;
  abstract async getProviderHealth(): Promise<ProviderHealthStatus>;
  abstract async flush(): Promise<void>;
}
```

## Data Flow

### 1. Message Processing Flow
```
User Message → Platform Interface → Platform Adapter → Conversation Handler → AI Processor → AI Provider → Response
```

### 1.5 Knowledge Enhancement Flow (detailed)
```
User Message → Continuation check (lastKnowledgeSources + cheap TF cosine) → knowledgeLibrary.enhanceMessage / enhanceWithSourceIds → fetchContext() calls to selected executors → aggregated enhancedMessage + suggestions → modelInput (enhancedMessage or original) → AI Processor
```

Notes:
- Continuation logic prefers reusing previously stored `lastKnowledgeSources` when the current user message is a likely continuation (cheap cosine similarity / overlap heuristics) and there are no overriding currentlyRelevant sources.
- The knowledge library collects suggestions from each used source and returns a de-duped top-3 list. At response composition time the server prefers knowledge-sourced suggestions and falls back to AI-generated suggestions when enhancement produced none.

### 2. AI Provider Selection Flow
```
Platform Context → Configuration Lookup → Provider Selection → Fallback Chain → Health Check → AI Call
```

### 3. Error Handling Flow
```
Error Occurs → Error Classification → Fallback Provider → Retry Logic → Graceful Degradation → User Notification
```

### 4. Observability Data Flow
```
AI Request → Metrics Collection → Provider Logging → Dashboard Update → Cost Tracking → Health Monitoring
```

### 5. User Feedback Flow
```
User Interaction → Feedback Collection → Quality Rating → Observability Logging → Analytics Dashboard
```

### Executor / Knowledge Source Runtime (new)

Purpose: Provide a small, pluggable executor model that runs knowledge-source descriptors (JSON) through a provider-specific executor implementation. Executors allow knowledge sources to be defined declaratively and executed by a thin runtime with injected clients (A2A communicator, Cosmos client, etc.).

Location: `src/core/knowledge-sources/` including `ensure-ks.ts`, `executor-factory.ts`, `types.ts`, and per-provider executor implementations (static, http, remote, etc.).

Key points:
- Knowledge sources are authored as JSON descriptors and loaded at startup (developer-authorable under `data/knowledge/` or `src/.../knowledge-data`).
- `ensureKnowledgeSource` converts a descriptor into a runtime `KnowledgeSource` by wiring an executor from `getExecutorFor(desc, ctx)` and injecting runtime context (for example `cosmosClient` or `a2aCommunicator`) into `desc.metadata` so executors can use shared clients without API churn.
- Executors return a normalized result shape { text, structured?, metadata? } where `structured` is preferred (JSON) and `metadata.raw` may hold legacy structured data. The `fetchContext()` wrapper in `ensure-ks` prefers `structured` → `metadata.raw` → `text` when producing context injected into prompts.
- Executors also expose `getSuggestions()` which the knowledge library aggregates.

Why this matters:
- The descriptor + executor model separates data (what to fetch) from behavior (how to fetch it). It makes adding new source types trivial and keeps runtime wiring minimal.

## Key Benefits

### 1. **Modularity**
- Each component has a single responsibility
- Easy to test individual components
- Clear dependencies and interfaces

### 2. **Extensibility**
- Add new platforms using adapter template
- Add new AI providers implementing interface
- Add new services without core changes

### 3. **Flexibility**
- Platform-specific AI provider configuration
- Fallback chains for reliability
- Environment-driven configuration

### 4. **Maintainability**
- Organized folder structure
- Consistent naming conventions
- Clear separation of concerns

### 5. **Scalability**
- Horizontal scaling through adapter instances
- AI provider load balancing
- Async/await throughout

## Storage & Memory Design

Muyal separates two memory concepts which are configurable:

- Model history: the short sequence of recent turns sent to the LLM when generating a response. Controlled by `MODEL_HISTORY_WINDOW` (default: 4). Smaller windows reduce token usage; larger windows increase context but cost more.
- Logical memory / provenance: a small persistent set of recent assistant responses and the knowledge source IDs they used. Controlled by `LOGICAL_MEMORY_ANSWER_COUNT` (default: 10). This is stored on the conversation context and used for continuation seeding and lightweight provenance.

Storage backends:
- Filesystem: local JSON files under `./data/conversations/` (development default).
- Azure Cosmos DB: production-ready document store (enable by setting `MEMORY_PROVIDER=cosmos` and providing `COSMOS_ENDPOINT` / `COSMOS_KEY`). The Cosmos provider persists messages and conversation contexts and supports efficient queries for analytics.

Observability & telemetry sinks:
- Local JSONL files are written reliably for development and offline diagnostics (examples: `logs/error-entities.jsonl`, `logs/metrics.jsonl`).
- When configured with a Cosmos client (attached at startup or injected into executor context), observability attempts best-effort upserts into Cosmos. Two containers are used by convention:
  - `errors` — error / exception records
  - `logs` — metric / request logs
- The Cosmos helper performs create-if-not-exists semantics for the database and containers before upserting documents. Partition key usage is currently `/id` (pragmatic default); consider a more selective partition key for production throughput.
- Exceptions during Cosmos creation or upsert are logged as warnings and do not block request processing. Unit tests may log a warning when using mocked clients that don't implement `createIfNotExists`.

Knowledge versioning & soft-reset:
- The knowledge library exposes a `knowledgeVersion` value. When knowledge sources are added/removed or toggled, the version is bumped. The unified server subscribes to these changes and performs a soft-reset across active conversations — clearing cached `lastKnowledgeSources` and updating `knowledgeVersion` in conversation contexts to avoid using stale provenance.

These controls let operators tune cost vs. recall and ensure provenance accuracy when the knowledge base changes.

## Configuration System

### Environment-Driven Setup
```bash
# Platform Mappings
M365_AI_PROVIDER=azure-openai-default
WEB_AI_PROVIDER=anthropic-default
SLACK_AI_PROVIDER=google-ai-default

# Provider Configurations  
AZURE_OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
GOOGLE_AI_API_KEY=your-key

# Observability Configuration
WANDB_ENABLED=true
WANDB_API_KEY=your-wandb-key
WANDB_PROJECT=muyal-ai-agent
WANDB_ENTITY=your-team
WANDB_TAGS=production,ai-agent
```

### Dynamic Provider Selection
- **Primary Provider**: Configured per platform
- **Fallback Provider**: Used when primary fails
- **Health Monitoring**: Automatic provider health checks
- **Load Balancing**: Round-robin for multiple instances

## Security Architecture

### 1. **API Key Management**
- Environment variable storage
- No hardcoded credentials
- Secure configuration loading

### 2. **Request Validation**
- Input sanitization
- Rate limiting support
- Authentication hooks

### 3. **Local AI Privacy**
- Ollama for offline processing
- Azure AI Foundry local mode
- No data leaves local network

### 4. **Audit Trail**
- Request/response logging
- Error tracking
- Usage analytics

### 5. **Observability Security**
- Secure metrics collection
- Privacy-compliant user feedback
- Cost monitoring and alerting
- Provider health status tracking

## Future Extensions

### 1. **New Platforms**
```bash
src/adapters/telegram/
src/adapters/whatsapp/
src/adapters/api/
```

### 2. **Additional AI Providers**
```bash
src/core/providers/cohere-provider.ts
src/core/providers/huggingface-provider.ts
src/core/providers/aws-bedrock-provider.ts
```

### 3. **Enhanced Services**
```bash
src/services/caching-service.ts
src/services/translation-service.ts
src/services/moderation-service.ts
src/services/observability/prometheus-provider.ts
src/services/observability/datadog-provider.ts
src/services/observability/custom-provider.ts
```

### 4. **Advanced Observability**
```bash
src/services/observability/langfuse-provider.ts
src/services/observability/lunary-provider.ts
src/services/observability/helicone-provider.ts
src/services/analytics/advanced-metrics.ts
src/services/analytics/cost-optimization.ts
```

## 📁 Knowledge Sources Architecture

Knowledge sources provide automatic intelligence enhancement through modular data integration.

### File Organization
```
src/core/knowledge-sources/
├── index.ts                   # Central export point
├── employee-knowledge.ts      # Employee database integration
├── company-knowledge.ts       # Company policies & information  
├── weather-knowledge.ts       # Weather data & forecasts
├── system-knowledge.ts        # Agent capabilities & help
└── template-knowledge.ts      # Template for new sources
```

### Knowledge Source Interface & Descriptor Model
Knowledge sources are authored as JSON descriptors and then converted into a runtime `KnowledgeSource` via `ensureKnowledgeSource(desc, ctx)`.

Runtime shape (summary):
```typescript
type KnowledgeSource = {
  id: string;
  name: string;
  keywords: string[];
  isEnabled: boolean;
  isRelevant: (message: string) => boolean;
  fetchContext: (ctx?: { conversationId?: string }) => Promise<string>;
  getSuggestions?: () => string[];
  descriptor: KnowledgeDescriptorT;
}
```

Descriptor-to-runtime notes:
- `ensureKnowledgeSource` attaches any runtime clients from the loader (for example `cosmosClient` or `a2aCommunicator`) into `desc.metadata` so executors can access them.
- `fetchContext()` is a thin wrapper that executes the configured executor and normalizes the returned value to a string (preferring `structured` JSON when present, else `metadata.raw`, else `text`).
- `isRelevant()` uses keywords, name substring match, and small-token fuzzy matching (Levenshtein-based) to be resilient to typos and short queries.
- `getSuggestions()` defaults to `desc.metadata?.suggestions ?? []` but executors or specific sources can supply dynamic suggestions.

### Automatic Enhancement Process
1. **Message Analysis**: Incoming messages analyzed for relevant keywords
2. **Source Selection**: Appropriate knowledge sources called based on relevance  
3. **Context Injection**: Retrieved data seamlessly injected into AI prompt
4. **Enhanced Response**: AI generates response with rich contextual information

### Priority System
- **90-100**: Critical business data (employee records, financial data)
- **70-89**: Important organizational info (policies, procedures)
- **50-69**: Helpful utilities (weather, system info)
- **30-49**: Nice-to-have features

### Adding New Knowledge Sources
1. Copy `template-knowledge.ts` as starting point
2. Implement interface methods with your data logic
3. Define keywords and priority level (90+ for critical business data)
4. Export from index.ts for automatic registration
5. Test with sample conversations

### Benefits
- **Zero Learning Curve**: Users chat naturally without special commands
- **Contextual Intelligence**: Responses enhanced with live, relevant data
- **Scalable Architecture**: Easy to add unlimited knowledge domains
- **Real-time Data**: Always current information from live sources
- **Cross-Platform**: Same intelligence works in M365, MCP, Web, APIs

---

This architecture ensures **scalability**, **maintainability**, and **extensibility** while providing a **consistent experience** across all platforms and AI providers.