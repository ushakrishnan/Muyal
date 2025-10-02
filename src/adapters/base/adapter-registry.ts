import { PlatformAdapter } from "./platform-adapter";
import { PlatformType } from "../../core/types";

export class AdapterRegistry {
  private static adapters = new Map<PlatformType, PlatformAdapter>();

  /**
   * Register a platform adapter
   */
  static register(adapter: PlatformAdapter): void {
    this.adapters.set(adapter.platform, adapter);
    console.log(`✅ Registered adapter for platform: ${adapter.platform}`);
  }

  /**
   * Get adapter for a specific platform
   */
  static get(platform: PlatformType): PlatformAdapter {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new Error(`No adapter registered for platform: ${platform}`);
    }
    return adapter;
  }

  /**
   * Check if platform is supported
   */
  static isSupported(platform: PlatformType): boolean {
    return this.adapters.has(platform);
  }

  /**
   * Get list of supported platforms
   */
  static getSupportedPlatforms(): PlatformType[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get all registered adapters
   */
  static getAll(): Map<PlatformType, PlatformAdapter> {
    return new Map(this.adapters);
  }

  /**
   * Unregister an adapter (useful for testing)
   */
  static unregister(platform: PlatformType): boolean {
    return this.adapters.delete(platform);
  }

  /**
   * Clear all adapters (useful for testing)
   */
  static clear(): void {
    this.adapters.clear();
  }

  /**
   * Initialize all adapters
   */
  static async initializeAll(): Promise<void> {
    const initPromises = Array.from(this.adapters.values()).map(adapter => {
      // If adapter has initialization method, call it
      if ('initialize' in adapter && typeof adapter.initialize === 'function') {
        return (adapter as any).initialize();
      }
      return Promise.resolve();
    });

    await Promise.all(initPromises);
    console.log(`✅ Initialized ${this.adapters.size} platform adapters`);
  }

  /**
   * Get adapter capabilities
   */
  static getCapabilities(platform: PlatformType): {
    supportsTypingIndicator: boolean;
    supportsRichContent: boolean;
  } {
    const adapter = this.get(platform);
    return {
      supportsTypingIndicator: adapter.supportsTypingIndicator,
      supportsRichContent: adapter.supportsRichContent
    };
  }

  /**
   * Validate that required adapters are registered
   */
  static validateRequiredAdapters(requiredPlatforms: PlatformType[]): void {
    const missing = requiredPlatforms.filter(platform => !this.isSupported(platform));
    
    if (missing.length > 0) {
      throw new Error(`Missing required adapters: ${missing.join(', ')}`);
    }
  }
}

// Auto-register adapters (will be imported by main app)
export { AdapterRegistry as default };

// Export function to register all core adapters
export function registerCoreAdapters(): void {
  // This will be called by the main application to register
  // Microsoft365Adapter and WebAdapter
  console.log('🔄 Registering core adapters...');
}