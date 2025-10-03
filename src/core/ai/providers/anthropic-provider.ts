// Implementation moved from legacy src/core/providers/anthropic-provider.ts
import { AIProvider, ProviderConfig, ProviderType, AIResponse, ProviderFactory } from "../../ai/types";

export interface AnthropicConfig extends ProviderConfig {
	apiKey: string;
	model?: string;
	maxTokens?: number;
	temperature?: number;
	topP?: number;
	topK?: number;
}

export class AnthropicProvider implements AIProvider {
	public readonly type: ProviderType = 'anthropic';
	public readonly name: string;
	private config: AnthropicConfig;

	constructor(config: AnthropicConfig) {
		this.config = config;
		this.name = config.name;
	}

	async generateResponse(prompt: string, context?: any): Promise<AIResponse> {
		try {
			const response = await fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': this.config.apiKey,
					'anthropic-version': '2023-06-01'
				},
				body: JSON.stringify({
					model: this.config.model || 'claude-3-sonnet-20240229',
					max_tokens: this.config.maxTokens || 1000,
					temperature: this.config.temperature || 0.7,
					messages: [
						{
							role: 'user',
							content: prompt
						}
					],
					system: context?.systemPrompt || 'You are a helpful AI assistant.',
					top_p: this.config.topP,
					top_k: this.config.topK
				})
			});

			if (!response.ok) {
				throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
      
			return {
				content: data.content[0]?.text || '',
				confidence: 0.9,
				metadata: {
					model: data.model,
					provider: 'anthropic',
					tokens: data.usage?.output_tokens,
					processingTime: 0,
					finishReason: data.stop_reason,
					providerResponse: data
				}
			};
		} catch (error) {
			throw new Error(`Anthropic provider error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	async getHealth(): Promise<any> {
		try {
			const response = await fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': this.config.apiKey,
					'anthropic-version': '2023-06-01'
				},
				body: JSON.stringify({
					model: 'claude-3-haiku-20240307',
					max_tokens: 1,
					messages: [{ role: 'user', content: 'Hi' }]
				})
			});

			return {
				isHealthy: response.ok,
				status: response.status,
				timestamp: new Date().toISOString(),
				provider: 'anthropic',
				latency: 0
			};
		} catch (error) {
			return {
				isHealthy: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString(),
				provider: 'anthropic'
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
			'system-prompt',
			'long-context',
			'reasoning'
		];
	}

	getConfig(): AnthropicConfig {
		return { ...this.config };
	}

	updateConfig(updates: Partial<AnthropicConfig>): void {
		this.config = { ...this.config, ...updates };
	}
}

export class AnthropicFactory implements ProviderFactory {
	create(config: ProviderConfig): AIProvider {
		return new AnthropicProvider(config as AnthropicConfig);
	}

	validateConfig(config: ProviderConfig): boolean {
		const anthropicConfig = config as AnthropicConfig;
		return !!(anthropicConfig.apiKey && anthropicConfig.name);
	}
}

export function createAnthropicFromEnv(name: string = 'anthropic-default'): AnthropicProvider {
	const config: AnthropicConfig = {
		name,
		enabled: true,
		timeout: 30000,
		retries: 3,
		apiKey: process.env.ANTHROPIC_API_KEY || '',
		model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
		maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '1000'),
		temperature: parseFloat(process.env.ANTHROPIC_TEMPERATURE || '0.7'),
		topP: parseFloat(process.env.ANTHROPIC_TOP_P || '1'),
		topK: parseInt(process.env.ANTHROPIC_TOP_K || '40')
	};

	if (!config.apiKey) {
		throw new Error('ANTHROPIC_API_KEY environment variable is required');
	}

	return new AnthropicProvider(config);
}
