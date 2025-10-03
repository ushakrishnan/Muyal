import { ActivityTypes } from "@microsoft/agents-activity";
import { AgentApplication, MemoryStorage, TurnContext } from "@microsoft/agents-hosting";
import config from "./config";
import { ConversationMessage } from "./core/core-types";
import { integratedServer } from "./integrations/mcp/mcp-a2a-integration";

// Define storage and application for Microsoft 365
const storage = new MemoryStorage();
export const agentApp = new AgentApplication({
  storage,
});

agentApp.onConversationUpdate("membersAdded", async (context: TurnContext) => {
  await context.sendActivity(`Hi there! I'm an agent to chat with you.`);
});

// Listen for ANY message to be received. MUST BE AFTER ANY OTHER MESSAGE HANDLERS
agentApp.onActivity(ActivityTypes.Message, async (context: TurnContext) => {
  try {
    const message = context.activity.text || '';
    const conversationId = context.activity.conversation?.id || 'unknown';
    
    // Use UnifiedAgentServer chat function with knowledge library integration
    const result = await integratedServer.getUnifiedServer().callFunction('chat', {
      message,
      conversationId,
      platform: 'microsoft365',
      aiProvider: undefined // Use default
    });

    // Send the enhanced response
    await context.sendActivity(result.content);

    // Send suggestions if available
    if (result.suggestions && result.suggestions.length > 0) {
      const suggestionsText = "💡 Suggestions:\n" + 
        result.suggestions.slice(0, 3).map((s: string, i: number) => `${i + 1}. ${s}`).join('\n');
      await context.sendActivity(suggestionsText);
    }

    // Show knowledge sources used if any
    if (result.knowledge_sources_used && result.knowledge_sources_used.length > 0) {
      const sourcesText = `🧠 Enhanced with: ${result.knowledge_sources_used.join(', ')}`;
      await context.sendActivity(sourcesText);
    }
    
  } catch (error) {
    console.error('M365 Agent error:', error);
    await context.sendActivity("Sorry, I encountered an error. Please try again.");
  }
});

// Web adapter for custom webpage
export function createWebAdapter() {
  const conversations = new Map<string, ConversationMessage[]>();

  return {
    async processMessage(message: string, conversationId: string, res: any): Promise<void> {
      // Get or create conversation history
      if (!conversations.has(conversationId)) {
        conversations.set(conversationId, []);
      }

      const history = conversations.get(conversationId)!;
      
      // Add user message to history
      history.push({ 
        role: "user", 
        content: message,
        timestamp: new Date()
      });

      // Keep only last 10 messages to manage context length
      if (history.length > 10) {
        history.splice(0, history.length - 10);
      }

      try {
        // Use UnifiedAgentServer chat function with knowledge library integration
        const result = await integratedServer.getUnifiedServer().callFunction('chat', {
          message,
          conversationId,
          platform: 'web',
          aiProvider: undefined // Use default
        });

        // Add assistant message to history
        history.push({
          role: "assistant",
          content: result.content,
          timestamp: new Date()
        });

        // Send the enhanced response
        res.json({
          success: true,
          response: result.content,
          conversationId,
          timestamp: new Date().toISOString(),
          metadata: {
            provider: result.provider,
            tokens: result.tokens,
            cost: result.cost,
            knowledge_sources_used: result.knowledge_sources_used,
            suggestions: result.suggestions,
            enhanced: result.enhanced
          }
        });

      } catch (error) {
        console.error('Web adapter error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to process message',
          timestamp: new Date().toISOString()
        });
      }
    },

    getConversationHistory(conversationId: string) {
      return conversations.get(conversationId) || [];
    },

    clearConversation(conversationId: string) {
      conversations.delete(conversationId);
    },

    // Get analytics data
    getAnalytics() {
      return {
        totalConversations: conversations.size,
        totalMessages: Array.from(conversations.values()).reduce((sum, conv) => sum + conv.length, 0),
        averageConversationLength: conversations.size > 0 ? 
          Array.from(conversations.values()).reduce((sum, conv) => sum + conv.length, 0) / conversations.size : 0
      };
    }
  };
}
