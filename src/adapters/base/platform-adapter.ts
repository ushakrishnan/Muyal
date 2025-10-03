import { ConversationInput, ConversationContext, AIResponse, PlatformType } from "../../core/core-types";

// Abstract base class for all platform adapters
export abstract class PlatformAdapter {
  abstract readonly platform: PlatformType;
  abstract readonly supportsTypingIndicator: boolean;
  abstract readonly supportsRichContent: boolean;
  
  /**
   * Send the AI response to the platform
   */
  abstract sendResponse(
    input: ConversationInput,
    aiResponse: AIResponse,
    context: ConversationContext
  ): Promise<void>;
  
  /**
   * Send error message to the platform
   */
  abstract sendError(
    input: ConversationInput,
    context: ConversationContext,
    error: Error
  ): Promise<void>;
  
  /**
   * Send typing indicator (optional - only if supported)
   */
  sendTypingIndicator?(
    input: ConversationInput,
    context: ConversationContext
  ): Promise<void>;

  /**
   * Validate platform-specific input
   */
  validateInput(input: ConversationInput, context: ConversationContext): void {
    if (!input.message || typeof input.message !== 'string' || input.message.trim().length === 0) {
      throw new Error('Message must be a non-empty string');
    }

    if (!context.conversationId) {
      throw new Error('Conversation ID is required');
    }

    if (context.platform !== this.platform) {
      throw new Error(`Platform mismatch: expected ${this.platform}, got ${context.platform}`);
    }
  }

  /**
   * Format suggestions for the platform
   */
  protected formatSuggestions(suggestions: string[]): any {
    // Default implementation - override in platform-specific adapters
    return suggestions;
  }

  /**
   * Format actions for the platform
   */
  protected formatActions(actions: any[]): any {
    // Default implementation - override in platform-specific adapters
    return actions;
  }

  /**
   * Get platform-specific error message
   */
  protected getErrorMessage(error: Error): string {
    return process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Sorry, I encountered an error. Please try again.';
  }

  /**
   * Log platform-specific interaction
   */
  protected logInteraction(
    context: ConversationContext,
    aiResponse: AIResponse,
    additionalMetadata?: any
  ): void {
    // This will be implemented by the analytics service
    console.log(`${this.platform} interaction:`, {
      conversationId: context.conversationId,
      responseLength: aiResponse.content.length,
      processingTime: aiResponse.metadata?.processingTime,
      ...additionalMetadata
    });
  }
}