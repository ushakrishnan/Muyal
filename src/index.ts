import { startServer } from "@microsoft/agents-hosting-express";
import { agentApp, createWebAdapter } from "./agent";
import express from "express";
import path from "path";
import config from "./config";
import { ConversationHandler } from "./core/conversation-handler";
import { AIConfiguration, EnvironmentHelper } from "./core/ai-configuration";

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

      // Process the message using uber handler (response sent directly)
      await webAdapter.processMessage(message, conversationId, res);

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

  // Get conversation history
  server.get('/api/conversation/:id', (req, res) => {
    try {
      const { id } = req.params;
      const history = webAdapter.getConversationHistory(id);
      res.json({ 
        success: true, 
        history, 
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

  // Clear conversation
  server.delete('/api/conversation/:id', (req, res) => {
    try {
      const { id } = req.params;
      webAdapter.clearConversation(id);
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
