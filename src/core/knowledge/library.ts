export interface KnowledgeSource {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  priority: number;
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
  private version = 1;
  private changeListeners: Array<() => void> = [];

  registerSource(source: KnowledgeSource): void {
    this.sources.set(source.id, source);
    console.log(`\ud83d\udcda Registered knowledge source: ${source.name}`);
    this.bumpVersion();
  }

  removeSource(sourceId: string): void {
    this.sources.delete(sourceId);
    console.log(`\ud83d\udcda Removed knowledge source: ${sourceId}`);
    this.bumpVersion();
  }

  getSources(): KnowledgeSource[] {
    return Array.from(this.sources.values());
  }

  setSourceEnabled(sourceId: string, enabled: boolean): void {
    const source = this.sources.get(sourceId);
    if (source) {
      source.isEnabled = enabled;
      console.log(`\ud83d\udcda ${enabled ? 'Enabled' : 'Disabled'} knowledge source: ${source.name}`);
      this.bumpVersion();
    }
  }

  getVersion(): number {
    return this.version;
  }

  onChange(listener: () => void): void {
    this.changeListeners.push(listener);
  }

  private bumpVersion(): void {
    this.version += 1;
    try {
      for (const l of this.changeListeners) {
        try { l(); } catch (e) { console.warn('knowledgeLibrary change listener errored', e); }
      }
    } finally {
      console.log('\ud83d\udce6 Knowledge library version bumped to', this.version);
    }
  }

  async enhanceMessage(originalMessage: string): Promise<KnowledgeContext> {
    const message = originalMessage.toLowerCase();
    const relevantSources: KnowledgeSource[] = [];
    const suggestions: string[] = [];
    const usedSources: string[] = [];

    for (const source of this.sources.values()) {
      if (source.isEnabled && source.isRelevant(message)) {
        relevantSources.push(source);
      }
    }

    relevantSources.sort((a, b) => b.priority - a.priority);

    let enhancedMessage = originalMessage;
    let contextSections: string[] = [];

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

    if (contextSections.length > 0) {
      enhancedMessage = `${originalMessage}\n\n${contextSections.join('\n\n')}\n\nPlease use this knowledge to provide accurate, data-driven responses. If the user is asking for specific information covered by these knowledge bases, reference the data directly.`;
    }

    return {
      sources: relevantSources,
      enhancedMessage,
      suggestions: [...new Set(suggestions)],
      usedSources,
    };
  }

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
   * Enhance a message by explicitly using a list of source IDs (useful for continuation/ack replies)
   */
  async enhanceWithSourceIds(originalMessage: string, sourceIds: string[]): Promise<KnowledgeContext> {
    if (!sourceIds || sourceIds.length === 0) {
      return this.enhanceMessage(originalMessage);
    }

    const suggestions: string[] = [];
    const usedSources: string[] = [];
    const contextSections: string[] = [];

    for (const id of sourceIds) {
      const source = this.sources.get(id);
      if (!source || !source.isEnabled) continue;
      try {
        const context = await source.fetchContext();
        if (context) {
          contextSections.push(`[${source.name.toUpperCase()} KNOWLEDGE BASE]\n${context}`);
          suggestions.push(...source.getSuggestions());
          usedSources.push(source.id);
        }
      } catch (error) {
        console.warn(`Failed to fetch context from ${id}:`, error);
      }
    }

    let enhancedMessage = originalMessage;
    if (contextSections.length > 0) {
      enhancedMessage = `${originalMessage}\n\n${contextSections.join('\n\n')}\n\nPlease use this knowledge to provide accurate, data-driven responses. If the user is asking for specific information covered by these knowledge bases, reference the data directly.`;
    }

    return {
      sources: usedSources.map(id => this.sources.get(id)!).filter(Boolean) as KnowledgeSource[],
      enhancedMessage,
      suggestions: [...new Set(suggestions)],
      usedSources,
    };
  }

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

export const knowledgeLibrary = new KnowledgeLibrary();
// Legacy re-export removed during refactor. The canonical KnowledgeLibrary implementation is above.
