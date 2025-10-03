import { InteractionLog, AnalyticsData, PlatformType } from "../../core/core-types";

export class AnalyticsService {
  private static interactions: InteractionLog[] = [];

  static logInteraction(
    conversationId: string,
    platform: PlatformType,
    responseLength: number,
    processingTime?: number,
    metadata?: any
  ): void {
    this.interactions.push({
      conversationId,
      platform,
      timestamp: new Date(),
      responseLength,
      processingTime,
      metadata
    });

    // Keep only last 1000 interactions in memory
    if (this.interactions.length > 1000) {
      this.interactions = this.interactions.slice(-1000);
    }
  }

  static getAnalytics(): AnalyticsData {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recent = this.interactions.filter(i => i.timestamp > last24Hours);
    
    // Initialize platform counts
    const platforms: Record<PlatformType, number> = {
      'microsoft365': 0,
      'web': 0,
      'slack': 0,
      'discord': 0,
      'whatsapp': 0,
      'sms': 0
    };

    // Count interactions by platform
    recent.forEach(interaction => {
      platforms[interaction.platform]++;
    });

    return {
      totalInteractions: this.interactions.length,
      last24Hours: recent.length,
      platforms,
      averageResponseLength: recent.reduce((sum, i) => sum + i.responseLength, 0) / recent.length || 0,
      averageProcessingTime: recent
        .filter(i => i.processingTime)
        .reduce((sum, i) => sum + (i.processingTime || 0), 0) / recent.filter(i => i.processingTime).length || 0
    };
  }

  static getInteractionsByPlatform(platform: PlatformType): InteractionLog[] {
    return this.interactions.filter(i => i.platform === platform);
  }

  static getInteractionsByConversation(conversationId: string): InteractionLog[] {
    return this.interactions.filter(i => i.conversationId === conversationId);
  }

  static clearAnalytics(): void {
    this.interactions = [];
  }

  static exportAnalytics(): string {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      totalInteractions: this.interactions.length,
      interactions: this.interactions,
      analytics: this.getAnalytics()
    }, null, 2);
  }

  static getPopularSuggestions(): Record<string, number> {
    const suggestions: Record<string, number> = {};
    
    this.interactions.forEach(interaction => {
      if (interaction.metadata?.suggestions) {
        interaction.metadata.suggestions.forEach((suggestion: string) => {
          suggestions[suggestion] = (suggestions[suggestion] || 0) + 1;
        });
      }
    });

    return suggestions;
  }

  static getPerformanceMetrics() {
    const recent = this.interactions.filter(i => 
      i.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    return {
      totalRequests: recent.length,
      averageResponseTime: recent
        .filter(i => i.processingTime)
        .reduce((sum, i) => sum + (i.processingTime || 0), 0) / recent.filter(i => i.processingTime).length || 0,
      responseTimeBuckets: {
        fast: recent.filter(i => (i.processingTime || 0) < 1000).length,
        medium: recent.filter(i => (i.processingTime || 0) >= 1000 && (i.processingTime || 0) < 3000).length,
        slow: recent.filter(i => (i.processingTime || 0) >= 3000).length
      },
      errorRate: recent.filter(i => i.metadata?.error).length / recent.length * 100
    };
  }
}