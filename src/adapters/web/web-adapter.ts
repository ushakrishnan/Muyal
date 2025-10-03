import { Response } from "express";
import { PlatformAdapter } from "../base/platform-adapter";
import { ConversationInput, ConversationContext, AIResponse, PlatformType } from "../../core/core-types";
import { AnalyticsService } from "../../services/analytics/analytics-service";

export class WebAdapter extends PlatformAdapter {
  readonly platform: PlatformType = 'web';
  readonly supportsTypingIndicator = false;
  readonly supportsRichContent = true;

  async sendResponse(
    input: ConversationInput,
    aiResponse: AIResponse,
    context: ConversationContext
  ): Promise<void> {
    const res = input.platformData as Response;
    
    try {
      // Add AI response to conversation history if provided
      if (input.history) {
        input.history.push({ 
          role: "assistant", 
          content: aiResponse.content,
          timestamp: new Date()
        });
      }
      
      const response = {
        success: true,
        response: aiResponse.content,
        conversationId: context.conversationId,
        metadata: aiResponse.metadata,
        suggestions: aiResponse.suggestions || [],
        actions: aiResponse.actions || [],
        timestamp: new Date().toISOString()
      };

      res.json(response);

      // Log analytics
      AnalyticsService.logInteraction(
        context.conversationId,
        this.platform,
        aiResponse.content.length,
        aiResponse.metadata?.processingTime,
        {
          userId: context.userId,
          userAgent: context.metadata?.userAgent,
          suggestions: aiResponse.suggestions,
          actions: aiResponse.actions
        }
      );

    } catch (error) {
      console.error('WebAdapter sendResponse error:', error);
      throw error;
    }
  }

  async sendError(
    input: ConversationInput,
    context: ConversationContext,
    error: Error
  ): Promise<void> {
    const res = input.platformData as Response;
    
    const errorResponse = {
      success: false,
      error: this.getErrorMessage(error),
      conversationId: context.conversationId,
      timestamp: new Date().toISOString()
    };
    
    try {
      const statusCode = error.name === 'ValidationError' ? 400 : 500;
      res.status(statusCode).json(errorResponse);
    } catch (sendError) {
      console.error('WebAdapter sendError failed:', sendError);
    }
  }

  protected formatSuggestions(suggestions: string[]): Array<{text: string, value: string}> {
    return suggestions.map(suggestion => ({
      text: suggestion,
      value: suggestion
    }));
  }

  protected formatActions(actions: any[]): any[] {
    return actions.map(action => ({
      type: action.type,
      label: action.label,
      value: action.value
    }));
  }

  // Web-specific validation
  validateInput(input: ConversationInput, context: ConversationContext): void {
    super.validateInput(input, context);
    
    // Additional web-specific validation
    const res = input.platformData as Response;
    if (!res || typeof res.json !== 'function') {
      throw new Error('Invalid Express Response object provided');
    }
  }
}