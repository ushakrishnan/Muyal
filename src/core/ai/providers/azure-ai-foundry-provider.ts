// Implementation moved from legacy src/core/providers/azure-ai-foundry-provider.ts
import { AIProvider, ProviderConfig, ProviderType, AIResponse, ProviderFactory } from "../../ai/types";

export interface AzureAIFoundryConfig extends ProviderConfig {
	endpoint: string;
	apiKey?: string;
	deploymentName?: string;
	modelName?: string;
	apiVersion?: string;
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	isLocal?: boolean;
	localPort?: number;
}

export class AzureAIFoundryProvider implements AIProvider {
	public readonly type: ProviderType = 'azure-ai-foundry';
	public readonly name: string;
	private config: AzureAIFoundryConfig;

	constructor(config: AzureAIFoundryConfig) {
		this.config = config;
		this.name = config.name;
	}

	async generateResponse(prompt: string, context?: any): Promise<AIResponse> {
		try {
			const endpoint = this.buildEndpoint();
			const headers = this.buildHeaders();
      
			const requestBody = {
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
				top_p: this.config.topP || 1
			};

			if (!this.config.isLocal && this.config.modelName) {
				(requestBody as any).model = this.config.modelName;
			}

			const response = await fetch(endpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(`Azure AI Foundry API error: ${response.status} ${response.statusText} - ${error}`);
			}

			const data = await response.json();
      
			return {
				content: data.choices[0]?.message?.content || '',
				confidence: 0.9,
				metadata: {
					model: this.config.modelName || this.config.deploymentName || 'foundry-model',
					provider: 'azure-ai-foundry',
					tokens: data.usage?.total_tokens,
					processingTime: 0,
					finishReason: data.choices[0]?.finish_reason,
					isLocal: this.config.isLocal,
					providerResponse: data
				}
			};
		} catch (error) {
			throw new Error(`Azure AI Foundry provider error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	private buildEndpoint(): string {
		if (this.config.isLocal) {
			const port = this.config.localPort || 8080;
			return `http://localhost:${port}/v1/chat/completions`;
		} else {
			const apiVersion = this.config.apiVersion || '2024-05-01-preview';
			if (this.config.deploymentName) {
				return `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${apiVersion}`;
			} else {
				return `${this.config.endpoint}/chat/completions?api-version=${apiVersion}`;
			}
		}
	}

	private buildHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		if (this.config.isLocal) {
			if (this.config.apiKey) {
				headers['Authorization'] = `Bearer ${this.config.apiKey}`;
			}
		} else {
			if (this.config.apiKey) {
				headers['api-key'] = this.config.apiKey;
			}
		}

		return headers;
	}

	async getHealth(): Promise<any> {
		try {
			const endpoint = this.buildEndpoint();
			const headers = this.buildHeaders();
      
			const response = await fetch(endpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					messages: [{ role: 'user', content: 'Hi' }],
					max_tokens: 1,
					...((!this.config.isLocal && this.config.modelName) && { model: this.config.modelName })
				})
			});

			return {
				isHealthy: response.ok,
				status: response.status,
				timestamp: new Date().toISOString(),
				provider: 'azure-ai-foundry',
				endpoint: this.config.endpoint,
				isLocal: this.config.isLocal,
				model: this.config.modelName || this.config.deploymentName,
				latency: 0
			};
		} catch (error) {
			return {
				isHealthy: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString(),
				provider: 'azure-ai-foundry',
				isLocal: this.config.isLocal
			};
		}
	}

	validateConfig(): boolean {
		const hasEndpoint = !!this.config.endpoint;
		const hasName = !!this.config.name;
    
		if (this.config.isLocal) {
			return hasEndpoint && hasName;
		} else {
			const hasAuth = !!this.config.apiKey;
			const hasModel = !!(this.config.deploymentName || this.config.modelName);
			return hasEndpoint && hasName && hasAuth && hasModel;
		}
	}

	getCapabilities(): string[] {
		const baseCapabilities = [
			'text-generation',
			'conversation',
			'azure-integration'
		];

		if (this.config.isLocal) {
			return [...baseCapabilities, 'local-inference', 'no-api-costs'];
		} else {
			return [
				...baseCapabilities,
				'hosted-models',
				'enterprise-ready',
				'multiple-model-support',
				'managed-infrastructure'
			];
		}
	}

	getConfig(): AzureAIFoundryConfig {
		return { ...this.config };
	}

	updateConfig(updates: Partial<AzureAIFoundryConfig>): void {
		this.config = { ...this.config, ...updates };
	}
}

export class AzureAIFoundryFactory implements ProviderFactory {
	create(config: ProviderConfig): AIProvider {
		return new AzureAIFoundryProvider(config as AzureAIFoundryConfig);
	}

	validateConfig(config: ProviderConfig): boolean {
		const foundryConfig = config as AzureAIFoundryConfig;
		const hasEndpoint = !!foundryConfig.endpoint;
		const hasName = !!foundryConfig.name;
    
		if (foundryConfig.isLocal) {
			return hasEndpoint && hasName;
		} else {
			const hasAuth = !!foundryConfig.apiKey;
			const hasModel = !!(foundryConfig.deploymentName || foundryConfig.modelName);
			return hasEndpoint && hasName && hasAuth && hasModel;
		}
	}
}

export function createAzureAIFoundryFromEnv(name: string = 'azure-ai-foundry-default'): AzureAIFoundryProvider {
	const isLocal = process.env.AZURE_AI_FOUNDRY_LOCAL === 'true';
  
	const config: AzureAIFoundryConfig = {
		name,
		enabled: true,
		timeout: 30000,
		retries: 3,
		endpoint: process.env.AZURE_AI_FOUNDRY_ENDPOINT || '',
		apiKey: process.env.AZURE_AI_FOUNDRY_API_KEY,
		deploymentName: process.env.AZURE_AI_FOUNDRY_DEPLOYMENT_NAME,
		modelName: process.env.AZURE_AI_FOUNDRY_MODEL_NAME,
		apiVersion: process.env.AZURE_AI_FOUNDRY_API_VERSION || '2024-05-01-preview',
		temperature: parseFloat(process.env.AZURE_AI_FOUNDRY_TEMPERATURE || '0.7'),
		maxTokens: parseInt(process.env.AZURE_AI_FOUNDRY_MAX_TOKENS || '1000'),
		topP: parseFloat(process.env.AZURE_AI_FOUNDRY_TOP_P || '1'),
		isLocal,
		localPort: parseInt(process.env.AZURE_AI_FOUNDRY_LOCAL_PORT || '8080')
	};

	if (!config.endpoint) {
		throw new Error('AZURE_AI_FOUNDRY_ENDPOINT environment variable is required');
	}

	if (!isLocal && !config.apiKey) {
		throw new Error('AZURE_AI_FOUNDRY_API_KEY environment variable is required for hosted AI Foundry');
	}

	if (!isLocal && !config.deploymentName && !config.modelName) {
		throw new Error('Either AZURE_AI_FOUNDRY_DEPLOYMENT_NAME or AZURE_AI_FOUNDRY_MODEL_NAME is required for hosted AI Foundry');
	}

	return new AzureAIFoundryProvider(config);
}
