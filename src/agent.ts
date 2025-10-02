import { ActivityTypes } from "@microsoft/agents-activity";
import { AgentApplication, MemoryStorage, TurnContext } from "@microsoft/agents-hosting";
import config from "./config";
import { ConversationHandler } from "./core/conversation-handler";
import { ConversationInput, ConversationContext, ConversationMessage } from "./core/types";
import { AdapterRegistry } from "./adapters/base/adapter-registry";
import { Microsoft365Adapter } from "./adapters/microsoft365/m365-adapter";
import { WebAdapter } from "./adapters/web/web-adapter";

// Register adapters with the organized system
AdapterRegistry.register(new Microsoft365Adapter());
AdapterRegistry.register(new WebAdapter());

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
    // Create conversation input
    const input: ConversationInput = {
      message: context.activity.text || '',
      platformData: context
    };
    
    // Create conversation context
    const conversationContext: ConversationContext = {
      conversationId: context.activity.conversation?.id || 'unknown',
      userId: context.activity.from?.id || 'unknown',
      platform: 'microsoft365',
      metadata: {
        channelId: context.activity.channelId,
        serviceUrl: context.activity.serviceUrl
      }
    };
    
    // Use organized conversation handler
    const conversationHandler = new ConversationHandler();
    await conversationHandler.handleConversation(input, conversationContext);
    
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
      
      // Create conversation input
      const input: ConversationInput = {
        message,
        history: history.slice(), // Copy of history
        platformData: res
      };
      
      // Create conversation context
      const conversationContext: ConversationContext = {
        conversationId,
        userId: 'web-user',
        platform: 'web',
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
      
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

      // Use organized conversation handler
      const conversationHandler = new ConversationHandler();
      await conversationHandler.handleConversation(input, conversationContext);
      
      // Note: Response is sent directly by the web adapter in the uber handler
    },

    getConversationHistory(conversationId: string) {
      return conversations.get(conversationId) || [];
    },

    clearConversation(conversationId: string) {
      conversations.delete(conversationId);
    },

    // Get analytics data
    getAnalytics() {
      const conversationHandler = new ConversationHandler();
      return conversationHandler.getAnalytics();
    }
  };
}
