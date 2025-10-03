/**
 * Company Knowledge Source
 * Provides general company information and policies
 */

import { KnowledgeSource } from '../knowledge/library';

export const companyKnowledgeSource: KnowledgeSource = {
  id: 'company',
  name: 'Company Information',
  description: 'General company information, policies, and organizational structure',
  keywords: ['company', 'policy', 'office', 'organization', 'structure', 'mission', 'vision', 'values', 'culture', 'benefits'],
  priority: 70,
  isEnabled: true,

  isRelevant: (message: string): boolean => {
    const companyKeywords = [
      'company', 'policy', 'office', 'organization', 'mission', 'vision', 'values',
      'culture', 'benefits', 'workplace', 'corporate', 'business', 'structure',
      'department', 'division', 'headquarters', 'location', 'history'
    ];
    return companyKeywords.some(keyword => message.includes(keyword));
  },

  fetchContext: async (): Promise<string> => {
    // This would typically fetch from a company database or CMS
    return `COMPANY INFORMATION:

ABOUT US:
- Name: Muyal Technology Solutions
- Founded: 2020
- Headquarters: Seattle, WA
- Industry: Software Development & AI Solutions
- Size: Growing startup with distributed team

MISSION & VALUES:
- Mission: Delivering innovative AI-powered solutions that transform business operations
- Core Values: Innovation, Quality, Collaboration, Customer Success
- Culture: Remote-first, diverse, learning-focused environment

OFFICE POLICIES:
- Work Schedule: Flexible hours with core collaboration time 10 AM - 3 PM PST
- Remote Work: Fully remote with optional co-working spaces
- Time Off: Unlimited PTO policy with minimum 3 weeks encouraged
- Professional Development: Annual learning budget of $2,000 per employee

BENEFITS PACKAGE:
- Health: Full medical, dental, vision coverage
- Retirement: 401(k) with 4% company match
- Equipment: Laptop, monitor, home office setup allowance
- Wellness: Mental health support, fitness reimbursement

ORGANIZATIONAL STRUCTURE:
- Engineering Team: Core development and AI research
- Product Team: Strategy, design, and user experience
- Operations Team: HR, finance, and business operations
- Sales & Marketing: Customer acquisition and success`;
  },

  getSuggestions: (): string[] => [
    "Learn about company mission and values",
    "Review workplace policies and benefits",
    "Understand organizational structure",
    "Get information about remote work policies",
    "Ask about professional development opportunities",
    "Inquire about company culture and work environment",
    "Find details about time-off and leave policies",
    "Explore career growth paths within the company"
  ]
};