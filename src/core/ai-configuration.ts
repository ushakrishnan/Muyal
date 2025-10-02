import { AIProviderRegistry } from "./ai-provider-registry";
import { PlatformType } from "./types";
import { ProviderType, PlatformProviderMapping } from "./ai-types";
import { createObservabilityFromEnv } from '../services/observability/observability-service';

// Import all provider factories
import { OpenAIFactory, createOpenAIFromEnv } from "./providers/openai-provider";
import { AnthropicFactory, createAnthropicFromEnv } from "./providers/anthropic-provider";
import { AzureOpenAIFactory, createAzureOpenAIFromEnv } from "./providers/azure-openai-provider";
import { GoogleAIFactory, createGoogleAIFromEnv } from "./providers/google-ai-provider";
import { AzureAIFoundryFactory, createAzureAIFoundryFromEnv } from "./providers/azure-ai-foundry-provider";
import { OllamaFactory, createOllamaFromEnv } from "./providers/ollama-provider";

export interface AIConfigurationOptions {
  enabledProviders?: ProviderType[];
  platformMappings?: PlatformProviderMapping[];
  defaultProvider?: string;
  fallbackProvider?: string;
  autoConfigureFromEnv?: boolean;
}

export class AIConfiguration {
  private static initialized = false;
  private static observability: any = null;

  /**
   * Get observability service
   */
  static getObservability() {
    if (!this.observability) {
      this.observability = createObservabilityFromEnv();
    }
    return this.observability;
  }

  /**
   * Initialize AI providers based on environment variables and configuration
   */
  static async initialize(options: AIConfigurationOptions = {}): Promise<void> {
    if (this.initialized) {
      console.log('🔄 AI Configuration already initialized');
      return;
    }

    // Initialize observability first (lazy creation)
    await this.getObservability().initialize();

    console.log('🚀 Initializing AI Configuration...');

    // Register all provider factories
    this.registerFactories();

    // Auto-configure providers from environment if enabled
    if (options.autoConfigureFromEnv !== false) {
      await this.autoConfigureFromEnvironment(options.enabledProviders);
    }

    // Set up platform mappings
    this.configurePlatformMappings(options.platformMappings || []);

    // Set default and fallback providers
    if (options.defaultProvider) {
      AIProviderRegistry.setDefaultProviders(
        options.defaultProvider,
        options.fallbackProvider
      );
    } else {
      // Auto-detect default provider
      this.autoDetectDefaultProvider();
    }

    this.initialized = true;
    console.log('✅ AI Configuration initialized successfully');
    
    // Log available providers
    const providers = AIProviderRegistry.getAvailableProviders();
    console.log(`📋 Available providers: ${providers.join(', ')}`);
  }

  /**
   * Register all provider factories
   */
  private static registerFactories(): void {
    AIProviderRegistry.registerFactory('openai', new OpenAIFactory());
    AIProviderRegistry.registerFactory('anthropic', new AnthropicFactory());
    AIProviderRegistry.registerFactory('azure-openai', new AzureOpenAIFactory());
    AIProviderRegistry.registerFactory('google-ai', new GoogleAIFactory());
    AIProviderRegistry.registerFactory('azure-ai-foundry', new AzureAIFoundryFactory());
    AIProviderRegistry.registerFactory('ollama', new OllamaFactory());
    
    // TODO: Add other providers (Cohere, Mistral, HuggingFace)
    console.log('✅ Registered AI provider factories');
  }

  /**
   * Auto-configure providers from environment variables
   */
  private static async autoConfigureFromEnvironment(enabledProviders?: ProviderType[]): Promise<void> {
    const providers: ProviderType[] = enabledProviders || ['openai', 'anthropic', 'azure-openai', 'google-ai', 'azure-ai-foundry', 'ollama'];

    for (const providerType of providers) {
      try {
        switch (providerType) {
          case 'openai':
            if (process.env.OPENAI_API_KEY) {
              const provider = createOpenAIFromEnv();
              AIProviderRegistry.createProvider('openai', provider.getConfig());
            }
            break;

          case 'anthropic':
            if (process.env.ANTHROPIC_API_KEY) {
              const provider = createAnthropicFromEnv();
              AIProviderRegistry.createProvider('anthropic', provider.getConfig());
            }
            break;

          case 'azure-openai':
            if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
              const provider = createAzureOpenAIFromEnv();
              AIProviderRegistry.createProvider('azure-openai', provider.getConfig());
            }
            break;

          case 'google-ai':
            if (process.env.GOOGLE_AI_API_KEY) {
              const provider = createGoogleAIFromEnv();
              AIProviderRegistry.createProvider('google-ai', provider.getConfig());
            }
            break;

          case 'azure-ai-foundry':
            if (process.env.AZURE_AI_FOUNDRY_ENDPOINT) {
              // Check if it's local or hosted
              const isLocal = process.env.AZURE_AI_FOUNDRY_LOCAL === 'true';
              if (isLocal || process.env.AZURE_AI_FOUNDRY_API_KEY) {
                const provider = createAzureAIFoundryFromEnv();
                AIProviderRegistry.createProvider('azure-ai-foundry', provider.getConfig());
              }
            }
            break;

          case 'ollama':
            // Ollama doesn't require API keys, just check if it's enabled
            if (process.env.OLLAMA_ENABLED === 'true' || process.env.OLLAMA_MODEL) {
              const provider = createOllamaFromEnv();
              AIProviderRegistry.createProvider('ollama', provider.getConfig());
            }
            break;

          default:
            console.warn(`⚠️ Provider type ${providerType} not implemented yet`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to configure ${providerType}: ${error}`);
      }
    }
  }

  /**
   * Configure platform-specific provider mappings
   */
  private static configurePlatformMappings(mappings: PlatformProviderMapping[]): void {
    // Set provided mappings
    for (const mapping of mappings) {
      AIProviderRegistry.setPlatformMapping(mapping);
    }

    // Set default mappings from environment if not provided
    this.setDefaultPlatformMappings(mappings);
  }

  /**
   * Set default platform mappings from environment variables
   */
  private static setDefaultPlatformMappings(existingMappings: PlatformProviderMapping[]): void {
    const existingPlatforms = new Set(existingMappings.map(m => m.platform));

    // Microsoft 365 - prefer Azure OpenAI for compliance
    if (!existingPlatforms.has('microsoft365')) {
      const m365Provider = process.env.M365_AI_PROVIDER || 
                          (process.env.AZURE_OPENAI_API_KEY ? 'azure-openai-default' : 
                           process.env.OPENAI_API_KEY ? 'openai-default' : null);
      
      if (m365Provider) {
        AIProviderRegistry.setPlatformMapping({
          platform: 'microsoft365',
          primaryProvider: m365Provider,
          fallbackProvider: process.env.M365_AI_FALLBACK_PROVIDER
        });
      }
    }

    // Web - prefer OpenAI or Anthropic for general use
    if (!existingPlatforms.has('web')) {
      const webProvider = process.env.WEB_AI_PROVIDER || 
                         (process.env.OPENAI_API_KEY ? 'openai-default' : 
                          process.env.ANTHROPIC_API_KEY ? 'anthropic-default' : null);
      
      if (webProvider) {
        AIProviderRegistry.setPlatformMapping({
          platform: 'web',
          primaryProvider: webProvider,
          fallbackProvider: process.env.WEB_AI_FALLBACK_PROVIDER
        });
      }
    }

    // Slack - prefer fast models
    if (!existingPlatforms.has('slack')) {
      const slackProvider = process.env.SLACK_AI_PROVIDER || 
                           (process.env.GOOGLE_AI_API_KEY ? 'google-ai-default' : 
                            process.env.OPENAI_API_KEY ? 'openai-default' : null);
      
      if (slackProvider) {
        AIProviderRegistry.setPlatformMapping({
          platform: 'slack',
          primaryProvider: slackProvider,
          fallbackProvider: process.env.SLACK_AI_FALLBACK_PROVIDER
        });
      }
    }
  }

  /**
   * Auto-detect and set default provider
   */
  private static autoDetectDefaultProvider(): void {
    const availableProviders = AIProviderRegistry.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      console.warn('⚠️ No AI providers available');
      return;
    }

    // Priority order for default provider
    const priorityOrder = ['openai-default', 'azure-openai-default', 'anthropic-default', 'google-ai-default'];
    
    let defaultProvider = availableProviders[0]; // fallback to first available
    let fallbackProvider = availableProviders.length > 1 ? availableProviders[1] : undefined;

    // Find highest priority available provider
    for (const preferred of priorityOrder) {
      if (availableProviders.includes(preferred)) {
        defaultProvider = preferred;
        // Set fallback to next available provider that's not the default
        fallbackProvider = availableProviders.find(p => p !== defaultProvider);
        break;
      }
    }

    AIProviderRegistry.setDefaultProviders(defaultProvider, fallbackProvider);
  }

  /**
   * Check health of all providers
   */
  static async checkHealth(): Promise<Record<string, any>> {
    return await AIProviderRegistry.checkAllProvidersHealth();
  }

  /**
   * Get configuration summary
   */
  static getConfigurationSummary(): any {
    return {
      initialized: this.initialized,
      availableProviders: AIProviderRegistry.getAvailableProviders(),
      platformMappings: Object.fromEntries(AIProviderRegistry.getPlatformMappings()),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset configuration (useful for testing)
   */
  static reset(): void {
    AIProviderRegistry.clear();
    this.initialized = false;
    console.log('🔄 AI Configuration reset');
  }

  /**
   * Get provider for platform
   */
  static getProviderForPlatform(platform: PlatformType): any {
    if (!this.initialized) {
      throw new Error('AI Configuration not initialized. Call AIConfiguration.initialize() first.');
    }
    return AIProviderRegistry.getProviderForPlatform(platform);
  }
}

// Environment variable helper functions
export const EnvironmentHelper = {
  /**
   * Get all AI-related environment variables
   */
  getAIEnvironmentVariables(): Record<string, string | undefined> {
    return {
      // OpenAI
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OPENAI_MODEL: process.env.OPENAI_MODEL,
      OPENAI_TEMPERATURE: process.env.OPENAI_TEMPERATURE,
      
      // Anthropic
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
      
      // Azure OpenAI
      AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
      AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
      AZURE_OPENAI_DEPLOYMENT_NAME: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      
      // Google AI
      GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
      GOOGLE_AI_MODEL: process.env.GOOGLE_AI_MODEL,
      
      // Azure AI Foundry
      AZURE_AI_FOUNDRY_ENDPOINT: process.env.AZURE_AI_FOUNDRY_ENDPOINT,
      AZURE_AI_FOUNDRY_API_KEY: process.env.AZURE_AI_FOUNDRY_API_KEY,
      AZURE_AI_FOUNDRY_MODEL_NAME: process.env.AZURE_AI_FOUNDRY_MODEL_NAME,
      AZURE_AI_FOUNDRY_DEPLOYMENT_NAME: process.env.AZURE_AI_FOUNDRY_DEPLOYMENT_NAME,
      AZURE_AI_FOUNDRY_LOCAL: process.env.AZURE_AI_FOUNDRY_LOCAL,
      AZURE_AI_FOUNDRY_LOCAL_PORT: process.env.AZURE_AI_FOUNDRY_LOCAL_PORT,
      
      // Ollama
      OLLAMA_ENABLED: process.env.OLLAMA_ENABLED,
      OLLAMA_ENDPOINT: process.env.OLLAMA_ENDPOINT,
      OLLAMA_MODEL: process.env.OLLAMA_MODEL,
      
      // Platform mappings
      M365_AI_PROVIDER: process.env.M365_AI_PROVIDER,
      WEB_AI_PROVIDER: process.env.WEB_AI_PROVIDER,
      SLACK_AI_PROVIDER: process.env.SLACK_AI_PROVIDER
    };
  },

  /**
   * Validate environment configuration
   */
  validateEnvironment(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const env = this.getAIEnvironmentVariables();
    
    // Check if at least one provider is configured
    const hasOpenAI = !!env.OPENAI_API_KEY;
    const hasAnthropic = !!env.ANTHROPIC_API_KEY;
    const hasAzureOpenAI = !!(env.AZURE_OPENAI_API_KEY && env.AZURE_OPENAI_ENDPOINT);
    const hasGoogleAI = !!env.GOOGLE_AI_API_KEY;
    const hasAzureAIFoundry = !!env.AZURE_AI_FOUNDRY_ENDPOINT;
    const hasOllama = !!(env.OLLAMA_ENABLED === 'true' || env.OLLAMA_MODEL);
    
    if (!hasOpenAI && !hasAnthropic && !hasAzureOpenAI && !hasGoogleAI && !hasAzureAIFoundry && !hasOllama) {
      errors.push('No AI provider configured. At least one provider is required.');
    }
    
    // Azure OpenAI specific validation
    if (env.AZURE_OPENAI_API_KEY && !env.AZURE_OPENAI_ENDPOINT) {
      errors.push('AZURE_OPENAI_ENDPOINT is required when AZURE_OPENAI_API_KEY is set');
    }
    
    if (env.AZURE_OPENAI_ENDPOINT && !env.AZURE_OPENAI_DEPLOYMENT_NAME) {
      warnings.push('AZURE_OPENAI_DEPLOYMENT_NAME not set, will use default');
    }
    
    // Azure AI Foundry specific validation
    if (env.AZURE_AI_FOUNDRY_ENDPOINT) {
      const isLocal = env.AZURE_AI_FOUNDRY_LOCAL === 'true';
      if (!isLocal && !env.AZURE_AI_FOUNDRY_API_KEY) {
        errors.push('AZURE_AI_FOUNDRY_API_KEY is required for hosted AI Foundry');
      }
      if (!isLocal && !env.AZURE_AI_FOUNDRY_MODEL_NAME && !env.AZURE_AI_FOUNDRY_DEPLOYMENT_NAME) {
        warnings.push('Either AZURE_AI_FOUNDRY_MODEL_NAME or AZURE_AI_FOUNDRY_DEPLOYMENT_NAME should be set');
      }
    }
    
    // Ollama specific validation
    if (hasOllama && !env.OLLAMA_MODEL) {
      warnings.push('OLLAMA_MODEL not specified, will use default (llama2)');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
};