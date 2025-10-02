# 🚀 Muyal AI Agent - Complete Setup & Usage Guide

## Overview

Muyal is a versatile AI agent that supports multiple platforms (Microsoft 365, Web, Slack, Discord, etc.) with flexible AI provider integration. Choose from 6 different AI providers including local options for complete privacy.

## 🎯 Supported AI Providers

| Provider | Models | Strengths | Best For |
|----------|--------|-----------|----------|
| **OpenAI** | GPT-4o, GPT-4, GPT-3.5 | Versatile, reliable, function calling | General purpose, enterprise |
| **Anthropic** | Claude-3 Sonnet, Haiku | Safety, reasoning, long context | Creative writing, analysis |
| **Azure OpenAI** | GPT-4o, GPT-4 | Enterprise compliance, data residency | Corporate environments |
| **Google AI** | Gemini Pro, Flash | Fast, cost-effective, multimodal | Quick responses, high volume |
| **Azure AI Foundry** | Llama 2, Code Llama, Mistral, Phi-3 | Hosted & local, open models | Flexibility, compliance |
| **Ollama** | Llama 3.2, Mistral, CodeLlama | Local, private, no API costs | Privacy, offline, development |

## 📊 Provider Comparison Matrix

| Provider | Speed | Cost | Privacy | Offline | Enterprise | Code Generation |
|----------|-------|------|---------|---------|------------|----------------|
| **OpenAI** | ⚡⚡⚡ | 💰💰💰💰 | 🔒 | ❌ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Anthropic** | ⚡⚡⚡ | 💰💰💰 | 🔒🔒 | ❌ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Azure OpenAI** | ⚡⚡⚡ | 💰💰💰💰 | 🔒🔒🔒 | ❌ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Google AI** | ⚡⚡⚡⚡ | 💰💰 | 🔒 | ❌ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Azure AI Foundry** | ⚡⚡⚡ | 💰💰💰 | 🔒🔒 | ❌ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Ollama (Local)** | ⚡⚡ | 💰 | 🔒🔒🔒🔒 | ✅ | ⭐⭐ | ⭐⭐⭐⭐ |

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd Muyal
npm install
```

### 2. Configure Environment
```bash
cp env/.env.example .env
# Edit .env with your preferred AI provider credentials
```

### 3. Choose Your Setup

#### Option A: Enterprise Setup (Recommended)
```bash
# Use Azure OpenAI for compliance and reliability
AZURE_OPENAI_API_KEY=your-key-here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# Set platform mappings
M365_AI_PROVIDER=azure-openai-default
WEB_AI_PROVIDER=azure-openai-default
```

#### Option B: Multi-Provider Setup (Flexibility)
```bash
# Different providers for different platforms
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_AI_API_KEY=your-google-key

# Platform-specific mappings
M365_AI_PROVIDER=azure-openai-default      # Enterprise compliance
WEB_AI_PROVIDER=anthropic-default          # Creative conversations
SLACK_AI_PROVIDER=google-ai-default        # Fast responses
```

#### Option C: Privacy-First Setup (Local AI)
```bash
# Install Ollama: https://ollama.ai/
# Pull a model: ollama pull llama3.2:3b

OLLAMA_ENABLED=true
OLLAMA_MODEL=llama3.2:3b

# Use local AI for all platforms
M365_AI_PROVIDER=ollama-default
WEB_AI_PROVIDER=ollama-default
```

### 4. Start the Application
```bash
npm start
```

## 🌐 Available Interfaces

- **Web Chat**: http://localhost:3978
- **Microsoft 365**: Available via Teams/Copilot integration
- **API Endpoints**: 
  - Chat: `POST /api/chat`
  - Health: `GET /api/health`
  - AI Config: `GET /api/ai/config`
  - AI Health: `GET /api/ai/health`

## ⚙️ Configuration Guide

### Provider-Specific Settings

**OpenAI:**
```bash
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o                    # or gpt-4, gpt-3.5-turbo
OPENAI_TEMPERATURE=0.7                 # 0.0-2.0
OPENAI_MAX_TOKENS=1000                 # Response length limit
```

**Azure OpenAI:**
```bash
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

**W&B Observability:**
```bash
WANDB_ENABLED=true
WANDB_API_KEY=your-wandb-key
WANDB_PROJECT=muyal-ai-agent
WANDB_ENTITY=your-username
WANDB_TAGS=production,ai-monitoring
```

**Anthropic:**
```bash
ANTHROPIC_API_KEY=sk-ant-your-key
ANTHROPIC_MODEL=claude-3-sonnet-20240229 # or claude-3-haiku-20240307
```

**Google AI:**
```bash
GOOGLE_AI_API_KEY=your-google-key
GOOGLE_AI_MODEL=gemini-pro              # or gemini-pro-vision
```

**Azure AI Foundry:**
```bash
# Hosted
AZURE_AI_FOUNDRY_ENDPOINT=https://your-foundry.azureml.net/
AZURE_AI_FOUNDRY_API_KEY=your-key
AZURE_AI_FOUNDRY_MODEL_NAME=Llama-2-7b-chat-hf

# Local
AZURE_AI_FOUNDRY_LOCAL=true
AZURE_AI_FOUNDRY_ENDPOINT=http://localhost:8080
```

**Ollama:**
```bash
OLLAMA_ENABLED=true
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b               # or mistral, codellama, etc.
```

### Platform Mappings

Configure different AI providers for different platforms:

```bash
# Enterprise: Use Azure OpenAI for compliance
M365_AI_PROVIDER=azure-openai-default
M365_AI_FALLBACK_PROVIDER=azure-ai-foundry-default

# Web: Use creative AI for better conversations
WEB_AI_PROVIDER=anthropic-default
WEB_AI_FALLBACK_PROVIDER=openai-default

# Slack: Use fast AI for quick responses
SLACK_AI_PROVIDER=google-ai-default
SLACK_AI_FALLBACK_PROVIDER=ollama-default
```

## 🎯 Use Case Examples

### Enterprise Setup
```bash
# Maximum compliance and reliability
AZURE_OPENAI_API_KEY=your-key
M365_AI_PROVIDER=azure-openai-default
WEB_AI_PROVIDER=azure-openai-default
```

### Development Team
```bash
# Code-optimized with local fallback
OPENAI_API_KEY=your-key
OLLAMA_ENABLED=true
OLLAMA_MODEL=codellama:13b
WEB_AI_PROVIDER=openai-default
SLACK_AI_PROVIDER=ollama-default
```

### Privacy-First Organization
```bash
# All processing stays local
OLLAMA_ENABLED=true
OLLAMA_MODEL=llama3.2:11b
AZURE_AI_FOUNDRY_LOCAL=true
M365_AI_PROVIDER=ollama-default
WEB_AI_PROVIDER=azure-ai-foundry-default
```

### Cost-Conscious Startup
```bash
# Minimize cloud costs
GOOGLE_AI_API_KEY=your-key
OLLAMA_ENABLED=true
OLLAMA_MODEL=mistral
WEB_AI_PROVIDER=google-ai-default
SLACK_AI_PROVIDER=ollama-default
```

## 🔧 Local AI Setup

### Ollama Installation

**Windows:**
1. Download from https://ollama.ai/
2. Run installer
3. Open terminal and run: `ollama pull llama3.2:3b`

**macOS:**
```bash
brew install ollama
ollama pull llama3.2:3b
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3.2:3b
```

### Recommended Ollama Models

| Model | Size | Best For | Speed |
|-------|------|----------|-------|
| `llama3.2:3b` | 3B | General use, fast responses | ⚡⚡⚡⚡ |
| `mistral` | 7B | Balanced performance | ⚡⚡⚡ |
| `codellama:13b` | 13B | Code generation | ⚡⚡ |
| `llama3.2:11b` | 11B | High quality responses | ⚡⚡ |

## 🛠️ Troubleshooting

### Common Issues

**No AI providers available:**
```bash
# Check your .env file has at least one provider configured
# Verify API keys are correct
npm start  # Look for provider initialization logs
```

**Ollama not responding:**
```bash
# Check if Ollama is running
ollama list
# Start Ollama service
ollama serve
# Pull a model if none exist
ollama pull llama3.2:3b
```

**Azure OpenAI authentication error:**
```bash
# Verify endpoint format
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
# Check deployment name matches Azure portal
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
```

**W&B not collecting data:**
```bash
# Check if W&B is enabled
echo $WANDB_ENABLED
# Verify API key is set
wandb status
# Check logs for W&B initialization
npm start | grep -i wandb
```

### Health Monitoring

Check AI provider status:
```bash
curl http://localhost:3978/api/ai/health
```

View current configuration:
```bash
curl http://localhost:3978/api/ai/config
```

## 📝 API Reference

### Chat API
```bash
POST /api/chat
Content-Type: application/json

{
  "message": "Hello, how are you?",
  "conversationId": "user-123"
}
```

### User Feedback API
```bash
POST /api/feedback
Content-Type: application/json

{
  "conversationId": "user-123",
  "rating": 5,
  "feedback": "Great response!",
  "platform": "web"
}
```

### Health Check
```bash
GET /api/health
# Returns: {"status": "ok", "timestamp": "..."}
```

### AI Provider Health
```bash
GET /api/ai/health
# Returns health status of all configured providers
```

### AI Configuration
```bash
GET /api/ai/config
# Returns current AI configuration and available providers
```

## 🔒 Security Best Practices

1. **API Keys**: Store in environment variables, never in code
2. **Local AI**: Use Ollama or local Azure AI Foundry for sensitive data
3. **Network**: Restrict API access to trusted networks
4. **Monitoring**: Enable logging and monitor AI provider usage
5. **Fallbacks**: Configure fallback providers for reliability

## 🎯 Performance Optimization

1. **Model Selection**: Use faster models for high-volume scenarios
2. **Local AI**: Use Ollama for development and testing
3. **Caching**: Implement response caching for repeated queries
4. **Token Limits**: Set appropriate max_tokens for cost control
5. **Platform Matching**: Use optimal providers per platform

## � Observability & Monitoring

Muyal includes built-in **Weights & Biases (W&B)** observability for comprehensive AI monitoring.

### Quick W&B Setup (5 minutes)
```bash
# 1. Sign up at wandb.ai (free tier available)
# 2. Get your API key from wandb.ai/authorize
# 3. Add to your .env:
WANDB_ENABLED=true
WANDB_API_KEY=your-wandb-api-key-here
WANDB_PROJECT=muyal-ai-agent
```

### What You'll Monitor Automatically
- 📊 **AI Requests**: Every provider interaction tracked
- 💰 **Cost Analytics**: Spending per provider/platform
- ⚡ **Performance**: Response times and error rates
- 🏥 **Provider Health**: Real-time availability monitoring
- 👤 **User Feedback**: Quality ratings and satisfaction
- 🎯 **Usage Patterns**: Popular features and platforms

### Beautiful Dashboards Include
1. **Provider Performance**: Response times, error rates, cost comparison
2. **Usage Analytics**: Requests by platform, conversation patterns
3. **Cost Optimization**: Spending trends and optimization recommendations
4. **User Experience**: Satisfaction scores and engagement metrics

### Environment Configuration
```bash
# Basic setup (recommended)
WANDB_ENABLED=true
WANDB_API_KEY=your-wandb-api-key
WANDB_PROJECT=muyal-ai-agent

# Advanced setup
WANDB_ENTITY=your-team-name
WANDB_TAGS=production,multi-llm,monitoring
WANDB_NOTES=Multi-provider AI agent observability
```

### Alternative Observability
The system uses a clean abstraction layer, making it easy to switch or add:
- **LangFuse** (open source)
- **Custom providers** 
- **Multiple providers** simultaneously
- **Disable**: Set `WANDB_ENABLED=false`

## 🚀 Development & Startup

### Startup Scripts

| Command | Description | Best For |
|---------|-------------|----------|
| `npm start` | **Recommended**: PowerShell script with validation and cleanup | Most users |
| `npm run start:muyal-simple` | Batch script opening separate windows | Windows users who prefer visual confirmation |
| `npm run dev` | Development mode with hot reload | Development and testing |

### PowerShell Script Features
- **Process cleanup**: Terminates existing Node.js processes
- **Configuration validation**: Checks for at least one AI provider
- **Dual startup**: Starts both M365 playground and web interface
- **Progress feedback**: Clear status messages and URLs
- **Configurable options**: Verbose logging and cleanup control

### Development Commands
```bash
# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Test configuration
npm run test-config

# Watch mode (restart on changes)
npm run watch
```

### Startup Troubleshooting
- **PowerShell execution policy**: Use `npm start` (bypasses policy)
- **Port conflicts**: Check `.env` for custom PORT setting
- **Configuration errors**: Verify at least one AI provider is configured
- **Process conflicts**: Scripts automatically clean up existing processes

---

**Need Help?** Check the health endpoints, review logs, or validate your environment configuration.