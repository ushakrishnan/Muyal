import { AIProvider, ProviderConfig, PlatformProviderMapping, ProviderType, ProviderFactory } from "./ai-types";
import { PlatformType } from "./types";

export class AIProviderRegistry {
  private static providers = new Map<string, AIProvider>();
  private static factories = new Map<ProviderType, ProviderFactory>();
  private static platformMappings = new Map<PlatformType, PlatformProviderMapping>();
  private static defaultProvider: string | null = null;
  private static fallbackProvider: string | null = null;

  /**
   * Register a provider factory
   */
  static registerFactory(type: ProviderType, factory: ProviderFactory): void {
    this.factories.set(type, factory);
    console.log(`✅ Registered AI provider factory: ${type}`);
  }

  /**
   * Create and register a provider instance
   */
  static createProvider(type: ProviderType, config: ProviderConfig): void {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`No factory registered for provider type: ${type}`);
    }

    if (!factory.validateConfig(config)) {
      throw new Error(`Invalid configuration for provider: ${type}`);
    }

    const provider = factory.create(config);
    this.providers.set(config.name, provider);
    
    console.log(`✅ Created AI provider: ${config.name} (${type})`);
  }

  /**
   * Get provider by name
   */
  static getProvider(name: string): AIProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider not found: ${name}`);
    }
    return provider;
  }

  /**
   * Get provider for a specific platform
   */
  static getProviderForPlatform(platform: PlatformType): AIProvider {
    const mapping = this.platformMappings.get(platform);
    if (mapping) {
      try {
        return this.getProvider(mapping.primaryProvider);
      } catch (error) {
        console.warn(`Primary provider ${mapping.primaryProvider} failed for ${platform}, trying fallback`);
        if (mapping.fallbackProvider) {
          try {
            return this.getProvider(mapping.fallbackProvider);
          } catch (fallbackError) {
            console.error(`Fallback provider ${mapping.fallbackProvider} also failed`);
          }
        }
      }
    }

    // Use default provider
    if (this.defaultProvider) {
      try {
        return this.getProvider(this.defaultProvider);
      } catch (error) {
        console.warn(`Default provider ${this.defaultProvider} failed, trying fallback`);
      }
    }

    // Use fallback provider
    if (this.fallbackProvider) {
      return this.getProvider(this.fallbackProvider);
    }

    throw new Error(`No available AI provider for platform: ${platform}`);
  }

  /**
   * Set platform-specific provider mapping
   */
  static setPlatformMapping(mapping: PlatformProviderMapping): void {
    this.platformMappings.set(mapping.platform as PlatformType, mapping);
    console.log(`✅ Set provider mapping for ${mapping.platform}: ${mapping.primaryProvider}`);
  }

  /**
   * Set default and fallback providers
   */
  static setDefaultProviders(defaultProvider: string, fallbackProvider?: string): void {
    this.defaultProvider = defaultProvider;
    this.fallbackProvider = fallbackProvider || null;
    console.log(`✅ Set default provider: ${defaultProvider}, fallback: ${fallbackProvider || 'none'}`);
  }

  /**
   * Get all available providers
   */
  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check provider health
   */
  static async checkProviderHealth(name: string): Promise<any> {
    const provider = this.getProvider(name);
    return await provider.getHealth();
  }

  /**
   * Check all providers health
   */
  static async checkAllProvidersHealth(): Promise<Record<string, any>> {
    const health: Record<string, any> = {};
    
    for (const [name, provider] of this.providers) {
      try {
        health[name] = await provider.getHealth();
      } catch (error) {
        health[name] = {
          isHealthy: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    return health;
  }

  /**
   * Get platform mappings
   */
  static getPlatformMappings(): Map<PlatformType, PlatformProviderMapping> {
    return new Map(this.platformMappings);
  }

  /**
   * Remove provider
   */
  static removeProvider(name: string): boolean {
    return this.providers.delete(name);
  }

  /**
   * Clear all providers (useful for testing)
   */
  static clear(): void {
    this.providers.clear();
    this.platformMappings.clear();
    this.defaultProvider = null;
    this.fallbackProvider = null;
  }

  /**
   * Get provider configuration for platform
   */
  static getProviderConfigForPlatform(platform: PlatformType): {
    provider: AIProvider;
    options?: any;
  } {
    const mapping = this.platformMappings.get(platform);
    const provider = this.getProviderForPlatform(platform);
    
    return {
      provider,
      options: mapping?.options
    };
  }

  /**
   * Validate all configurations
   */
  static validateAllConfigurations(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const [name, provider] of this.providers) {
      try {
        if (!provider.validateConfig()) {
          errors.push(`Provider ${name} has invalid configuration`);
        }
      } catch (error) {
        errors.push(`Provider ${name} validation failed: ${error}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}