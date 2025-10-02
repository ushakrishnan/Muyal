import { AIProvider, ProviderConfig, ProviderType, AIResponse, ProviderFactory } from "../../core/ai-types";

export interface OllamaConfig extends ProviderConfig {
  endpoint?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stream?: boolean;
  keepAlive?: string;
}

export class OllamaProvider implements AIProvider {
  public readonly type: ProviderType = 'ollama';
  public readonly name: string;
  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.config = config;
    this.name = config.name;
  }

  async generateResponse(prompt: string, context?: any): Promise<AIResponse> {
    try {
      const endpoint = this.config.endpoint || 'http://localhost:11434';
      
      const response = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model || 'llama2',
          prompt: context?.systemPrompt ? `${context.systemPrompt}\n\nUser: ${prompt}\nAssistant:` : prompt,
          stream: false, // We'll handle streaming separately if needed
          options: {
            temperature: this.config.temperature || 0.7,
            num_predict: this.config.maxTokens || 1000,
            top_p: this.config.topP || 0.9,
            top_k: this.config.topK || 40
          },
          keep_alive: this.config.keepAlive || '5m'
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${error}`);
      }

      const data = await response.json();
      
      return {
        content: data.response || '',
        confidence: 0.85, // Ollama doesn't provide confidence scores
        metadata: {
          model: this.config.model || 'llama2',
          provider: 'ollama',
          tokens: data.eval_count || 0,
          processingTime: data.total_duration || 0,
          finishReason: data.done ? 'stop' : 'length',
          providerResponse: data
        }
      };
    } catch (error) {
      throw new Error(`Ollama provider error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getHealth(): Promise<any> {
    try {
      const endpoint = this.config.endpoint || 'http://localhost:11434';
      
      // Check if Ollama is running
      const response = await fetch(`${endpoint}/api/tags`);

      const isHealthy = response.ok;
      let availableModels = [];
      
      if (isHealthy) {
        try {
          const data = await response.json();
          availableModels = data.models?.map((m: any) => m.name) || [];
        } catch (e) {
          // Ignore JSON parsing errors for health check
        }
      }

      return {
        isHealthy,
        status: response.status,
        timestamp: new Date().toISOString(),
        provider: 'ollama',
        endpoint: this.config.endpoint || 'http://localhost:11434',
        availableModels,
        currentModel: this.config.model || 'llama2',
        latency: 0
      };
    } catch (error) {
      return {
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        provider: 'ollama',
        endpoint: this.config.endpoint || 'http://localhost:11434'
      };
    }
  }

  validateConfig(): boolean {
    return !!(this.config.name);
  }

  getCapabilities(): string[] {
    return [
      'text-generation',
      'conversation',
      'local-inference',
      'offline-capable',
      'no-api-costs',
      'privacy-focused',
      'customizable-models'
    ];
  }

  getConfig(): OllamaConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<OllamaConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get available models from Ollama
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const endpoint = this.config.endpoint || 'http://localhost:11434';
      const response = await fetch(`${endpoint}/api/tags`);
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.warn('Failed to get Ollama models:', error);
      return [];
    }
  }

  /**
   * Pull a new model from Ollama registry
   */
  async pullModel(modelName: string): Promise<boolean> {
    try {
      const endpoint = this.config.endpoint || 'http://localhost:11434';
      const response = await fetch(`${endpoint}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: modelName
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error('Failed to pull Ollama model:', error);
      return false;
    }
  }
}

export class OllamaFactory implements ProviderFactory {
  create(config: ProviderConfig): AIProvider {
    return new OllamaProvider(config as OllamaConfig);
  }

  validateConfig(config: ProviderConfig): boolean {
    const ollamaConfig = config as OllamaConfig;
    return !!ollamaConfig.name;
  }
}

// Helper function to create Ollama provider from environment
export function createOllamaFromEnv(name: string = 'ollama-default'): OllamaProvider {
  const config: OllamaConfig = {
    name,
    enabled: true,
    timeout: 60000, // Ollama can be slower for larger models
    retries: 2,
    endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama2',
    temperature: parseFloat(process.env.OLLAMA_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.OLLAMA_MAX_TOKENS || '1000'),
    topP: parseFloat(process.env.OLLAMA_TOP_P || '0.9'),
    topK: parseInt(process.env.OLLAMA_TOP_K || '40'),
    keepAlive: process.env.OLLAMA_KEEP_ALIVE || '5m'
  };

  return new OllamaProvider(config);
}