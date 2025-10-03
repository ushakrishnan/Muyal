import { AIProvider, ProviderConfig, PlatformProviderMapping, ProviderType, ProviderFactory } from "../ai/types";
import { PlatformType } from "../core-types";

export class AIProviderRegistry {
  private static providers = new Map<string, AIProvider>();
  private static factories = new Map<ProviderType, ProviderFactory>();
  private static platformMappings = new Map<PlatformType, PlatformProviderMapping>();
  private static defaultProvider: string | null = null;
  private static fallbackProvider: string | null = null;

  static registerFactory(type: ProviderType, factory: ProviderFactory): void {
    this.factories.set(type, factory);
    console.log(`\u2705 Registered AI provider factory: ${type}`);
  }

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
    
    console.log(`\u2705 Created AI provider: ${config.name} (${type})`);
  }

  static getProvider(name: string): AIProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider not found: ${name}`);
    }
    return provider;
  }

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

    if (this.defaultProvider) {
      try {
        return this.getProvider(this.defaultProvider);
      } catch (error) {
        console.warn(`Default provider ${this.defaultProvider} failed, trying fallback`);
      }
    }

    if (this.fallbackProvider) {
      return this.getProvider(this.fallbackProvider);
    }

    throw new Error(`No available AI provider for platform: ${platform}`);
  }

  static setPlatformMapping(mapping: PlatformProviderMapping): void {
    this.platformMappings.set(mapping.platform as PlatformType, mapping);
    console.log(`\u2705 Set provider mapping for ${mapping.platform}: ${mapping.primaryProvider}`);
  }

  static setDefaultProviders(defaultProvider: string, fallbackProvider?: string): void {
    this.defaultProvider = defaultProvider;
    this.fallbackProvider = fallbackProvider || null;
    console.log(`\u2705 Set default provider: ${defaultProvider}, fallback: ${fallbackProvider || 'none'}`);
  }

  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  static async checkProviderHealth(name: string): Promise<any> {
    const provider = this.getProvider(name);
    return await provider.getHealth();
  }

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

  static getPlatformMappings(): Map<PlatformType, PlatformProviderMapping> {
    return new Map(this.platformMappings);
  }

  static removeProvider(name: string): boolean {
    return this.providers.delete(name);
  }

  static clear(): void {
    this.providers.clear();
    this.platformMappings.clear();
    this.defaultProvider = null;
    this.fallbackProvider = null;
  }

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
// Legacy re-export removed during refactor. AIProviderRegistry is defined above.
