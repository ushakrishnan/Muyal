/**
 * Knowledge Sources Index
 * Central export point for all knowledge sources
 */

// Individual exports
export { employeeKnowledgeSource } from './employee-knowledge';
export { companyKnowledgeSource } from './company-knowledge';
export { weatherKnowledgeSource } from './weather-knowledge';
export { systemKnowledgeSource } from './system-knowledge';
export { dogKnowledgeSource } from './dog-knowledge';
export { eldenRingKnowledgeSource } from './eldenring-knowledge';
export { remoteEmployeeKnowledgeSource } from './remote-employee-knowledge';

// Collect all sources for easy registration
import { employeeKnowledgeSource } from './employee-knowledge';
import { companyKnowledgeSource } from './company-knowledge';
import { weatherKnowledgeSource } from './weather-knowledge';
import { systemKnowledgeSource } from './system-knowledge';
import { dogKnowledgeSource } from './dog-knowledge';
import { eldenRingKnowledgeSource } from './eldenring-knowledge';
import { remoteEmployeeKnowledgeSource } from './remote-employee-knowledge';

export const allKnowledgeSources = [
  employeeKnowledgeSource,
  companyKnowledgeSource,
  weatherKnowledgeSource,
  systemKnowledgeSource,
  dogKnowledgeSource,
  eldenRingKnowledgeSource
  , remoteEmployeeKnowledgeSource
];