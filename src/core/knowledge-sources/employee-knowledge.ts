/**
 * Employee Knowledge Source
 * Provides employee data from dummy API with smart suggestions
 */

import { KnowledgeSource } from '../knowledge/library';
import { logErrorEntity } from '../errors/error-entity';

// Fallback employee data when API is unavailable
const getFallbackEmployeeData = (): { noData: boolean; summary: string } => {
  const summary = `Employee database temporarily unavailable due to rate limiting.

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
  return { noData: true, summary };
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
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
          const note = `Employee API rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`;
          console.log(note);
          await logErrorEntity({
            timestamp: new Date().toISOString(),
            sourceId: 'employees',
            sourceName: 'Employee Database',
            operation: 'fetchContext',
            attempt,
            notes: note,
          });
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            // All retries exhausted, return structured fallback data
            console.warn('Employee API rate limited, using fallback data');
            const fb = getFallbackEmployeeData();
            await logErrorEntity({
              timestamp: new Date().toISOString(),
              sourceId: 'employees',
              sourceName: 'Employee Database',
              operation: 'fetchContext',
              attempt,
              notes: 'Retries exhausted - returning fallback summary',
            });
            return JSON.stringify({ noData: fb.noData, fallbackSummary: fb.summary });
          }
        }

        if (!response.ok) {
          const err = `HTTP ${response.status}`;
          await logErrorEntity({
            timestamp: new Date().toISOString(),
            sourceId: 'employees',
            sourceName: 'Employee Database',
            operation: 'fetchContext',
            attempt,
            error: err,
          });
          throw new Error(err);
        }

        const data = await response.json();
        const employees = data.status === 'success' ? data.data : [];

        if (!employees || employees.length === 0) {
          const fb = getFallbackEmployeeData();
          await logErrorEntity({
            timestamp: new Date().toISOString(),
            sourceId: 'employees',
            sourceName: 'Employee Database',
            operation: 'fetchContext',
            attempt,
            notes: 'Empty employee list from API - returning fallback',
            extra: { apiResponse: data }
          });
          return JSON.stringify({ noData: fb.noData, fallbackSummary: fb.summary });
        }

        const salaries = employees.map((e: any) => Number(e.employee_salary) || 0);
        const ages = employees.map((e: any) => Number(e.employee_age) || 0);

        // Return structured JSON so downstream components (model and logs) can detect no-data
        const payload = {
          noData: false,
          totalEmployees: employees.length,
          sample: employees.slice(0, 5).map((emp: any) => ({ name: emp.employee_name, age: emp.employee_age, salary: emp.employee_salary })),
          statistics: {
            salaryRange: [Math.min(...salaries), Math.max(...salaries)],
            averageSalary: Math.round(salaries.reduce((sum: number, sal: number) => sum + sal, 0) / salaries.length),
            ageRange: [Math.min(...ages), Math.max(...ages)],
            averageAge: Math.round(ages.reduce((sum: number, age: number) => sum + age, 0) / ages.length)
          }
        };

        return JSON.stringify(payload);
      } catch (error) {
        // Log the error and if this was the last attempt, return structured fallback
        await logErrorEntity({
          timestamp: new Date().toISOString(),
          sourceId: 'employees',
          sourceName: 'Employee Database',
          operation: 'fetchContext',
          attempt,
          error,
        });

        if (attempt === maxRetries) {
          console.warn('Failed to fetch employee data after retries:', error);
          const fb = getFallbackEmployeeData();
          return JSON.stringify({ noData: fb.noData, fallbackSummary: fb.summary });
        }
        // Continue to next retry attempt
      }
    }
    
    const fb = getFallbackEmployeeData();
    return JSON.stringify({ noData: fb.noData, fallbackSummary: fb.summary });
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