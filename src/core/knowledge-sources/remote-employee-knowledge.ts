import { KnowledgeSource } from '../knowledge/library';
import { integratedServer } from '../../integrations/mcp/mcp-a2a-integration';

export const remoteEmployeeKnowledgeSource: KnowledgeSource = {
  id: 'remote-employee',
  name: 'Remote Employee Agent',
  description: 'Fetch employee data from a remote agent via A2A',
  keywords: ['employee', 'staff', 'people', 'hr'],
  priority: 40,
  isEnabled: true,

  isRelevant: (message: string): boolean => {
    const lower = message.toLowerCase();
    return ['employee', 'emp', 'staff', 'who is', 'employee id', 'find employee', 'salary'].some(k => lower.includes(k));
  },

  fetchContext: async (): Promise<string> => {
    try {
      const client = integratedServer.getA2AClient();
      // Call a remote agent capability; in a real deployment the agent id and capability should be configurable
      const resp: any = await client.callAgent('get_employees', { limit: 5 }).catch(() => null);
      if (resp && resp.employees && resp.employees.length > 0) {
        const lines = resp.employees.map((e: any) => `- ${e.employee_name} — ${e.employee_age} yrs — salary ${e.employee_salary}`);
        return `Remote HR agent returned ${resp.returned_count || resp.employees.length} employees:\n${lines.join('\n')}`;
      }
      return '';
    } catch (err) {
      return '';
    }
  },

  getSuggestions: (): string[] => [
    'Ask for employee salary statistics from the remote HR agent',
    'Request a list of employees by department from the remote agent',
    'Ask for the youngest or oldest employee using the remote agent',
  ],
};

export default remoteEmployeeKnowledgeSource;
