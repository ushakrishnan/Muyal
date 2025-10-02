import * as weave from 'weave';

export interface ObservabilityConfig {
  enabled: boolean;
  provider: 'wandb' | 'none';
  wandb?: {
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
  private config: ObservabilityConfig['wandb'];
  private isInitialized = false;

  constructor(config: ObservabilityConfig['wandb']) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (!this.config?.apiKey) {
      throw new Error('W&B API key is required');
    }

    try {
      // Initialize Weave for AI tracing
      await weave.init({
        project_name: `${this.config.entity}/${this.config.project || 'muyal-ai-agent'}`,
        api_key: this.config.apiKey
      });

      this.isInitialized = true;
      console.log('📊 W&B Weave: Initialized successfully for AI tracing');
    } catch (error) {
      console.error('❌ W&B Weave: Initialization failed:', error);
      throw error;
    }
  }

  async logAIRequest(metrics: AIRequestMetrics): Promise<void> {
    if (!this.isInitialized) return;

    try {
      // Log individual request metrics
      wandb.log({
        'ai/request_count': 1,
        'ai/response_time_ms': metrics.responseTime,
        'ai/success': metrics.success ? 1 : 0,
        'ai/cost_usd': metrics.cost || 0,
        'ai/tokens_total': metrics.totalTokens || 0,
        'ai/tokens_prompt': metrics.promptTokens || 0,
        'ai/tokens_completion': metrics.completionTokens || 0,
        [`ai/provider/${metrics.provider}/requests`]: 1,
        [`ai/provider/${metrics.provider}/response_time`]: metrics.responseTime,
        [`ai/provider/${metrics.provider}/cost`]: metrics.cost || 0,
        [`ai/platform/${metrics.platform}/requests`]: 1,
        [`ai/platform/${metrics.platform}/response_time`]: metrics.responseTime,
        'timestamp': metrics.timestamp.toISOString()
      });

      // Log error if request failed
      if (!metrics.success && metrics.error) {
        wandb.log({
          'ai/error_count': 1,
          [`ai/provider/${metrics.provider}/errors`]: 1,
          'ai/error_message': metrics.error
        });
      }

      // Log user rating if provided
      if (metrics.userRating) {
        wandb.log({
          'ai/user_rating': metrics.userRating,
          [`ai/provider/${metrics.provider}/user_rating`]: metrics.userRating
        });
      }

      console.log(`📊 W&B: Logged request for ${metrics.provider} on ${metrics.platform}`);
    } catch (error) {
      console.error('❌ W&B: Failed to log AI request:', error);
    }
  }

  async logProviderHealth(metrics: ProviderHealthMetrics): Promise<void> {
    if (!this.isInitialized) return;

    try {
      wandb.log({
        [`health/${metrics.provider}/status`]: metrics.isHealthy ? 1 : 0,
        [`health/${metrics.provider}/response_time`]: metrics.responseTime || 0,
        'health/total_healthy_providers': metrics.isHealthy ? 1 : 0,
        'timestamp': metrics.timestamp.toISOString()
      });

      if (metrics.error) {
        wandb.log({
          [`health/${metrics.provider}/error`]: metrics.error
        });
      }

      console.log(`🏥 W&B: Logged health for ${metrics.provider} - ${metrics.isHealthy ? 'Healthy' : 'Unhealthy'}`);
    } catch (error) {
      console.error('❌ W&B: Failed to log provider health:', error);
    }
  }

  async logSystemMetrics(metrics: SystemMetrics): Promise<void> {
    if (!this.isInitialized) return;

    try {
      wandb.log({
        'system/total_requests': metrics.totalRequests,
        'system/total_cost_usd': metrics.totalCost,
        'system/avg_response_time_ms': metrics.averageResponseTime,
        'system/error_rate': metrics.errorRate,
        'system/active_providers': metrics.activeProviders,
        'timestamp': metrics.timestamp.toISOString()
      });

      console.log('📊 W&B: Logged system metrics');
    } catch (error) {
      console.error('❌ W&B: Failed to log system metrics:', error);
    }
  }

  async logUserFeedback(conversationId: string, rating: number, feedback?: string): Promise<void> {
    if (!this.isInitialized) return;

    try {
      wandb.log({
        'feedback/user_rating': rating,
        'feedback/rating_count': 1,
        'feedback/conversation_id': conversationId,
        'timestamp': new Date().toISOString()
      });

      if (feedback) {
        wandb.log({
          'feedback/text_feedback': feedback
        });
      }

      console.log(`👤 W&B: Logged user feedback: ${rating}/5 for conversation ${conversationId}`);
    } catch (error) {
      console.error('❌ W&B: Failed to log user feedback:', error);
    }
  }

  async flush(): Promise<void> {
    if (this.isInitialized) {
      await wandb.finish();
      console.log('📊 W&B: Session finished and data flushed');
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
      case 'wandb':
        return new WandBProvider(this.config.wandb);
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
  const config: ObservabilityConfig = {
    enabled: process.env.WANDB_ENABLED === 'true',
    provider: process.env.WANDB_ENABLED === 'true' ? 'wandb' : 'none',
    wandb: {
      apiKey: process.env.WANDB_API_KEY,
      project: process.env.WANDB_PROJECT || 'muyal-ai-agent',
      entity: process.env.WANDB_ENTITY,
      tags: process.env.WANDB_TAGS?.split(',').map(tag => tag.trim()) || ['muyal', 'multi-llm'],
      notes: process.env.WANDB_NOTES || 'Multi-provider AI agent monitoring'
    }
  };

  return ObservabilityService.getInstance(config);
}