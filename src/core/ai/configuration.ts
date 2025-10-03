import { AIProviderRegistry } from "../ai/provider-registry";
import { PlatformType } from "../core-types";
import { ProviderType, PlatformProviderMapping } from "../ai/types";
import { createObservabilityFromEnv } from '../../services/observability/observability-service';

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

  static getObservability() {
    if (!this.observability) {
      this.observability = createObservabilityFromEnv();
    }
    return this.observability;
  }

  static async initialize(options: AIConfigurationOptions = {}): Promise<void> {
    if (this.initialized) {
      console.log('🔄 AI Configuration already initialized');
      return;
    }

    await this.getObservability().initialize();

    console.log('🚀 Initializing AI Configuration...');

    this.registerFactories();

    if (options.autoConfigureFromEnv !== false) {
      await this.autoConfigureFromEnvironment(options.enabledProviders);
    }

    this.configurePlatformMappings(options.platformMappings || []);

    if (options.defaultProvider) {
      AIProviderRegistry.setDefaultProviders(
        options.defaultProvider,
        options.fallbackProvider
      );
    } else {
      this.autoDetectDefaultProvider();
    }

    this.initialized = true;
    console.log('✅ AI Configuration initialized successfully');

    const providers = AIProviderRegistry.getAvailableProviders();
    console.log(`📋 Available providers: ${providers.join(', ')}`);
  }

  private static registerFactories(): void {
    AIProviderRegistry.registerFactory('openai', new OpenAIFactory());
    AIProviderRegistry.registerFactory('anthropic', new AnthropicFactory());
    AIProviderRegistry.registerFactory('azure-openai', new AzureOpenAIFactory());
    AIProviderRegistry.registerFactory('google-ai', new GoogleAIFactory());
    AIProviderRegistry.registerFactory('azure-ai-foundry', new AzureAIFoundryFactory());
    AIProviderRegistry.registerFactory('ollama', new OllamaFactory());
    console.log('✅ Registered AI provider factories');
  }

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
              const isLocal = process.env.AZURE_AI_FOUNDRY_LOCAL === 'true';
              if (isLocal || process.env.AZURE_AI_FOUNDRY_API_KEY) {
                const provider = createAzureAIFoundryFromEnv();
                AIProviderRegistry.createProvider('azure-ai-foundry', provider.getConfig());
              }
            }
            break;

          case 'ollama':
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

  private static configurePlatformMappings(mappings: PlatformProviderMapping[]): void {
    for (const mapping of mappings) {
      AIProviderRegistry.setPlatformMapping(mapping);
    }

    this.setDefaultPlatformMappings(mappings);
  }

  private static setDefaultPlatformMappings(existingMappings: PlatformProviderMapping[]): void {
    const existingPlatforms = new Set(existingMappings.map(m => m.platform));

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

  private static autoDetectDefaultProvider(): void {
    const availableProviders = AIProviderRegistry.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      console.warn('⚠️ No AI providers available');
      return;
    }

    const priorityOrder = ['openai-default', 'azure-openai-default', 'anthropic-default', 'google-ai-default'];
    
    let defaultProvider = availableProviders[0];
    let fallbackProvider = availableProviders.length > 1 ? availableProviders[1] : undefined;

    for (const preferred of priorityOrder) {
      if (availableProviders.includes(preferred)) {
        defaultProvider = preferred;
        fallbackProvider = availableProviders.find(p => p !== defaultProvider);
        break;
      }
    }

    AIProviderRegistry.setDefaultProviders(defaultProvider, fallbackProvider);
  }

  static async checkHealth(): Promise<Record<string, any>> {
    return await AIProviderRegistry.checkAllProvidersHealth();
  }

  static getConfigurationSummary(): any {
    return {
      initialized: this.initialized,
      availableProviders: AIProviderRegistry.getAvailableProviders(),
      platformMappings: Object.fromEntries(AIProviderRegistry.getPlatformMappings()),
      timestamp: new Date().toISOString()
    };
  }

  static reset(): void {
    AIProviderRegistry.clear();
    this.initialized = false;
    console.log('🔄 AI Configuration reset');
  }

  static getProviderForPlatform(platform: PlatformType): any {
    if (!this.initialized) {
      throw new Error('AI Configuration not initialized. Call AIConfiguration.initialize() first.');
    }
    return AIProviderRegistry.getProviderForPlatform(platform);
  }
}

export const EnvironmentHelper = {
  getAIEnvironmentVariables(): Record<string, string | undefined> {
    return {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OPENAI_MODEL: process.env.OPENAI_MODEL,
      OPENAI_TEMPERATURE: process.env.OPENAI_TEMPERATURE,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
      AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
      AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
      AZURE_OPENAI_DEPLOYMENT_NAME: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
      GOOGLE_AI_MODEL: process.env.GOOGLE_AI_MODEL,
      AZURE_AI_FOUNDRY_ENDPOINT: process.env.AZURE_AI_FOUNDRY_ENDPOINT,
      AZURE_AI_FOUNDRY_API_KEY: process.env.AZURE_AI_FOUNDRY_API_KEY,
      AZURE_AI_FOUNDRY_MODEL_NAME: process.env.AZURE_AI_FOUNDRY_MODEL_NAME,
      AZURE_AI_FOUNDRY_DEPLOYMENT_NAME: process.env.AZURE_AI_FOUNDRY_DEPLOYMENT_NAME,
      AZURE_AI_FOUNDRY_LOCAL: process.env.AZURE_AI_FOUNDRY_LOCAL,
      AZURE_AI_FOUNDRY_LOCAL_PORT: process.env.AZURE_AI_FOUNDRY_LOCAL_PORT,
      OLLAMA_ENABLED: process.env.OLLAMA_ENABLED,
      OLLAMA_ENDPOINT: process.env.OLLAMA_ENDPOINT,
      OLLAMA_MODEL: process.env.OLLAMA_MODEL,
      M365_AI_PROVIDER: process.env.M365_AI_PROVIDER,
      WEB_AI_PROVIDER: process.env.WEB_AI_PROVIDER,
      SLACK_AI_PROVIDER: process.env.SLACK_AI_PROVIDER
    };
  },

  validateEnvironment(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const env = this.getAIEnvironmentVariables();

    const hasOpenAI = !!env.OPENAI_API_KEY;
    const hasAnthropic = !!env.ANTHROPIC_API_KEY;
    const hasAzureOpenAI = !!(env.AZURE_OPENAI_API_KEY && env.AZURE_OPENAI_ENDPOINT);
    const hasGoogleAI = !!env.GOOGLE_AI_API_KEY;
    const hasAzureAIFoundry = !!env.AZURE_AI_FOUNDRY_ENDPOINT;
    const hasOllama = !!(env.OLLAMA_ENABLED === 'true' || env.OLLAMA_MODEL);

    if (!hasOpenAI && !hasAnthropic && !hasAzureOpenAI && !hasGoogleAI && !hasAzureAIFoundry && !hasOllama) {
      errors.push('No AI provider configured. At least one provider is required.');
    }

    if (env.AZURE_OPENAI_API_KEY && !env.AZURE_OPENAI_ENDPOINT) {
      errors.push('AZURE_OPENAI_ENDPOINT is required when AZURE_OPENAI_API_KEY is set');
    }

    if (env.AZURE_OPENAI_ENDPOINT && !env.AZURE_OPENAI_DEPLOYMENT_NAME) {
      warnings.push('AZURE_OPENAI_DEPLOYMENT_NAME not set, will use default');
    }

    if (env.AZURE_AI_FOUNDRY_ENDPOINT) {
      const isLocal = env.AZURE_AI_FOUNDRY_LOCAL === 'true';
      if (!isLocal && !env.AZURE_AI_FOUNDRY_API_KEY) {
        errors.push('AZURE_AI_FOUNDRY_API_KEY is required for hosted AI Foundry');
      }
      if (!isLocal && !env.AZURE_AI_FOUNDRY_MODEL_NAME && !env.AZURE_AI_FOUNDRY_DEPLOYMENT_NAME) {
        warnings.push('Either AZURE_AI_FOUNDRY_MODEL_NAME or AZURE_AI_FOUNDRY_DEPLOYMENT_NAME should be set');
      }
    }

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
// Legacy re-export removed during refactor. AIConfiguration is defined in this module.
