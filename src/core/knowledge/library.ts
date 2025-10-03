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
    const debug = !!process.env.KNOWLEDGE_DEBUG;

    for (const source of this.sources.values()) {
      if (source.isEnabled && source.isRelevant(message)) {
        relevantSources.push(source);
        if (debug) console.debug(`[knowledge:enhance] candidate source=${source.id} name=${source.name}`);
      }
    }

    relevantSources.sort((a, b) => b.priority - a.priority);

    let enhancedMessage = originalMessage;
    let contextSections: string[] = [];

    for (const source of relevantSources) {
      try {
        if (debug) console.debug(`[knowledge:enhance] fetching context from ${source.id}`);
        const rawContext = await source.fetchContext();
        if (debug) console.debug(`[knowledge:enhance] fetched rawContext length=${rawContext ? String(rawContext).length : 0}`);
        if (rawContext) {
          // Allow sources to return structured JSON (stringified) with a
          // well-known shape. If JSON parse succeeds and contains a `noData`
          // flag or structured fields, render a compact, model-friendly
          // snippet so the model can answer specific numeric queries reliably.
          let rendered = '';
          try {
            const parsed = typeof rawContext === 'string' ? JSON.parse(rawContext) : rawContext;
            // Handle common structured shapes produced by sources
            if (parsed && typeof parsed === 'object') {
              if (parsed.noData === true && parsed.fallbackSummary) {
                rendered = `Fallback data (source may be rate-limited):\n${parsed.fallbackSummary}`;
              } else if (parsed.noData === false && typeof parsed.totalEmployees === 'number') {
                const stats = parsed.statistics || {};
                const sample = Array.isArray(parsed.sample) ? parsed.sample.map((s: any) => `- ${s.name}: Age ${s.age}, Salary $${s.salary}`).join('\n') : '';
                rendered = `Total Employees: ${parsed.totalEmployees}\n` +
                  (stats.salaryRange ? `Salary Range: $${stats.salaryRange[0]} - $${stats.salaryRange[1]}\n` : '') +
                  (stats.averageSalary ? `Average Salary: $${stats.averageSalary}\n` : '') +
                  (stats.ageRange ? `Age Range: ${stats.ageRange[0]} - ${stats.ageRange[1]}\n` : '') +
                  (stats.averageAge ? `Average Age: ${stats.averageAge}\n` : '') +
                  (sample ? `\nSAMPLE EMPLOYEES:\n${sample}` : '');
              } else {
                // Generic object -> pretty-print summary keys
                rendered = Object.keys(parsed).slice(0, 10).map(k => `${k}: ${JSON.stringify(parsed[k])}`).join('\n');
              }
            } else {
              rendered = String(rawContext);
            }
          } catch (e) {
            // Not JSON - treat as raw text
            rendered = String(rawContext);
          }

          if (rendered) {
            contextSections.push(`[${source.name.toUpperCase()} KNOWLEDGE BASE]\n${rendered}`);
            suggestions.push(...source.getSuggestions());
            usedSources.push(source.id);
            if (debug) console.debug(`[knowledge:enhance] used source=${source.id}`);
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch context from ${source.name}:`, error);
      }
    }

    if (contextSections.length > 0) {
      enhancedMessage = `${originalMessage}\n\n${contextSections.join('\n\n')}\n\nPlease use this knowledge to provide accurate, data-driven responses. If the user is asking for specific information covered by these knowledge bases, reference the data directly.`;
    }

    const uniqueSuggestions = [...new Set(suggestions)];
    const topSuggestions = uniqueSuggestions.slice(0, 3);

    return {
      sources: relevantSources,
      enhancedMessage,
      suggestions: topSuggestions,
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

    const unique = [...new Set(suggestions)];
    return unique.slice(0, 3);
  }

  /**
   * Enhance a message by explicitly using a list of source IDs (useful for continuation/ack replies)
   */
  async enhanceWithSourceIds(originalMessage: string, sourceIds: string[]): Promise<KnowledgeContext> {
    const debug = !!process.env.KNOWLEDGE_DEBUG;
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
        if (debug) console.debug(`[knowledge:enhanceWithSourceIds] fetching ${id}`);
        const rawContext = await source.fetchContext();
        if (debug) console.debug(`[knowledge:enhanceWithSourceIds] fetched length=${rawContext ? String(rawContext).length : 0}`);
        if (rawContext) {
          let rendered = '';
          try {
            const parsed = typeof rawContext === 'string' ? JSON.parse(rawContext) : rawContext;
            if (parsed && typeof parsed === 'object') {
              if (parsed.noData === true && parsed.fallbackSummary) {
                rendered = `Fallback data (source may be rate-limited):\n${parsed.fallbackSummary}`;
              } else if (parsed.noData === false && typeof parsed.totalEmployees === 'number') {
                const stats = parsed.statistics || {};
                const sample = Array.isArray(parsed.sample) ? parsed.sample.map((s: any) => `- ${s.name}: Age ${s.age}, Salary $${s.salary}`).join('\n') : '';
                rendered = `Total Employees: ${parsed.totalEmployees}\n` +
                  (stats.salaryRange ? `Salary Range: $${stats.salaryRange[0]} - $${stats.salaryRange[1]}\n` : '') +
                  (stats.averageSalary ? `Average Salary: $${stats.averageSalary}\n` : '') +
                  (stats.ageRange ? `Age Range: ${stats.ageRange[0]} - ${stats.ageRange[1]}\n` : '') +
                  (stats.averageAge ? `Average Age: ${stats.averageAge}\n` : '') +
                  (sample ? `\nSAMPLE EMPLOYEES:\n${sample}` : '');
              } else {
                rendered = Object.keys(parsed).slice(0, 10).map(k => `${k}: ${JSON.stringify(parsed[k])}`).join('\n');
              }
            } else {
              rendered = String(rawContext);
            }
          } catch (e) {
            rendered = String(rawContext);
          }

          if (rendered) {
            contextSections.push(`[${source.name.toUpperCase()} KNOWLEDGE BASE]\n${rendered}`);
            suggestions.push(...source.getSuggestions());
            usedSources.push(source.id);
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch context from ${id}:`, error);
      }
    }

    let enhancedMessage = originalMessage;
    if (contextSections.length > 0) {
      enhancedMessage = `${originalMessage}\n\n${contextSections.join('\n\n')}\n\nPlease use this knowledge to provide accurate, data-driven responses. If the user is asking for specific information covered by these knowledge bases, reference the data directly.`;
    }

    const uniqueSuggestions = [...new Set(suggestions)];
    const topSuggestions = uniqueSuggestions.slice(0, 3);

    return {
      sources: usedSources.map(id => this.sources.get(id)!).filter(Boolean) as KnowledgeSource[],
      enhancedMessage,
      suggestions: topSuggestions,
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
