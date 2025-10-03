/**
 * System Knowledge Source
 * Provides system information and agent capabilities
 */

import { KnowledgeSource } from '../knowledge/library';

export const systemKnowledgeSource: KnowledgeSource = {
  id: 'system',
  name: 'System Information',
  description: 'Agent capabilities, available functions, and system status',
  keywords: ['help', 'function', 'capability', 'command', 'system', 'agent', 'what can you do', 'how to'],
  priority: 60,
  isEnabled: true,

  isRelevant: (message: string): boolean => {
    const systemKeywords = [
      'help', 'function', 'capability', 'command', 'system', 'agent',
      'what can you do', 'how to', 'available', 'features', 'commands',
      'instructions', 'guide', 'manual', 'documentation', 'api'
    ];
    return systemKeywords.some(keyword => message.includes(keyword));
  },

  fetchContext: async (): Promise<string> => {
    return `MUYAL AGENT SYSTEM CAPABILITIES:

AVAILABLE FUNCTIONS:
🔍 Data & Search:
  - search_employees: Find employees by name, salary, or age criteria
  - get_employees: Retrieve complete employee database with statistics
  - get_weather: Get weather information for any location

💬 Communication:
  - send_message: Send messages to team members or groups
  - get_messages: Retrieve conversation history
  - reply_to_message: Respond to specific messages

🧠 Knowledge Management:
  - manage_knowledge: Control knowledge sources (enable/disable/list)

📊 Analytics & Insights:
  - Employee data analysis and salary statistics
  - Weather-based activity recommendations
  - Contextual suggestions based on conversation topics

🎯 SMART FEATURES:
- Automatic context enhancement based on conversation topics
- Intelligent function suggestions based on user intent
- Real-time data integration from multiple sources
- Adaptive responses based on available knowledge

💡 KNOWLEDGE DOMAINS:
- Employee Database: Staff information, salaries, demographics
- Company Information: Policies, benefits, organizational structure  
- Weather Data: Current conditions and forecasts
- System Help: Function documentation and capabilities

🔧 SYSTEM STATUS:
- All knowledge sources: Active
- API connections: Operational
- Function library: 14 available functions
- Response enhancement: Enabled`;
  },

  getSuggestions: (): string[] => [
    "Ask 'what can you do?' to see all capabilities",
    "Use 'help' to get function documentation",
    "Try 'manage_knowledge list' to see available knowledge sources",
    "Ask about specific functions like 'how to search employees'",
    "Request examples of data analysis capabilities",
    "Inquire about message and communication features",
    "Get guidance on weather-related queries",
    "Learn about knowledge enhancement features"
  ]
};