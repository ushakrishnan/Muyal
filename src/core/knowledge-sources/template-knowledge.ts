/**
 * Knowledge Source Template
 * Copy this file and customize it to create new knowledge sources
 * 
 * INSTRUCTIONS:
 * 1. Copy this file and rename it to describe your knowledge domain
 * 2. Update the export name and all properties
 * 3. Implement the three required methods: isRelevant, fetchContext, getSuggestions
 * 4. Add your new source to index.ts
 * 5. Test with sample queries
 */

import { KnowledgeSource } from '../knowledge/library';

export const templateKnowledgeSource: KnowledgeSource = {
  // Unique identifier for this knowledge source
  id: 'template',
  
  // Display name for this knowledge source
  name: 'Template Knowledge Source',
  
  // Brief description of what this source provides
  description: 'Template for creating new knowledge sources',
  
  // Keywords that indicate when this source is relevant
  // These should be words/phrases users might mention
  keywords: ['template', 'example', 'sample'],
  
  // Priority (0-100) - higher numbers mean higher priority when multiple sources match
  // Employee: 90, Company: 70, System: 60, Weather: 50
  priority: 30,
  
  // Whether this source is currently enabled
  isEnabled: true,

  /**
   * Determines if this knowledge source is relevant to a user's message
   * @param message - The user's message to analyze
   * @returns true if this source should provide context
   */
  isRelevant: (message: string): boolean => {
    // TODO: Implement logic to detect when this source is relevant
    // Example patterns:
    
    // 1. Simple keyword matching:
    // const keywords = ['keyword1', 'keyword2', 'phrase to match'];
    // return keywords.some(keyword => message.toLowerCase().includes(keyword.toLowerCase()));
    
    // 2. More sophisticated matching:
    // const relevantPatterns = [
    //   /\b(pattern1|pattern2)\b/i,
    //   /specific phrase/i
    // ];
    // return relevantPatterns.some(pattern => pattern.test(message));
    
    // 3. Combined approach:
    const templateKeywords = ['template', 'example', 'sample', 'how to create'];
    return templateKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  },

  /**
   * Fetches relevant context information for this knowledge domain
   * @returns Promise<string> - Formatted context information
   */
  fetchContext: async (): Promise<string> => {
    try {
      // TODO: Implement context fetching logic
      // This could involve:
      
      // 1. API calls:
      // const response = await fetch('https://api.example.com/data');
      // const data = await response.json();
      
      // 2. Database queries:
      // const results = await database.query('SELECT * FROM table');
      
      // 3. File system access:
      // const content = await fs.readFile('path/to/data.json', 'utf8');
      
      // 4. Static information:
      // return `STATIC INFORMATION:\n- Item 1\n- Item 2`;
      
      return `TEMPLATE KNOWLEDGE SOURCE:

EXAMPLE CONTEXT:
- This is sample context information
- Replace this with actual data for your knowledge domain
- Format the information clearly for easy reading

USAGE INSTRUCTIONS:
1. Identify what data this source should provide
2. Implement the data fetching logic above
3. Format the response in a clear, structured way
4. Handle errors gracefully

FORMATTING TIPS:
- Use clear headings with ALL CAPS
- Group related information together
- Use bullet points for lists
- Include relevant statistics or summaries
- Provide actionable information when possible`;
      
    } catch (error) {
      console.warn('Failed to fetch template data:', error);
      return 'Template knowledge source temporarily unavailable.';
    }
  },

  /**
   * Provides helpful suggestions for users based on this knowledge domain
   * @returns Array of suggestion strings
   */
  getSuggestions: (): string[] => [
    // TODO: Replace with actual suggestions for your knowledge domain
    // These should be:
    // 1. Specific actions users can take
    // 2. Questions they might want to ask
    // 3. Features they should know about
    // 4. Related functions they can use
    
    "Replace these with domain-specific suggestions",
    "Each suggestion should be actionable and helpful",
    "Consider what users typically want to know in this domain",
    "Include relevant function names if applicable",
    "Keep suggestions concise but descriptive",
    "Aim for 6-10 suggestions that cover main use cases",
    "Think about both beginner and advanced user needs",
    "Reference specific capabilities when possible"
  ]
};

/* 
DEVELOPMENT CHECKLIST:
□ Updated id, name, and description
□ Added relevant keywords for your domain
□ Set appropriate priority level
□ Implemented isRelevant() logic
□ Implemented fetchContext() with real data
□ Created helpful getSuggestions()
□ Added error handling in fetchContext()
□ Tested with sample user messages
□ Added to index.ts exports
□ Updated allKnowledgeSources array

TESTING SUGGESTIONS:
1. Test isRelevant() with various user messages
2. Verify fetchContext() returns useful information
3. Check that suggestions are helpful and actionable
4. Ensure error handling works properly
5. Test integration with the main knowledge library

COMMON PATTERNS:
- Financial data: Use currency formatting, calculate statistics
- User data: Protect sensitive information, provide summaries
- External APIs: Handle rate limits, cache responses
- Real-time data: Consider data freshness, update frequency
- Static content: Organize hierarchically, use consistent formatting
*/