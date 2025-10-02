import { AIProvider, ProviderConfig, ProviderType, AIResponse, ProviderFactory } from "../../core/ai-types";

export interface AzureOpenAIConfig extends ProviderConfig {
  apiKey: string;
  endpoint: string;
  deploymentName: string;
  apiVersion?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export class AzureOpenAIProvider implements AIProvider {
  public readonly type: ProviderType = 'azure-openai';
  public readonly name: string;
  private config: AzureOpenAIConfig;

  constructor(config: AzureOpenAIConfig) {
    this.config = config;
    this.name = config.name;
  }

  async generateResponse(prompt: string, context?: any): Promise<AIResponse> {
    try {
      const apiVersion = this.config.apiVersion || '2024-02-15-preview';
      const url = `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${apiVersion}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.config.apiKey
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: context?.systemPrompt || 'You are a helpful AI assistant.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: this.config.temperature || 0.7,
          max_tokens: this.config.maxTokens || 1000,
          top_p: this.config.topP || 1,
          frequency_penalty: this.config.frequencyPenalty || 0,
          presence_penalty: this.config.presencePenalty || 0
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText} - ${error}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices[0]?.message?.content || '',
        confidence: 0.9,
        metadata: {
          model: this.config.deploymentName,
          provider: 'azure-openai',
          tokens: data.usage?.total_tokens,
          processingTime: 0,
          finishReason: data.choices[0]?.finish_reason,
          providerResponse: data
        }
      };
    } catch (error) {
      throw new Error(`Azure OpenAI provider error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getHealth(): Promise<any> {
    try {
      const apiVersion = this.config.apiVersion || '2024-02-15-preview';
      const url = `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${apiVersion}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.config.apiKey
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1
        })
      });

      return {
        isHealthy: response.ok,
        status: response.status,
        timestamp: new Date().toISOString(),
        provider: 'azure-openai',
        endpoint: this.config.endpoint,
        deployment: this.config.deploymentName,
        latency: 0
      };
    } catch (error) {
      return {
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        provider: 'azure-openai'
      };
    }
  }

  validateConfig(): boolean {
    return !!(
      this.config.apiKey && 
      this.config.endpoint && 
      this.config.deploymentName && 
      this.config.name
    );
  }

  getCapabilities(): string[] {
    return [
      'text-generation',
      'conversation',
      'function-calling',
      'json-mode',
      'azure-integration',
      'enterprise-ready'
    ];
  }

  getConfig(): AzureOpenAIConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AzureOpenAIConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

export class AzureOpenAIFactory implements ProviderFactory {
  create(config: ProviderConfig): AIProvider {
    return new AzureOpenAIProvider(config as AzureOpenAIConfig);
  }

  validateConfig(config: ProviderConfig): boolean {
    const azureConfig = config as AzureOpenAIConfig;
    return !!(
      azureConfig.apiKey && 
      azureConfig.endpoint && 
      azureConfig.deploymentName && 
      azureConfig.name
    );
  }
}

// Helper function to create Azure OpenAI provider from environment
export function createAzureOpenAIFromEnv(name: string = 'azure-openai-default'): AzureOpenAIProvider {
  const config: AzureOpenAIConfig = {
    name,
    enabled: true,
    timeout: 30000,
    retries: 3,
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || '',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
    temperature: parseFloat(process.env.AZURE_OPENAI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.AZURE_OPENAI_MAX_TOKENS || '1000'),
    topP: parseFloat(process.env.AZURE_OPENAI_TOP_P || '1'),
    frequencyPenalty: parseFloat(process.env.AZURE_OPENAI_FREQUENCY_PENALTY || '0'),
    presencePenalty: parseFloat(process.env.AZURE_OPENAI_PRESENCE_PENALTY || '0')
  };

  if (!config.apiKey || !config.endpoint || !config.deploymentName) {
    throw new Error('AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, and AZURE_OPENAI_DEPLOYMENT_NAME environment variables are required');
  }

  return new AzureOpenAIProvider(config);
}