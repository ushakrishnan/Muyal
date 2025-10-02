export class SuggestionGenerator {
  static generate(response: string, userMessage: string): string[] {
    const suggestions: string[] = [];
    
    // Programming/code related suggestions
    if (this.isCodeRelated(response)) {
      suggestions.push("Can you explain this further?");
      suggestions.push("Show me an example");
      suggestions.push("What are the best practices?");
    }
    
    // Help/how-to related suggestions
    if (this.isHelpRequest(userMessage)) {
      suggestions.push("Tell me more about this topic");
      suggestions.push("What are the alternatives?");
      suggestions.push("Can you give me a step-by-step guide?");
    }
    
    // Azure related suggestions
    if (this.isAzureRelated(response)) {
      suggestions.push("How do I deploy this to Azure?");
      suggestions.push("What Azure services do I need?");
      suggestions.push("Show me Azure best practices");
    }
    
    // General conversation starters
    if (suggestions.length === 0) {
      suggestions.push("Can you elaborate on this?");
      suggestions.push("What should I know about this?");
      suggestions.push("Any tips or recommendations?");
    }
    
    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  private static isCodeRelated(text: string): boolean {
    const codeKeywords = ['code', 'programming', 'function', 'variable', 'class', 'method', 'api', 'sdk'];
    return codeKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private static isHelpRequest(text: string): boolean {
    const helpKeywords = ['help', 'how', 'what', 'why', 'when', 'where'];
    return helpKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private static isAzureRelated(text: string): boolean {
    const azureKeywords = ['azure', 'cloud', 'deployment', 'infrastructure', 'bicep', 'terraform'];
    return azureKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  static generateContextualSuggestions(
    response: string, 
    userMessage: string,
    conversationHistory?: any[]
  ): string[] {
    const suggestions = this.generate(response, userMessage);
    
    // Add context-based suggestions if we have conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      const lastMessages = conversationHistory.slice(-3);
      const topics = this.extractTopics(lastMessages);
      
      if (topics.includes('azure')) {
        suggestions.push("Continue with Azure topics");
      }
      
      if (topics.includes('programming')) {
        suggestions.push("More programming examples");
      }
    }
    
    return [...new Set(suggestions)].slice(0, 3); // Remove duplicates and limit
  }

  private static extractTopics(messages: any[]): string[] {
    const topics: string[] = [];
    const topicKeywords = {
      azure: ['azure', 'cloud', 'deployment'],
      programming: ['code', 'programming', 'development'],
      ai: ['ai', 'artificial intelligence', 'machine learning']
    };

    messages.forEach(message => {
      const content = message.content.toLowerCase();
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some(keyword => content.includes(keyword))) {
          topics.push(topic);
        }
      });
    });

    return [...new Set(topics)];
  }
}