import { TurnContext } from "@microsoft/agents-hosting";
import { PlatformAdapter } from "../base/platform-adapter";
import { ConversationInput, ConversationContext, AIResponse, PlatformType } from "../../core/core-types";
import { AnalyticsService } from "../../services/analytics/analytics-service";

export class Microsoft365Adapter extends PlatformAdapter {
  readonly platform: PlatformType = 'microsoft365';
  readonly supportsTypingIndicator = true;
  readonly supportsRichContent = true;

  async sendResponse(
    input: ConversationInput,
    aiResponse: AIResponse,
    context: ConversationContext
  ): Promise<void> {
    const turnContext = input.platformData as TurnContext;
    
    try {
      // Send main response
      await turnContext.sendActivity(aiResponse.content);

      // Handle suggestions as formatted text
      if (aiResponse.suggestions && aiResponse.suggestions.length > 0) {
        const suggestionsText = "💡 Suggestions:\n" + 
          aiResponse.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n');
        await turnContext.sendActivity(suggestionsText);
      }

      // Handle actions as formatted links/commands
      if (aiResponse.actions && aiResponse.actions.length > 0) {
        const actionsText = "🔗 Available actions:\n" + 
          aiResponse.actions.map(action => `• ${action.label}: ${action.value}`).join('\n');
        await turnContext.sendActivity(actionsText);
      }

      // Log analytics
      AnalyticsService.logInteraction(
        context.conversationId,
        this.platform,
        aiResponse.content.length,
        aiResponse.metadata?.processingTime,
        {
          channelId: turnContext.activity.channelId,
          userId: context.userId,
          suggestions: aiResponse.suggestions,
          actions: aiResponse.actions
        }
      );

    } catch (error) {
      console.error('Microsoft365Adapter sendResponse error:', error);
      throw error;
    }
  }

  async sendError(
    input: ConversationInput,
    context: ConversationContext,
    error: Error
  ): Promise<void> {
    const turnContext = input.platformData as TurnContext;
    const errorMessage = this.getErrorMessage(error);
    
    try {
      await turnContext.sendActivity(errorMessage);
    } catch (sendError) {
      console.error('Microsoft365Adapter sendError failed:', sendError);
    }
  }

  async sendTypingIndicator(
    input: ConversationInput,
    context: ConversationContext
  ): Promise<void> {
    const turnContext = input.platformData as TurnContext;
    
    try {
      // Send typing indicator for Microsoft 365 (if supported by channel)
      await turnContext.sendActivity({ type: 'typing' } as any);
    } catch (error) {
      // Typing indicators may not be supported in all channels
      console.debug('Typing indicator not supported in this channel');
    }
  }

  protected formatSuggestions(suggestions: string[]): string {
    return suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n');
  }

  protected formatActions(actions: any[]): string {
    return actions.map(action => `• ${action.label}: ${action.value}`).join('\n');
  }

  protected getErrorMessage(error: Error): string {
    const baseMessage = super.getErrorMessage(error);
    return `❌ ${baseMessage}`;
  }
}