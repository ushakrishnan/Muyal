import { ConversationInput, ConversationContext, ValidationError } from "../core-types";
import { AIProcessor } from "../ai/processor";
import { AdapterRegistry } from "../../adapters/base/adapter-registry";
import { AIConfiguration } from "../ai/configuration";

export class ConversationHandler {
  private aiProcessor: AIProcessor;
  private static initialized = false;

  constructor() {
    this.aiProcessor = new AIProcessor();
  }

  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await AIConfiguration.initialize({
        autoConfigureFromEnv: true,
        enabledProviders: ['openai', 'anthropic', 'azure-openai', 'google-ai', 'azure-ai-foundry', 'ollama']
      });

      this.initialized = true;
      console.log('\u2705 ConversationHandler initialized with multi-LLM support');
    } catch (error) {
      console.error('\u274c Failed to initialize ConversationHandler:', error);
      throw error;
    }
  }

  async handleMessage(input: {
    content: string;
    conversationId: string;
    platform: string;
    userId: string;
    metadata?: any;
  }): Promise<{ content: string; metadata?: any }> {
    try {
      if (!ConversationHandler.initialized) {
        await ConversationHandler.initialize();
      }

      const response = await this.aiProcessor.processMessage(
        input.platform as any,
        input.content,
        [],
        {
          conversationId: input.conversationId
        }
      );

      return {
        content: response.content,
        metadata: {
          provider: response.metadata?.provider,
          model: response.metadata?.model,
          processingTime: response.metadata?.processingTime
        }
      };
    } catch (error) {
      console.error('Error in handleMessage:', error);
      return {
        content: 'Sorry, I encountered an error processing your message.',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  async handleConversation(
    input: ConversationInput,
    context: ConversationContext
  ): Promise<void> {
    try {
      if (!ConversationHandler.initialized) {
        await ConversationHandler.initialize();
      }

      const adapter = AdapterRegistry.get(context.platform);
      adapter.validateInput(input, context);

      if (adapter.supportsTypingIndicator && adapter.sendTypingIndicator) {
        await adapter.sendTypingIndicator(input, context);
      }

      const aiResponse = await this.aiProcessor.processMessage(
        context.platform,
        input.message, 
        input.history
      );

      await adapter.sendResponse(input, aiResponse, context);

    } catch (error) {
      await this.handleError(input, context, error as Error);
    }
  }

  private async handleError(
    input: ConversationInput,
    context: ConversationContext,
    error: Error
  ): Promise<void> {
    console.error(`Conversation error [${context.platform}]:`, error);
    try {
      const adapter = AdapterRegistry.get(context.platform);
      await adapter.sendError(input, context, error);
    } catch (sendError) {
      console.error('Failed to send error response:', sendError);
    }
  }

  getAnalytics() {
    const { AnalyticsService } = require('../services/analytics/analytics-service');
    return AnalyticsService.getAnalytics();
  }

  updateSystemPrompt(prompt: string): void {
    this.aiProcessor.updateSystemPrompt(prompt);
  }

  getSystemPrompt(): string {
    return this.aiProcessor.getSystemPrompt();
  }

  isPlatformSupported(platform: string): boolean {
    return AdapterRegistry.isSupported(platform as any);
  }

  getSupportedPlatforms(): string[] {
    return AdapterRegistry.getSupportedPlatforms();
  }
}

export const conversationHandler = new ConversationHandler();
// Legacy re-export removed during refactor. ConversationHandler is exported above.
