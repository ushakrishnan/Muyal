// Canonical AI types — keep the full definitions here (do not re-export)
export interface AIProvider {
	readonly name: string;
	readonly type: ProviderType;
	/** Generate response from prompt */
	generateResponse(prompt: string, context?: any): Promise<AIResponse>;
	/** Validate provider configuration */
	validateConfig(): boolean;
	/** Get provider health status */
	getHealth(): Promise<any>;
	/** Get provider capabilities */
	getCapabilities(): string[];
}

export interface AIProcessingOptions {
	model?: string;
	systemPrompt?: string;
	temperature?: number;
	maxTokens?: number;
	stream?: boolean;
	timeout?: number;
}

export interface ProviderHealth {
	isHealthy: boolean;
	latency?: number;
	error?: string;
	rateLimit?: {
		remaining: number;
		resetAt: Date;
	};
}

export interface ConversationMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp?: Date;
}

export interface AIResponse {
	content: string;
	confidence?: number;
	metadata: {
		model?: string;
		provider?: string;
		tokens?: number;
		processingTime?: number;
		finishReason?: string;
		[key: string]: any;
	};
	suggestions?: string[];
	actions?: ResponseAction[];
}

export interface ResponseAction {
	type: 'link' | 'quick_reply' | 'file_download' | 'external_call';
	label: string;
	value: string;
}

export interface ProviderConfig {
	name: string;
	enabled?: boolean;
	apiKey?: string;
	baseUrl?: string;
	model?: string;
	temperature?: number;
	maxTokens?: number;
	timeout?: number;
	retries?: number;
	customOptions?: Record<string, any>;
}

export interface PlatformProviderMapping {
	platform: string;
	primaryProvider: string;
	fallbackProvider?: string;
	modelOverride?: string;
	options?: AIProcessingOptions;
}

export type ProviderType = 
	| 'openai' 
	| 'azure-openai' 
	| 'azure-ai-foundry'
	| 'anthropic' 
	| 'google-ai' 
	| 'cohere' 
	| 'mistral' 
	| 'ollama' 
	| 'huggingface';

export interface ProviderFactory {
	create(config: ProviderConfig): AIProvider;
	validateConfig(config: ProviderConfig): boolean;
}
