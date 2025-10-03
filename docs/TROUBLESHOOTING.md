# 🔧 Troubleshooting Guide

## Common Issues & Solutions

### 🤖 AI Provider Issues

#### No AI providers available
```bash
# Check your .env file has at least one provider configured
cat .env | grep -E "(OPENAI|AZURE|ANTHROPIC|GOOGLE|OLLAMA)_"

# Verify API keys are correct
npm start  # Look for provider initialization logs
```

#### Azure OpenAI authentication error
```bash
# Verify endpoint format (must end with /)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/

# Check deployment name matches Azure portal
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# Verify API version
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

#### Ollama not responding
```bash
# Check if Ollama is running
ollama list

# Start Ollama service
ollama serve

# Pull a model if none exist
ollama pull llama3.2:3b

# Verify endpoint accessibility
curl http://localhost:11434/api/version
```

### 📊 Observability Issues

#### W&B not collecting data
```bash
# Check if W&B is enabled
echo $WANDB_ENABLED

# Verify API key is set
wandb status

# Login if needed
wandb login

# Check logs for W&B initialization
npm start | grep -i wandb

# Verify project settings
echo "Project: $WANDB_PROJECT"
echo "Entity: $WANDB_ENTITY"
```

#### Missing metrics in dashboard
```bash
# Check if requests are being made
curl -X POST http://localhost:3978/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "conversationId": "test-123"}'

# Verify observability is logging
# Look for "Logged AI request to W&B" in console output

# Force data flush
curl -X POST http://localhost:3978/api/health
```

#### Feedback not recording
```bash
# Test feedback endpoint
curl -X POST http://localhost:3978/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"conversationId": "test-123", "rating": 5, "feedback": "test"}'

# Check W&B logs for feedback entries
```

### 🌐 Platform Issues

#### Microsoft 365 app not loading
```bash
# Check Microsoft 365 Agents Toolkit configuration
npm run validate:prerequisites

# Verify app package
# Check appPackage/manifest.json for correct bot ID

# Restart tunnel if needed
npm run debug:start-local-tunnel
```

#### Web interface not accessible
```bash
# Check if server is running on correct port
netstat -an | findstr :3978

# Verify no port conflicts
Get-NetTCPConnection -LocalPort 3978

# Test endpoint directly
curl http://localhost:3978/api/health
```

### 🔐 Authentication Issues

#### API key validation fails
```bash
# Test OpenAI API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Test Azure OpenAI
curl "$AZURE_OPENAI_ENDPOINT/openai/deployments?api-version=$AZURE_OPENAI_API_VERSION" \
  -H "api-key: $AZURE_OPENAI_API_KEY"

# Test Anthropic
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "claude-3-haiku-20240307", "max_tokens": 10, "messages": [{"role": "user", "content": "Hi"}]}'
```

### 🏗️ Build & Development Issues

#### TypeScript compilation errors
```bash
# Clean build
npm run build

# Check for type errors
npx tsc --noEmit

# Update dependencies
npm update
```

#### Module not found errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check import paths in error messages
# Ensure relative imports use correct paths
```

#### Port already in use
```bash
# Find process using port 3978
netstat -ano | findstr :3978

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or use different port
PORT=3979 npm start
```

### 📝 Environment Configuration

#### Environment variables not loading
```bash
# Check .env file exists
ls -la .env

# Verify .env format (no spaces around =)
# ✅ Correct: API_KEY=your-key
# ❌ Wrong:   API_KEY = your-key

# Check for BOM or encoding issues
file .env
```

#### Platform mapping not working
```bash
# Verify platform providers are set
echo "M365: $M365_AI_PROVIDER"
echo "Web: $WEB_AI_PROVIDER"

# Check provider exists
# Should match pattern: provider-name-default
# Example: azure-openai-default, anthropic-default
```

## 🩺 Health Monitoring

### Check System Health
```bash
# Overall system health
curl http://localhost:3978/api/health

# AI provider health
curl http://localhost:3978/api/ai/health

# Current configuration
curl http://localhost:3978/api/ai/config
```

### Detailed Diagnostics
```bash
# Start with verbose logging
DEBUG=* npm start

# Check specific provider health
curl http://localhost:3978/api/ai/health | jq '.providers'

# Monitor observability service
curl http://localhost:3978/api/health | jq '.observability'
```

## 🚀 Performance Optimization

### High Response Times
- **Use faster models**: Switch to GPT-3.5-turbo or Claude-3-haiku
- **Reduce max_tokens**: Lower token limits for faster responses
- **Local AI**: Use Ollama for development and testing
- **Caching**: Implement response caching for repeated queries

### High Costs
- **Model selection**: Use cost-effective models like Google Gemini Flash
- **Token optimization**: Set appropriate max_tokens limits
- **Local fallback**: Use Ollama as fallback provider
- **Monitor W&B**: Track costs and optimize based on usage patterns

### Memory Issues
- **Check Node.js memory**: `node --max-old-space-size=4096 src/index.ts`
- **Monitor AI provider usage**: Some providers cache responses
- **Restart application**: Periodic restarts can help with memory leaks

## 📞 Getting Help

### Debug Information to Collect
```bash
# System information
node --version
npm --version

# Dependencies
npm list --depth=0

# Environment (remove sensitive keys)
env | grep -E "(AI|PROVIDER|WANDB)" | sed 's/=.*/=***/'

# Recent logs (last 50 lines)
npm start 2>&1 | tail -50
```

### Support Channels
1. **Check documentation**: [Setup Guide](SETUP_AND_USAGE.md), [Architecture](ARCHITECTURE.md)
2. **Health endpoints**: Use API health checks for diagnostics
3. **GitHub Issues**: Create detailed issue with debug information
4. **Community**: Share logs (without API keys) for community help

### Before Reporting Issues
- [ ] Check this troubleshooting guide
- [ ] Verify environment configuration
- [ ] Test with minimal setup (one provider)
- [ ] Check API provider status pages
- [ ] Collect debug information listed above

---

**Quick Resolution Checklist:**
1. ✅ Environment variables properly set
2. ✅ At least one AI provider configured
3. ✅ API keys valid and not expired
4. ✅ No port conflicts
5. ✅ Dependencies installed (`npm install`)
6. ✅ Build successful (`npm run build`)
7. ✅ Health endpoints responding

### Cosmos DB & Memory issues

- If you've selected `MEMORY_PROVIDER=cosmos` and see TLS or connection errors when running locally, ensure you're either using the Cosmos emulator or have a valid `COSMOS_ENDPOINT` and `COSMOS_KEY` set in your environment.
- Local emulator tip: the local Cosmos emulator may set `NODE_TLS_REJECT_UNAUTHORIZED=0` temporarily when used by scripts — this is only for local testing. Do not use this in production.

If messages are not persisted:
1. Check provider selection in `.env` (`MEMORY_PROVIDER=filesystem` or `MEMORY_PROVIDER=cosmos`).
2. For filesystem: confirm `./data/conversations/` is writable.
3. For Cosmos: confirm endpoint/key and that the database/container exist (scripts are provided to list/read items).