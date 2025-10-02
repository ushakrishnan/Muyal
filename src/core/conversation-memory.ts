/**
 * Conversation Memory Service
 * Provides persistent conversation history with context awareness
 */

import * as fs from 'fs';
import * as path from 'path';
import { ConversationMessage } from './types';

export interface StoredConversationMessage {
  id: string;
  timestamp: Date;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    provider?: string;
    tokens?: number;
    cost?: number;
    knowledge_sources_used?: string[];
    suggestions?: string[];
    enhanced?: boolean;
    platform?: string;
  };
}

export interface ConversationSummary {
  id: string;
  title: string;
  lastMessageAt: Date;
  messageCount: number;
  participants: string[];
  topics: string[];
}

export interface ConversationContext {
  id: string;
  userId: string;
  platform: string;
  sessionStarted: Date;
  lastActivity: Date;
  preferences?: {
    responseStyle?: 'concise' | 'detailed' | 'casual';
    expertiseLevel?: 'beginner' | 'intermediate' | 'expert';
    topics?: string[];
  };
  summary?: string;
}

export class ConversationMemoryService {
  private conversationsDir: string;
  private contextsDir: string;
  private maxMessagesPerConversation: number;
  private maxConversationAge: number; // in days
  private conversations: Map<string, StoredConversationMessage[]> = new Map();
  private contexts: Map<string, ConversationContext> = new Map();

  constructor(
    storageDir: string = './data/conversations',
    maxMessages: number = 100,
    maxAge: number = 30
  ) {
    this.conversationsDir = path.join(storageDir, 'messages');
    this.contextsDir = path.join(storageDir, 'contexts');
    this.maxMessagesPerConversation = maxMessages;
    this.maxConversationAge = maxAge;
    
    // Ensure storage directories exist
    this.ensureDirectories();
    
    // Load existing conversations
    this.loadConversations();
  }

  private ensureDirectories(): void {
    try {
      if (!fs.existsSync(this.conversationsDir)) {
        fs.mkdirSync(this.conversationsDir, { recursive: true });
      }
      if (!fs.existsSync(this.contextsDir)) {
        fs.mkdirSync(this.contextsDir, { recursive: true });
      }
      console.log('📁 Conversation storage directories initialized');
    } catch (error) {
      console.warn('⚠️ Failed to create conversation directories:', error);
    }
  }

  private loadConversations(): void {
    try {
      // Load conversation messages
      if (fs.existsSync(this.conversationsDir)) {
        const files = fs.readdirSync(this.conversationsDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const conversationId = file.replace('.json', '');
            const filePath = path.join(this.conversationsDir, file);
            const data = fs.readFileSync(filePath, 'utf-8');
            const messages = JSON.parse(data, (key, value) => {
              // Convert timestamp strings back to Date objects
              if (key === 'timestamp') return new Date(value);
              return value;
            });
            this.conversations.set(conversationId, messages);
          }
        }
      }

      // Load conversation contexts
      if (fs.existsSync(this.contextsDir)) {
        const files = fs.readdirSync(this.contextsDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const conversationId = file.replace('.json', '');
            const filePath = path.join(this.contextsDir, file);
            const data = fs.readFileSync(filePath, 'utf-8');
            const context = JSON.parse(data, (key, value) => {
              // Convert timestamp strings back to Date objects
              if (key === 'sessionStarted' || key === 'lastActivity') return new Date(value);
              return value;
            });
            this.contexts.set(conversationId, context);
          }
        }
      }

      console.log(`💾 Loaded ${this.conversations.size} conversations from persistent storage`);
    } catch (error) {
      console.warn('⚠️ Failed to load conversations:', error);
    }
  }

  private saveConversation(conversationId: string): void {
    try {
      const messages = this.conversations.get(conversationId);
      if (messages) {
        const filePath = path.join(this.conversationsDir, `${conversationId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));
      }
    } catch (error) {
      console.warn(`⚠️ Failed to save conversation ${conversationId}:`, error);
    }
  }

  private saveContext(conversationId: string): void {
    try {
      const context = this.contexts.get(conversationId);
      if (context) {
        const filePath = path.join(this.contextsDir, `${conversationId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(context, null, 2));
      }
    } catch (error) {
      console.warn(`⚠️ Failed to save context ${conversationId}:`, error);
    }
  }

  /**
   * Add a message to a conversation
   */
  addMessage(conversationId: string, message: Omit<StoredConversationMessage, 'id'>): StoredConversationMessage {
    const fullMessage: StoredConversationMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, []);
    }

    const messages = this.conversations.get(conversationId)!;
    messages.push(fullMessage);

    // Trim conversation if it's too long
    if (messages.length > this.maxMessagesPerConversation) {
      messages.splice(0, messages.length - this.maxMessagesPerConversation);
    }

    // Update context
    this.updateContext(conversationId, {
      lastActivity: new Date(),
    });

    // Save to disk
    this.saveConversation(conversationId);

    return fullMessage;
  }

  /**
   * Get conversation history
   */
  getConversation(conversationId: string): StoredConversationMessage[] {
    return this.conversations.get(conversationId) || [];
  }

  /**
   * Get conversation history with context for AI
   */
  getConversationForAI(conversationId: string, maxMessages: number = 10): string {
    const messages = this.getConversation(conversationId);
    const context = this.getContext(conversationId);
    
    if (messages.length === 0) {
      return '';
    }

    // Get recent messages
    const recentMessages = messages.slice(-maxMessages);
    
    let conversationText = '';
    
    // Add context if available
    if (context?.summary) {
      conversationText += `[Previous conversation summary: ${context.summary}]\n\n`;
    }

    // Add message history
    conversationText += 'Conversation History:\n';
    for (const msg of recentMessages) {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      conversationText += `${role}: ${msg.content}\n`;
      
      // Add knowledge sources if used
      if (msg.metadata?.knowledge_sources_used?.length) {
        conversationText += `[Used knowledge sources: ${msg.metadata.knowledge_sources_used.join(', ')}]\n`;
      }
    }

    return conversationText;
  }

  /**
   * Create or update conversation context
   */
  createContext(conversationId: string, userId: string, platform: string): ConversationContext {
    const context: ConversationContext = {
      id: conversationId,
      userId,
      platform,
      sessionStarted: new Date(),
      lastActivity: new Date(),
    };

    this.contexts.set(conversationId, context);
    this.saveContext(conversationId);
    
    return context;
  }

  /**
   * Update conversation context
   */
  updateContext(conversationId: string, updates: Partial<ConversationContext>): void {
    const existing = this.contexts.get(conversationId);
    if (existing) {
      Object.assign(existing, updates);
      this.saveContext(conversationId);
    }
  }

  /**
   * Get conversation context
   */
  getContext(conversationId: string): ConversationContext | undefined {
    return this.contexts.get(conversationId);
  }

  /**
   * Generate conversation summary
   */
  generateSummary(conversationId: string): string {
    const messages = this.getConversation(conversationId);
    if (messages.length === 0) return '';

    // Simple summary generation - could be enhanced with AI
    const topics = new Set<string>();
    const knowledgeSources = new Set<string>();
    
    for (const msg of messages) {
      if (msg.metadata?.knowledge_sources_used) {
        msg.metadata.knowledge_sources_used.forEach((source: string) => knowledgeSources.add(source));
      }
      
      // Extract potential topics from user messages
      if (msg.role === 'user') {
        const words = msg.content.toLowerCase().split(' ');
        words.forEach(word => {
          if (word.length > 4 && !['what', 'where', 'when', 'how', 'who', 'why'].includes(word)) {
            topics.add(word);
          }
        });
      }
    }

    const summary = `Conversation with ${messages.length} messages. ` +
      `Topics discussed: ${Array.from(topics).slice(0, 5).join(', ')}. ` +
      `Knowledge sources used: ${Array.from(knowledgeSources).join(', ')}.`;
    
    return summary;
  }

  /**
   * Clear conversation
   */
  clearConversation(conversationId: string): void {
    this.conversations.delete(conversationId);
    this.contexts.delete(conversationId);
    
    // Remove files
    try {
      const msgFile = path.join(this.conversationsDir, `${conversationId}.json`);
      const ctxFile = path.join(this.contextsDir, `${conversationId}.json`);
      
      if (fs.existsSync(msgFile)) fs.unlinkSync(msgFile);
      if (fs.existsSync(ctxFile)) fs.unlinkSync(ctxFile);
    } catch (error) {
      console.warn(`⚠️ Failed to delete conversation files for ${conversationId}:`, error);
    }
  }

  /**
   * Get all conversation summaries
   */
  getAllConversations(): ConversationSummary[] {
    const summaries: ConversationSummary[] = [];
    
    for (const [id, messages] of this.conversations) {
      if (messages.length > 0) {
        const context = this.contexts.get(id);
        const lastMessage = messages[messages.length - 1];
        
        summaries.push({
          id,
          title: this.generateTitle(messages),
          lastMessageAt: lastMessage.timestamp,
          messageCount: messages.length,
          participants: [context?.userId || 'anonymous'],
          topics: this.extractTopics(messages),
        });
      }
    }
    
    return summaries.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }

  private generateTitle(messages: StoredConversationMessage[]): string {
    if (messages.length === 0) return 'Empty Conversation';
    
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) return 'New Conversation';
    
    // Use first few words of first message as title
    const words = firstUserMessage.content.split(' ').slice(0, 6);
    return words.join(' ') + (firstUserMessage.content.split(' ').length > 6 ? '...' : '');
  }

  private extractTopics(messages: StoredConversationMessage[]): string[] {
    const topics = new Set<string>();
    
    for (const msg of messages) {
      if (msg.metadata?.knowledge_sources_used) {
        msg.metadata.knowledge_sources_used.forEach((source: string) => topics.add(source));
      }
    }
    
    return Array.from(topics);
  }

  /**
   * Cleanup old conversations
   */
  cleanup(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.maxConversationAge);
    
    let cleanedCount = 0;
    for (const [id, messages] of this.conversations) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.timestamp < cutoffDate) {
        this.clearConversation(id);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old conversations`);
    }
  }

  /**
   * Get memory statistics
   */
  getStats() {
    const totalMessages = Array.from(this.conversations.values())
      .reduce((sum, messages) => sum + messages.length, 0);
    
    return {
      totalConversations: this.conversations.size,
      totalMessages,
      averageMessagesPerConversation: this.conversations.size > 0 ? 
        totalMessages / this.conversations.size : 0,
      oldestConversation: this.getOldestConversationDate(),
      memoryUsageMB: this.estimateMemoryUsage(),
    };
  }

  private getOldestConversationDate(): Date | null {
    let oldest: Date | null = null;
    
    for (const messages of this.conversations.values()) {
      if (messages.length > 0) {
        const firstMessage = messages[0];
        if (!oldest || firstMessage.timestamp < oldest) {
          oldest = firstMessage.timestamp;
        }
      }
    }
    
    return oldest;
  }

  private estimateMemoryUsage(): number {
    const jsonString = JSON.stringify({
      conversations: Array.from(this.conversations.entries()),
      contexts: Array.from(this.contexts.entries()),
    });
    
    return Math.round(Buffer.byteLength(jsonString, 'utf-8') / 1024 / 1024 * 100) / 100;
  }
}

// Global conversation memory service
export const conversationMemory = new ConversationMemoryService();