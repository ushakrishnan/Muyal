// Implementation moved from legacy src/core/providers/google-ai-provider.ts
import { AIProvider, ProviderConfig, ProviderType, AIResponse, ProviderFactory } from "../../ai/types";

export interface GoogleAIConfig extends ProviderConfig {
	apiKey: string;
	model?: string;
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	topK?: number;
}

export class GoogleAIProvider implements AIProvider {
	public readonly type: ProviderType = 'google-ai';
	public readonly name: string;
	private config: GoogleAIConfig;

	constructor(config: GoogleAIConfig) {
		this.config = config;
		this.name = config.name;
	}

	async generateResponse(prompt: string, context?: any): Promise<AIResponse> {
		try {
			const model = this.config.model || 'gemini-pro';
			const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`;
      
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					contents: [
						{
							parts: [
								{
									text: context?.systemPrompt ? `${context.systemPrompt}\n\n${prompt}` : prompt
								}
							]
						}
					],
					generationConfig: {
						temperature: this.config.temperature || 0.7,
						maxOutputTokens: this.config.maxTokens || 1000,
						topP: this.config.topP || 0.8,
						topK: this.config.topK || 40
					}
				})
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(`Google AI API error: ${response.status} ${response.statusText} - ${error}`);
			}

			const data = await response.json();
      
			if (!data.candidates || data.candidates.length === 0) {
				throw new Error('No response generated from Google AI');
			}

			const candidate = data.candidates[0];
			const content = candidate.content?.parts?.[0]?.text || '';
      
			return {
				content,
				confidence: 0.9,
				metadata: {
					model,
					provider: 'google-ai',
					tokens: data.usageMetadata?.totalTokenCount,
					processingTime: 0,
					finishReason: candidate.finishReason,
					providerResponse: data
				}
			};
		} catch (error) {
			throw new Error(`Google AI provider error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	async getHealth(): Promise<any> {
		try {
			const model = this.config.model || 'gemini-pro';
			const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`;
      
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					contents: [
						{
							parts: [{ text: 'Hi' }]
						}
					],
					generationConfig: {
						maxOutputTokens: 1
					}
				})
			});

			return {
				isHealthy: response.ok,
				status: response.status,
				timestamp: new Date().toISOString(),
				provider: 'google-ai',
				model,
				latency: 0
			};
		} catch (error) {
			return {
				isHealthy: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString(),
				provider: 'google-ai'
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
			'multimodal',
			'fast-inference',
			'multilingual'
		];
	}

	getConfig(): GoogleAIConfig {
		return { ...this.config };
	}

	updateConfig(updates: Partial<GoogleAIConfig>): void {
		this.config = { ...this.config, ...updates };
	}
}

export class GoogleAIFactory implements ProviderFactory {
	create(config: ProviderConfig): AIProvider {
		return new GoogleAIProvider(config as GoogleAIConfig);
	}

	validateConfig(config: ProviderConfig): boolean {
		const googleConfig = config as GoogleAIConfig;
		return !!(googleConfig.apiKey && googleConfig.name);
	}
}

export function createGoogleAIFromEnv(name: string = 'google-ai-default'): GoogleAIProvider {
	const config: GoogleAIConfig = {
		name,
		enabled: true,
		timeout: 30000,
		retries: 3,
		apiKey: process.env.GOOGLE_AI_API_KEY || '',
		model: process.env.GOOGLE_AI_MODEL || 'gemini-pro',
		temperature: parseFloat(process.env.GOOGLE_AI_TEMPERATURE || '0.7'),
		maxTokens: parseInt(process.env.GOOGLE_AI_MAX_TOKENS || '1000'),
		topP: parseFloat(process.env.GOOGLE_AI_TOP_P || '0.8'),
		topK: parseInt(process.env.GOOGLE_AI_TOP_K || '40')
	};

	if (!config.apiKey) {
		throw new Error('GOOGLE_AI_API_KEY environment variable is required');
	}

	return new GoogleAIProvider(config);
}
