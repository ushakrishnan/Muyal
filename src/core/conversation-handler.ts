import { ConversationInput, ConversationContext, ValidationError } from "./types";
import { AIProcessor } from "./ai-processor";
import { AdapterRegistry } from "../adapters/base/adapter-registry";
import { AIConfiguration } from "./ai-configuration";

export class ConversationHandler {
  private aiProcessor: AIProcessor;
  private static initialized = false;

  constructor() {
    this.aiProcessor = new AIProcessor();
  }

  /**
   * Initialize the conversation handler and AI configuration
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize AI configuration with auto-detection from environment
      await AIConfiguration.initialize({
        autoConfigureFromEnv: true,
        enabledProviders: ['openai', 'anthropic', 'azure-openai', 'google-ai', 'azure-ai-foundry', 'ollama']
      });

      this.initialized = true;
      console.log('✅ ConversationHandler initialized with multi-LLM support');
    } catch (error) {
      console.error('❌ Failed to initialize ConversationHandler:', error);
      throw error;
    }
  }

  /**
   * Universal conversation handler - handles ALL conversations regardless of platform
   */
  async handleConversation(
    input: ConversationInput,
    context: ConversationContext
  ): Promise<void> {
    try {
      // Ensure initialization
      if (!ConversationHandler.initialized) {
        await ConversationHandler.initialize();
      }

      // 1. Get platform adapter
      const adapter = AdapterRegistry.get(context.platform);

      // 2. Validate input
      adapter.validateInput(input, context);

      // 3. Send typing indicator (if supported by platform)
      if (adapter.supportsTypingIndicator && adapter.sendTypingIndicator) {
        await adapter.sendTypingIndicator(input, context);
      }

      // 4. Process with AI (shared logic)
      const aiResponse = await this.aiProcessor.processMessage(
        context.platform,
        input.message, 
        input.history
      );

      // 5. Send response through platform adapter
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

  /**
   * Get analytics across all platforms
   */
  getAnalytics() {
    const { AnalyticsService } = require('../services/analytics/analytics-service');
    return AnalyticsService.getAnalytics();
  }

  /**
   * Update the AI system prompt
   */
  updateSystemPrompt(prompt: string): void {
    this.aiProcessor.updateSystemPrompt(prompt);
  }

  /**
   * Get current system prompt
   */
  getSystemPrompt(): string {
    return this.aiProcessor.getSystemPrompt();
  }

  /**
   * Check if platform is supported
   */
  isPlatformSupported(platform: string): boolean {
    return AdapterRegistry.isSupported(platform as any);
  }

  /**
   * Get list of supported platforms
   */
  getSupportedPlatforms(): string[] {
    return AdapterRegistry.getSupportedPlatforms();
  }
}

// Export singleton instance
export const conversationHandler = new ConversationHandler();