import { init, op } from 'weave';

export interface ObservabilityConfig {
  enabled: boolean;
  provider: 'weave' | 'none';
  weave?: {
    apiKey?: string;
    project?: string;
    entity?: string;
    tags?: string[];
    notes?: string;
  };
}

export interface AIRequestMetrics {
  conversationId: string;
  platform: string;
  provider: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost?: number;
  responseTime: number;
  success: boolean;
  error?: string;
  userRating?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
  prompt?: string;
  response?: string;
}

export interface ProviderHealthMetrics {
  provider: string;
  isHealthy: boolean;
  responseTime?: number;
  error?: string;
  timestamp: Date;
}

export interface SystemMetrics {
  totalRequests: number;
  totalCost: number;
  averageResponseTime: number;
  errorRate: number;
  activeProviders: number;
  timestamp: Date;
}

export abstract class ObservabilityProvider {
  abstract initialize(): Promise<void>;
  abstract logAIRequest(metrics: AIRequestMetrics): Promise<void>;
  abstract logProviderHealth(metrics: ProviderHealthMetrics): Promise<void>;
  abstract logSystemMetrics(metrics: SystemMetrics): Promise<void>;
  abstract logUserFeedback(conversationId: string, rating: number, feedback?: string): Promise<void>;
  abstract flush(): Promise<void>;
}

export class WeaveProvider extends ObservabilityProvider {
  private config: ObservabilityConfig['weave'];
  private isInitialized = false;
  private weaveClient: any = null;

  constructor(config: ObservabilityConfig['weave']) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (!this.config?.apiKey) {
      throw new Error('W&B API key is required for Weave tracing');
    }

    try {
      console.log('🔧 W&B Weave: Starting initialization...');
      console.log(`🔧 API Key: ${this.config.apiKey ? 'Present' : 'Missing'}`);
      console.log(`🔧 Project: ${this.config.project}`);
      console.log(`🔧 Entity: ${this.config.entity}`);
      
      // Set API key in environment for Weave
      process.env.WANDB_API_KEY = this.config.apiKey;
      
      // Initialize Weave for AI application tracing
      const projectName = this.config.entity ? 
        `${this.config.entity}/${this.config.project || 'muyal-ai-agent'}` : 
        this.config.project || 'muyal-ai-agent';

      console.log(`🔧 Initializing Weave for project: ${projectName}`);
      this.weaveClient = await init(projectName);
      console.log(`🔧 Weave client initialized:`, typeof this.weaveClient);

      this.isInitialized = true;
      console.log(`📊 W&B Weave: Initialized successfully for project ${projectName}`);
      console.log(`🔗 View traces at: https://wandb.ai/${projectName.replace('/', '/workspace/')}/weave`);
    } catch (error) {
      console.error('❌ W&B Weave: Initialization failed:', error);
      console.error('Stack trace:', error);
      throw error;
    }
  }

  // Create a traced AI request function using the op decorator
  private tracedAIRequest = op(async (metrics: AIRequestMetrics) => {
    return {
      conversation_id: metrics.conversationId,
      platform: metrics.platform,
      provider: metrics.provider,
      model: metrics.model,
      prompt: metrics.prompt,
      response: metrics.response,
      tokens: {
        prompt: metrics.promptTokens,
        completion: metrics.completionTokens,
        total: metrics.totalTokens
      },
      cost_usd: metrics.cost,
      response_time_ms: metrics.responseTime,
      success: metrics.success,
      error: metrics.error,
      user_rating: metrics.userRating,
      timestamp: metrics.timestamp.toISOString(),
      metadata: metrics.metadata
    };
  }, { name: 'ai_request' });

  async logAIRequest(metrics: AIRequestMetrics): Promise<void> {
    console.log(`🔧 Weave: logAIRequest called - initialized: ${this.isInitialized}`);
    
    if (!this.isInitialized) {
      console.warn('⚠️ Weave: Not initialized, skipping AI request logging');
      return;
    }

    try {
      console.log(`🔧 Weave: About to trace AI request for ${metrics.provider}`);
      
      // Use Weave's tracing to log the AI request
      const result = await this.tracedAIRequest(metrics);
      console.log(`🔧 Weave: Traced AI request result:`, result);
      
      console.log(`📊 Weave: Traced AI request - ${metrics.provider} on ${metrics.platform} (${metrics.responseTime}ms)`);
    } catch (error) {
      console.error('❌ Weave: Failed to trace AI request:', error);
      console.error('Error details:', error);
    }
  }

  async logProviderHealth(metrics: ProviderHealthMetrics): Promise<void> {
    if (!this.isInitialized) return;

    try {
      // For Weave, we focus on AI request tracing. Provider health can be logged as console info
      console.log(`🏥 Weave: Health check for ${metrics.provider} - ${metrics.isHealthy ? 'Healthy' : 'Unhealthy'} (${metrics.responseTime}ms)`);
      
      // Optionally create a traced health check function if needed
      // For now, we'll just track this in console as Weave is primarily for AI call tracing
    } catch (error) {
      console.error('❌ Weave: Failed to log provider health:', error);
    }
  }

  async logSystemMetrics(metrics: SystemMetrics): Promise<void> {
    if (!this.isInitialized) return;

    try {
      // System metrics are logged to console for now
      // Weave focuses on individual call tracing rather than aggregate metrics
      console.log(`📊 Weave: System metrics - ${metrics.totalRequests} requests, $${metrics.totalCost.toFixed(4)} cost, ${metrics.averageResponseTime.toFixed(0)}ms avg response`);
    } catch (error) {
      console.error('❌ Weave: Failed to log system metrics:', error);
    }
  }

  async logUserFeedback(conversationId: string, rating: number, feedback?: string): Promise<void> {
    if (!this.isInitialized) return;

    try {
      // Create a traced feedback function
      const feedbackOp = op(async (convId: string, rating: number, feedback?: string) => {
        return {
          conversation_id: convId,
          rating,
          feedback,
          timestamp: new Date().toISOString()
        };
      }, { name: 'user_feedback' });

      await feedbackOp(conversationId, rating, feedback);
      console.log(`👤 Weave: Logged user feedback: ${rating}/5 for conversation ${conversationId}`);
    } catch (error) {
      console.error('❌ Weave: Failed to log user feedback:', error);
    }
  }

  async flush(): Promise<void> {
    if (this.isInitialized) {
      try {
        // Weave handles flushing automatically, no explicit finish needed
        console.log('📊 Weave: Session active, traces are automatically synced');
      } catch (error) {
        console.error('❌ Weave: Error during flush:', error);
      }
    }
  }
}

export class NoOpProvider extends ObservabilityProvider {
  async initialize(): Promise<void> {
    console.log('📊 Observability: Disabled (NoOp provider)');
  }

  async logAIRequest(metrics: AIRequestMetrics): Promise<void> {
    // No-op
  }

  async logProviderHealth(metrics: ProviderHealthMetrics): Promise<void> {
    // No-op
  }

  async logSystemMetrics(metrics: SystemMetrics): Promise<void> {
    // No-op
  }

  async logUserFeedback(conversationId: string, rating: number, feedback?: string): Promise<void> {
    // No-op
  }

  async flush(): Promise<void> {
    // No-op
  }
}

export class ObservabilityService {
  private static instance: ObservabilityService;
  private provider: ObservabilityProvider;
  private config: ObservabilityConfig;
  private requestCount = 0;
  private totalCost = 0;
  private totalResponseTime = 0;
  private errorCount = 0;

  private constructor(config: ObservabilityConfig) {
    this.config = config;
    this.provider = this.createProvider();
  }

  public static getInstance(config?: ObservabilityConfig): ObservabilityService {
    if (!ObservabilityService.instance && config) {
      ObservabilityService.instance = new ObservabilityService(config);
    }
    return ObservabilityService.instance;
  }

  private createProvider(): ObservabilityProvider {
    if (!this.config.enabled) {
      return new NoOpProvider();
    }

    switch (this.config.provider) {
      case 'weave':
        return new WeaveProvider(this.config.weave);
      default:
        console.warn(`Unknown observability provider: ${this.config.provider}`);
        return new NoOpProvider();
    }
  }

  public async initialize(): Promise<void> {
    try {
      await this.provider.initialize();
    } catch (error) {
      console.error('❌ Failed to initialize observability:', error);
      // Fallback to NoOp provider if initialization fails
      this.provider = new NoOpProvider();
      await this.provider.initialize();
    }
  }

  public async logAIRequest(metrics: AIRequestMetrics): Promise<void> {
    // Update internal counters
    this.requestCount++;
    this.totalCost += metrics.cost || 0;
    this.totalResponseTime += metrics.responseTime;
    if (!metrics.success) {
      this.errorCount++;
    }

    await this.provider.logAIRequest(metrics);

    // Periodically log system metrics (every 10 requests)
    if (this.requestCount % 10 === 0) {
      await this.logSystemMetrics();
    }
  }

  public async logProviderHealth(metrics: ProviderHealthMetrics): Promise<void> {
    await this.provider.logProviderHealth(metrics);
  }

  public async logUserFeedback(conversationId: string, rating: number, feedback?: string): Promise<void> {
    await this.provider.logUserFeedback(conversationId, rating, feedback);
  }

  private async logSystemMetrics(): Promise<void> {
    const metrics: SystemMetrics = {
      totalRequests: this.requestCount,
      totalCost: this.totalCost,
      averageResponseTime: this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0,
      errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
      activeProviders: 0, // Will be updated by caller
      timestamp: new Date()
    };

    await this.provider.logSystemMetrics(metrics);
  }

  public async flush(): Promise<void> {
    await this.provider.flush();
  }

  public getConfig(): ObservabilityConfig {
    return { ...this.config };
  }

  public async switchProvider(newConfig: ObservabilityConfig): Promise<void> {
    // Flush current provider
    await this.provider.flush();
    
    // Switch to new provider
    this.config = newConfig;
    this.provider = this.createProvider();
    await this.provider.initialize();
    
    console.log(`📊 Switched observability provider to: ${newConfig.provider}`);
  }
}

// Factory function to create observability service from environment
export function createObservabilityFromEnv(): ObservabilityService {
  console.log('🔧 Creating observability from environment...');
  console.log(`🔧 WANDB_ENABLED: ${process.env.WANDB_ENABLED}`);
  console.log(`🔧 WANDB_API_KEY: ${process.env.WANDB_API_KEY ? 'Present' : 'Missing'}`);
  console.log(`🔧 WANDB_PROJECT: ${process.env.WANDB_PROJECT}`);
  console.log(`🔧 WANDB_ENTITY: ${process.env.WANDB_ENTITY}`);
  
  const config: ObservabilityConfig = {
    enabled: process.env.WANDB_ENABLED === 'true',
    provider: process.env.WANDB_ENABLED === 'true' ? 'weave' : 'none',
    weave: {
      apiKey: process.env.WANDB_API_KEY,
      project: process.env.WANDB_PROJECT || 'muyal-ai-agent',
      entity: process.env.WANDB_ENTITY,
      tags: process.env.WANDB_TAGS?.split(',').map(tag => tag.trim()) || ['muyal', 'multi-llm'],
      notes: process.env.WANDB_NOTES || 'Multi-provider AI agent monitoring with Weave tracing'
    }
  };

  console.log('🔧 Observability config:', JSON.stringify(config, null, 2));
  return ObservabilityService.getInstance(config);
}