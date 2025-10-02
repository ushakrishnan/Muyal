// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

const config = {
  // Azure OpenAI Configuration (required)
  azureOpenAI: {
    key: process.env.AZURE_OPENAI_API_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3978'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // Microsoft 365 Configuration (optional)
  microsoft365: {
    teamsfxEnv: process.env.TEAMSFX_ENV || 'playground',
    playgroundPort: parseInt(process.env.TEAMSAPPTESTER_PORT || '56150'),
    botId: process.env.BOT_ID,
    teamsAppId: process.env.TEAMS_APP_ID,
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
  },

  // Web Interface Configuration (optional)
  web: {
    title: process.env.WEB_CHAT_TITLE || 'Muyal AI Agent',
    theme: process.env.WEB_CHAT_THEME || 'default',
    apiRateLimit: parseInt(process.env.API_RATE_LIMIT || '100'),
    maxHistoryLength: parseInt(process.env.MAX_CONVERSATION_HISTORY || '50'),
  },

  // Development Configuration
  development: {
    debugMode: process.env.DEBUG_MODE === 'true',
    verboseLogging: process.env.VERBOSE_LOGGING === 'true',
  },
};

// Validation: Ensure required config is present
if (!config.azureOpenAI.key || !config.azureOpenAI.endpoint || !config.azureOpenAI.deploymentName) {
  console.error('❌ Missing required Azure OpenAI configuration in .env file');
  console.error('Please ensure these variables are set:');
  console.error('- AZURE_OPENAI_API_KEY');
  console.error('- AZURE_OPENAI_ENDPOINT');
  console.error('- AZURE_OPENAI_DEPLOYMENT_NAME');
  console.error('- AZURE_OPENAI_API_VERSION (optional, defaults to 2024-12-01-preview)');
  process.exit(1);
}

export default config;
