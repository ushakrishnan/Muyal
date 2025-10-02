// Core types for the conversation system
export interface ConversationContext {
  conversationId: string;
  userId?: string;
  platform: PlatformType;
  metadata?: Record<string, any>;
}

export interface ConversationInput {
  message: string;
  history?: ConversationMessage[];
  platformData: any; // Platform-specific data (TurnContext, Express res, etc.)
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface AIResponse {
  content: string;
  metadata?: AIResponseMetadata;
  suggestions?: string[];
  actions?: ResponseAction[];
}

export interface AIResponseMetadata {
  model?: string;
  tokens?: number;
  processingTime?: number;
  confidence?: number;
  provider?: string;
  platform?: PlatformType;
}

export interface ResponseAction {
  type: 'link' | 'quick_reply' | 'file_download' | 'external_call';
  label: string;
  value: string;
}

export type PlatformType = 'microsoft365' | 'web' | 'slack' | 'discord' | 'whatsapp' | 'sms';

// Analytics types
export interface InteractionLog {
  conversationId: string;
  platform: PlatformType;
  timestamp: Date;
  responseLength: number;
  processingTime?: number;
  metadata?: any;
}

export interface AnalyticsData {
  totalInteractions: number;
  last24Hours: number;
  platforms: Record<PlatformType, number>;
  averageResponseLength: number;
  averageProcessingTime: number;
}

// Error types
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class PlatformError extends Error {
  constructor(platform: string, message: string) {
    super(`${platform}: ${message}`);
    this.name = 'PlatformError';
  }
}

export class AIProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIProcessingError';
  }
}