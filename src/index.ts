import { startServer } from "@microsoft/agents-hosting-express";
import { agentApp, createWebAdapter } from "./agent";
import express from "express";
import path from "path";
import config from "./config";
import { ConversationHandler } from "./core/conversation/handler";
import { AIConfiguration, EnvironmentHelper } from "./core/ai/configuration";
import { integratedServer } from "./integrations/mcp/mcp-a2a-integration";
import { conversationMemory } from "./core/memory";
import { initMemory } from "./core/memory";

console.log(`🚀 Starting Muyal AI Agent on port ${config.server.port}`);
if (config.development.debugMode) {
  console.log(`🔧 Debug mode enabled`);
}

async function initializeAI() {
  try {
    console.log('🧠 Initializing Multi-LLM AI Configuration...');
    
    // Validate environment first
    const envValidation = EnvironmentHelper.validateEnvironment();
    if (!envValidation.valid) {
      console.error('❌ Environment validation failed:');
      envValidation.errors.forEach(error => console.error(`  - ${error}`));
      if (envValidation.warnings.length > 0) {
        console.warn('⚠️ Environment warnings:');
        envValidation.warnings.forEach(warning => console.warn(`  - ${warning}`));
      }
      throw new Error('Invalid environment configuration');
    }

    if (envValidation.warnings.length > 0) {
      console.warn('⚠️ Environment warnings:');
      envValidation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    // Initialize AI configuration with observability
    await AIConfiguration.initialize();
    
    // Initialize conversation handler
    await ConversationHandler.initialize();

    // Initialize conversation memory provider (filesystem or cosmos)
    try {
      await initMemory();
      console.log('✅ Conversation memory provider initialized');
    } catch (err) {
      console.warn('⚠️ Failed to initialize memory provider:', err);
    }
    
    // Show configuration summary
    const summary = AIConfiguration.getConfigurationSummary();
    console.log('📋 AI Configuration Summary:');
    console.log(`  Available providers: ${summary.availableProviders.join(', ')}`);
    console.log(`  Platform mappings: ${Object.keys(summary.platformMappings).length} configured`);
    
    // Check provider health
    const health = await AIConfiguration.checkHealth();
    const healthyProviders = Object.entries(health).filter(([_, h]) => h.isHealthy).map(([name, _]) => name);
    console.log(`✅ Healthy providers: ${healthyProviders.join(', ')}`);
    
    if (healthyProviders.length === 0) {
      console.warn('⚠️ No healthy AI providers detected. Check your API keys and network connectivity.');
    }

  } catch (error) {
    console.error('❌ Failed to initialize AI configuration:', error);
    console.error('💡 Please check your .env file and API keys. See env/.env.example for configuration help.');
    // Don't exit - allow the app to start but warn about limited functionality
  }
}

// Initialize AI before starting server
initializeAI().then(() => {
  startApplication();
}).catch((error) => {
  console.error('❌ Critical initialization error:', error);
  console.log('🚀 Starting server anyway with limited functionality...');
  startApplication();
});

function startApplication() {
  // Create web adapter
  const webAdapter = createWebAdapter();

  // Start the Microsoft 365 Agents server
  const server = startServer(agentApp);

  // Add web routes to the existing server
  server.use(express.json());

  // Serve static files (your custom webpage)
  server.use(express.static(path.join(__dirname, '../public')));

  // Web API endpoint for chat
  server.post('/api/chat', async (req, res) => {
    try {
      const { message, conversationId = 'web-user' } = req.body;
      
      if (!message) {
        return res.status(400).json({ 
          success: false, 
          error: 'Message is required',
          timestamp: new Date().toISOString()
        });
      }

      if (typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Message must be a non-empty string',
          timestamp: new Date().toISOString()
        });
      }

      // Use UnifiedAgentServer chat function with knowledge library integration
      const result = await integratedServer.getUnifiedServer().callFunction('chat', {
        message,
        conversationId,
        platform: 'web',
        aiProvider: undefined // Use default
      });

      // Send the enhanced response
      res.json({
        success: true,
        response: result.content,
        conversationId,
        timestamp: new Date().toISOString(),
        metadata: {
          provider: result.provider,
          tokens: result.tokens,
          cost: result.cost,
          knowledge_sources_used: result.knowledge_sources_used,
          suggestions: result.suggestions,
          enhanced: result.enhanced
        }
      });

    } catch (error) {
      console.error('Chat API error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // User feedback endpoint for W&B tracking
  server.post('/api/feedback', async (req, res) => {
    try {
      const { conversationId, rating, feedback } = req.body;
      
      if (!conversationId || rating === undefined) {
        return res.status(400).json({ 
          success: false, 
          error: 'conversationId and rating are required' 
        });
      }

      const observability = AIConfiguration.getObservability();
      await observability.logUserFeedback(conversationId, rating, feedback);

      res.json({ 
        success: true, 
        message: 'Feedback recorded',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Feedback API error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to record feedback' 
      });
    }
  });

  // Get conversation history (legacy endpoint - redirects to new memory system)
  server.get('/api/conversation/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const messages = await conversationMemory.getConversation(id);
      const context = await conversationMemory.getContext(id);

      // Convert to legacy format for backward compatibility
      const legacyHistory = (messages || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata
      }));

      res.json({ 
        success: true, 
        history: legacyHistory,
        context,
        conversationId: id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('History API error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve conversation history' 
      });
    }
  });

  // Clear conversation (updated to use memory service)
  server.delete('/api/conversation/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await conversationMemory.clearConversation(id);
      res.json({ 
        success: true, 
        message: 'Conversation cleared',
        conversationId: id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Clear conversation error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to clear conversation' 
      });
    }
  });

  // Conversation Memory Endpoints

  // Get all conversations list
  server.get('/api/conversations', async (req, res) => {
    try {
      const conversations = await conversationMemory.getAllConversations();
      res.json({
        success: true,
        conversations,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve conversations' 
      });
    }
  });

  // Get specific conversation with full history
  server.get('/api/conversations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const messages = await conversationMemory.getConversation(id);
      const context = await conversationMemory.getContext(id);
      res.json({
        success: true,
        conversation: {
          id,
          messages,
          context,
          messageCount: (messages || []).length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve conversation' 
      });
    }
  });

  // Delete specific conversation
  server.delete('/api/conversations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await conversationMemory.clearConversation(id);
      res.json({
        success: true,
        message: 'Conversation deleted',
        conversationId: id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Delete conversation error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to delete conversation' 
      });
    }
  });

  // Get conversation memory statistics
  server.get('/api/memory/stats', async (req, res) => {
    try {
      const stats = await conversationMemory.getStats();
      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Memory stats error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve memory statistics' 
      });
    }
  });

  // AI Provider Health endpoint
  server.get('/api/ai/health', async (req, res) => {
    try {
      const health = await AIConfiguration.checkHealth();
      res.json({
        success: true,
        providers: health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('AI Health check error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to check AI provider health' 
      });
    }
  });

  // AI Configuration endpoint
  server.get('/api/ai/config', (req, res) => {
    try {
      const summary = AIConfiguration.getConfigurationSummary();
      res.json({
        success: true,
        configuration: summary,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('AI Config error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve AI configuration' 
      });
    }
  });

  // Analytics endpoint
  server.get('/api/analytics', (req, res) => {
    try {
      const analytics = webAdapter.getAnalytics();
      res.json({
        success: true,
        analytics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Analytics API error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve analytics' 
      });
    }
  });

  // Health check endpoint
  server.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Serve the chat webpage at root
  server.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  console.log('🤖 Muyal Agent started!');
  console.log('📱 Microsoft 365 integration: Available via bot framework');
  console.log('🌐 Web interface: http://localhost:3978');
  console.log('🔗 Chat API: http://localhost:3978/api/chat');
  console.log('👤 Feedback API: http://localhost:3978/api/feedback');
  console.log('🧠 AI Health API: http://localhost:3978/api/ai/health');
  console.log('⚙️ AI Config API: http://localhost:3978/api/ai/config');
  console.log('📊 W&B Dashboard: Check https://wandb.ai for metrics');

  // Graceful shutdown handler
  const gracefulShutdown = async (signal: string) => {
    console.log(`🛑 Received ${signal}, shutting down gracefully...`);
    
    // Flush observability data
    const observability = AIConfiguration.getObservability();
    await observability.flush();
    
    console.log('👋 Application shut down');
    process.exit(0);
  };
  
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}
