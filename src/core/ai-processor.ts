import { AIConfiguration } from "./ai-configuration";
import { PlatformType, AIResponse, ConversationMessage, AIProcessingError } from "./types";
import { ResponseFormatter } from "../services/formatting/response-formatter";
import { SuggestionGenerator } from "../services/formatting/suggestion-generator";
import { AIRequestMetrics } from "../services/observability/observability-service";

export interface AIProcessorOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  conversationId?: string;
}

export class AIProcessor {
  private systemPrompt: string;

  constructor() {
    this.systemPrompt = "You are an AI agent that can chat with users.";
  }

  /**
   * Process a message using the appropriate AI provider for the platform
   */
  async processMessage(
    platform: PlatformType,
    message: string, 
    history?: ConversationMessage[],
    options: AIProcessorOptions = {}
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const observability = AIConfiguration.getObservability();
    let provider;
    
    try {
      // Get the appropriate AI provider for this platform
      provider = AIConfiguration.getProviderForPlatform(platform);
      
      // Build context including history
      const context = {
        systemPrompt: options.systemPrompt || this.systemPrompt,
        history,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        model: options.model
      };
      
      // Generate response using the provider
      const response = await provider.generateResponse(message, context);
      
      const processingTime = Date.now() - startTime;
      
      // Calculate cost estimate
      const cost = this.estimateCost(provider.name, response.metadata.tokens);
      
      // Log successful request to Weave for tracing
      const metrics: AIRequestMetrics = {
        conversationId: options.conversationId || 'unknown',
        platform,
        provider: provider.name,
        model: response.metadata.model,
        promptTokens: this.estimatePromptTokens(message),
        completionTokens: response.metadata.tokens,
        totalTokens: (response.metadata.tokens || 0) + this.estimatePromptTokens(message),
        cost,
        responseTime: processingTime,
        success: true,
        timestamp: new Date(),
        prompt: message, // Include prompt for Weave tracing
        response: response.content, // Include response for Weave tracing
        metadata: {
          ...response.metadata,
          messageLength: message.length,
          responseLength: response.content.length,
          hasHistory: !!history?.length
        }
      };
      
      await observability.logAIRequest(metrics);

      return {
        content: ResponseFormatter.addEmojis(response.content),
        metadata: {
          model: response.metadata.model || 'unknown',
          tokens: response.metadata.tokens,
          processingTime,
          confidence: response.confidence || 0.85,
          provider: response.metadata.provider,
          platform
        },
        suggestions: SuggestionGenerator.generate(response.content, message),
        actions: this.generateActions(response.content, message)
      };

    } catch (error) {
      console.error(`AI Processing error for ${platform}:`, error);
      throw new AIProcessingError(
        error instanceof Error ? error.message : 'Unknown AI processing error'
      );
    }
  }

  /**
   * Static method for simple message processing
   */
  static async processMessage(
    platform: PlatformType,
    message: string,
    options: AIProcessorOptions = {}
  ): Promise<string> {
    const startTime = Date.now();
    const observability = AIConfiguration.getObservability();
    let provider;
    
    try {
      // Get the appropriate AI provider for this platform
      provider = AIConfiguration.getProviderForPlatform(platform);
      
      // Generate response using the provider
      const response = await provider.generateResponse(message, {
        systemPrompt: options.systemPrompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens
      });
      
      // Log successful request to Weave
      const processingTime = Date.now() - startTime;
      const metrics: AIRequestMetrics = {
        conversationId: options.conversationId || 'unknown',
        platform,
        provider: provider.name,
        model: response.metadata.model,
        promptTokens: response.metadata.tokens ? Math.round(response.metadata.tokens * 0.3) : undefined,
        completionTokens: response.metadata.tokens,
        totalTokens: response.metadata.tokens ? Math.round(response.metadata.tokens * 1.3) : undefined,
        responseTime: processingTime,
        success: true,
        timestamp: new Date(),
        prompt: message, // Include for Weave tracing
        response: response.content, // Include for Weave tracing
        metadata: {
          ...response.metadata,
          messageLength: message.length,
          responseLength: response.content.length
        }
      };
      
      await observability.logAIRequest(metrics);
      
      return response.content;
    } catch (error) {
      // Log error to observability
      const processingTime = Date.now() - startTime;
      
      const metrics: AIRequestMetrics = {
        conversationId: options.conversationId || 'unknown',
        platform,
        provider: provider?.name || 'unknown',
        responseTime: processingTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        prompt: message, // Include for Weave error tracing
        response: undefined, // No response due to error
        metadata: {
          messageLength: message.length
        }
      };
      
      await observability.logAIRequest(metrics);
      
      console.error(`AI processing error for ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Estimate cost for AI request (approximate)
   */
  private estimateCost(providerName: string, tokens?: number): number {
    if (!tokens) return 0;
    
    // Cost per 1K tokens (approximate, as of 2024)
    const costPer1K = {
      'openai': 0.03,
      'anthropic': 0.015,
      'azure-openai': 0.03,
      'google-ai': 0.0075,
      'ollama': 0, // Local, no API costs
      'azure-ai-foundry': 0.02
    };
    
    const rate = costPer1K[providerName as keyof typeof costPer1K] || 0.02;
    return (tokens / 1000) * rate;
  }
  
  /**
   * Estimate prompt tokens (rough approximation)
   */
  private estimatePromptTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Get AI provider capabilities for a platform
   */
  static getProviderCapabilities(platform: PlatformType): string[] {
    try {
      const provider = AIConfiguration.getProviderForPlatform(platform);
      return provider.getCapabilities();
    } catch (error) {
      console.warn(`Could not get capabilities for ${platform}:`, error);
      return [];
    }
  }

  /**
   * Check if a platform has AI provider configured
   */
  static hasProviderForPlatform(platform: PlatformType): boolean {
    try {
      AIConfiguration.getProviderForPlatform(platform);
      return true;
    } catch {
      return false;
    }
  }

  private generateActions(response: string, userMessage: string) {
    const actions = [];
    
    // Generate actions based on content
    if (response.toLowerCase().includes('azure') || response.toLowerCase().includes('deployment')) {
      actions.push({
        type: 'link' as const,
        label: 'View Azure Portal',
        value: 'https://portal.azure.com'
      });
    }
    
    if (response.toLowerCase().includes('documentation') || response.toLowerCase().includes('docs')) {
      actions.push({
        type: 'quick_reply' as const,
        label: 'Show me more documentation',
        value: 'Can you show me more detailed documentation?'
      });
    }
    
    return actions;
  }

  updateSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  getSystemPrompt(): string {
    return this.systemPrompt;
  }
}