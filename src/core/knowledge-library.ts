/**
 * Knowledge Library - Modular knowledge integration for AI chat enhancement
 * 
 * This library provides a clean pattern for adding different knowledge sources
 * to your AI agent's chat function. Each knowledge source can be added/removed
 * independently and provides automatic context injection and chat suggestions.
 */

export interface KnowledgeSource {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  priority: number; // Higher number = higher priority
  isRelevant: (message: string) => boolean;
  fetchContext: () => Promise<string>;
  getSuggestions: () => string[];
  isEnabled: boolean;
}

export interface KnowledgeContext {
  sources: KnowledgeSource[];
  enhancedMessage: string;
  suggestions: string[];
  usedSources: string[];
}

export class KnowledgeLibrary {
  private sources: Map<string, KnowledgeSource> = new Map();

  /**
   * Register a new knowledge source
   */
  registerSource(source: KnowledgeSource): void {
    this.sources.set(source.id, source);
    console.log(`📚 Registered knowledge source: ${source.name}`);
  }

  /**
   * Remove a knowledge source
   */
  removeSource(sourceId: string): void {
    this.sources.delete(sourceId);
    console.log(`📚 Removed knowledge source: ${sourceId}`);
  }

  /**
   * Get all registered sources
   */
  getSources(): KnowledgeSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * Enable/disable a knowledge source
   */
  setSourceEnabled(sourceId: string, enabled: boolean): void {
    const source = this.sources.get(sourceId);
    if (source) {
      source.isEnabled = enabled;
      console.log(`📚 ${enabled ? 'Enabled' : 'Disabled'} knowledge source: ${source.name}`);
    }
  }

  /**
   * Enhance a message with relevant knowledge context
   */
  async enhanceMessage(originalMessage: string): Promise<KnowledgeContext> {
    const message = originalMessage.toLowerCase();
    const relevantSources: KnowledgeSource[] = [];
    const suggestions: string[] = [];
    const usedSources: string[] = [];

    // Find relevant sources
    for (const source of this.sources.values()) {
      if (source.isEnabled && source.isRelevant(message)) {
        relevantSources.push(source);
      }
    }

    // Sort by priority (highest first)
    relevantSources.sort((a, b) => b.priority - a.priority);

    let enhancedMessage = originalMessage;
    let contextSections: string[] = [];

    // Fetch context from relevant sources
    for (const source of relevantSources) {
      try {
        const context = await source.fetchContext();
        if (context) {
          contextSections.push(`[${source.name.toUpperCase()} KNOWLEDGE BASE]\n${context}`);
          suggestions.push(...source.getSuggestions());
          usedSources.push(source.id);
        }
      } catch (error) {
        console.warn(`Failed to fetch context from ${source.name}:`, error);
      }
    }

    // Add all context sections to the message
    if (contextSections.length > 0) {
      enhancedMessage = `${originalMessage}

${contextSections.join('\n\n')}

Please use this knowledge to provide accurate, data-driven responses. If the user is asking for specific information covered by these knowledge bases, reference the data directly.`;
    }

    return {
      sources: relevantSources,
      enhancedMessage,
      suggestions: [...new Set(suggestions)], // Remove duplicates
      usedSources,
    };
  }

  /**
   * Get suggestions for a message without fetching full context (faster)
   */
  getQuickSuggestions(message: string): string[] {
    const suggestions: string[] = [];
    const messageLower = message.toLowerCase();

    for (const source of this.sources.values()) {
      if (source.isEnabled && source.isRelevant(messageLower)) {
        suggestions.push(...source.getSuggestions());
      }
    }

    return [...new Set(suggestions)];
  }

  /**
   * Get summary of available knowledge sources
   */
  getKnowledgeSummary(): { [key: string]: any } {
    const summary: { [key: string]: any } = {};
    
    for (const source of this.sources.values()) {
      summary[source.id] = {
        name: source.name,
        description: source.description,
        enabled: source.isEnabled,
        keywords: source.keywords,
        priority: source.priority,
      };
    }

    return summary;
  }
}

// Global knowledge library instance
export const knowledgeLibrary = new KnowledgeLibrary();