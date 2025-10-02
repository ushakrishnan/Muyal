import { AIProvider, ProviderConfig, ProviderType, AIResponse, ProviderFactory } from "../../core/ai-types";

export interface OpenAIConfig extends ProviderConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export class OpenAIProvider implements AIProvider {
  public readonly type: ProviderType = 'openai';
  public readonly name: string;
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = config;
    this.name = config.name;
  }

  async generateResponse(prompt: string, context?: any): Promise<AIResponse> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model || 'gpt-4o',
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
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices[0]?.message?.content || '',
        confidence: 0.9, // OpenAI doesn't provide confidence scores
        metadata: {
          model: data.model,
          provider: 'openai',
          tokens: data.usage?.total_tokens,
          processingTime: 0, // Could implement actual timing
          finishReason: data.choices[0]?.finish_reason,
          providerResponse: data
        }
      };
    } catch (error) {
      throw new Error(`OpenAI provider error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getHealth(): Promise<any> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });

      return {
        isHealthy: response.ok,
        status: response.status,
        timestamp: new Date().toISOString(),
        provider: 'openai',
        latency: 0 // Could implement actual latency measurement
      };
    } catch (error) {
      return {
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        provider: 'openai'
      };
    }
  }

  validateConfig(): boolean {
    return !!(this.config.apiKey && this.config.name);
  }

  getCapabilities(): string[] {
    return [
      'text-generation',
      'conversation',
      'function-calling',
      'json-mode',
      'vision' // for GPT-4 Vision models
    ];
  }

  getConfig(): OpenAIConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<OpenAIConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

export class OpenAIFactory implements ProviderFactory {
  create(config: ProviderConfig): AIProvider {
    return new OpenAIProvider(config as OpenAIConfig);
  }

  validateConfig(config: ProviderConfig): boolean {
    const openAIConfig = config as OpenAIConfig;
    return !!(openAIConfig.apiKey && openAIConfig.name);
  }
}

// Helper function to create OpenAI provider from environment
export function createOpenAIFromEnv(name: string = 'openai-default'): OpenAIProvider {
  const config: OpenAIConfig = {
    name,
    enabled: true,
    timeout: 30000,
    retries: 3,
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
    topP: parseFloat(process.env.OPENAI_TOP_P || '1'),
    frequencyPenalty: parseFloat(process.env.OPENAI_FREQUENCY_PENALTY || '0'),
    presencePenalty: parseFloat(process.env.OPENAI_PRESENCE_PENALTY || '0')
  };

  if (!config.apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  return new OpenAIProvider(config);
}