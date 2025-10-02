/**
 * Employee Knowledge Source
 * Provides employee data from dummy API with smart suggestions
 */

import { KnowledgeSource } from '../knowledge-library';

// Fallback employee data when API is unavailable
const getFallbackEmployeeData = (): string => {
  return `Employee database temporarily unavailable due to rate limiting.

FALLBACK EMPLOYEE DATA (Sample):
- Tiger Nixon: Age 61, Salary $320,800
- Garrett Winters: Age 63, Salary $170,750  
- Ashton Cox: Age 66, Salary $86,000
- Cedric Kelly: Age 22, Salary $433,060
- Airi Satou: Age 33, Salary $162,700

ESTIMATED STATISTICS:
- Total Employees: ~24 (when API available)
- Salary Range: $86,000 - $433,060
- Average Salary: ~$200,000
- Age Range: 19 - 66 years
- Average Age: ~40 years

Note: This is cached/fallback data. Real-time data temporarily unavailable due to API rate limits.
Please try again in a few moments for live employee statistics.`;
};

export const employeeKnowledgeSource: KnowledgeSource = {
  id: 'employees',
  name: 'Employee Database',
  description: 'Company employee information including salaries, ages, and names',
  keywords: ['employee', 'staff', 'worker', 'salary', 'team', 'hire', 'hr', 'payroll', 'oldest', 'youngest', 'highest paid', 'lowest paid'],
  priority: 90,
  isEnabled: true,

  isRelevant: (message: string): boolean => {
    const employeeKeywords = [
      'employee', 'staff', 'worker', 'salary', 'team', 'hire', 'hr', 'payroll',
      'who works', 'how many people', 'oldest', 'youngest', 'highest paid', 'lowest paid',
      'workforce', 'personnel', 'compensation', 'wages', 'benefits'
    ];
    return employeeKeywords.some(keyword => message.includes(keyword));
  },

  fetchContext: async (): Promise<string> => {
    // Retry logic for handling rate limits
    const maxRetries = 2;
    const baseDelay = 1000; // 1 second
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch('https://dummy.restapiexample.com/api/v1/employees');
        
        if (response.status === 429) {
          // Rate limited - wait before retry
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
            console.log(`Employee API rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            // All retries exhausted, return fallback data
            console.warn('Employee API rate limited, using fallback data');
            return getFallbackEmployeeData();
          }
        }
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const employees = data.status === 'success' ? data.data : [];
        
        if (employees.length === 0) return getFallbackEmployeeData();

        const salaries = employees.map((e: any) => e.employee_salary);
        const ages = employees.map((e: any) => e.employee_age);
        
        return `Current employee database contains ${employees.length} employees:

SAMPLE EMPLOYEES:
${employees.slice(0, 5).map((emp: any) => 
  `- ${emp.employee_name}: Age ${emp.employee_age}, Salary $${emp.employee_salary.toLocaleString()}`
).join('\n')}
${employees.length > 5 ? `... and ${employees.length - 5} more employees` : ''}

STATISTICS:
- Total Employees: ${employees.length}
- Salary Range: $${Math.min(...salaries).toLocaleString()} - $${Math.max(...salaries).toLocaleString()}
- Average Salary: $${Math.round(salaries.reduce((sum: number, sal: number) => sum + sal, 0) / salaries.length).toLocaleString()}
- Age Range: ${Math.min(...ages)} - ${Math.max(...ages)} years
- Average Age: ${Math.round(ages.reduce((sum: number, age: number) => sum + age, 0) / ages.length)} years

TOP EARNERS:
${[...employees].sort((a: any, b: any) => b.employee_salary - a.employee_salary).slice(0, 3).map((emp: any) => 
  `- ${emp.employee_name}: $${emp.employee_salary.toLocaleString()}`
).join('\n')}`;
      } catch (error) {
        if (attempt === maxRetries) {
          console.warn('Failed to fetch employee data after retries:', error);
          return getFallbackEmployeeData();
        }
        // Continue to next retry attempt
      }
    }
    
    return getFallbackEmployeeData();
  },

  getSuggestions: (): string[] => [
    "Ask about salary statistics and distribution",
    "Find the highest or lowest paid employees", 
    "Analyze workforce demographics by age",
    "Compare compensation across different age groups",
    "Identify employees for promotion consideration",
    "Get workforce planning insights",
    "Use search_employees function for specific queries",
    "Use get_employees function for complete data with statistics"
  ]
};