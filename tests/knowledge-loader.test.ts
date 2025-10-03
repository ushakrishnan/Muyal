import { loadKnowledgeFromDir } from '../src/core/knowledge-sources/json-loader';
import path from 'path';

describe('knowledge loader', () => {
  test('loads descriptors from data/knowledge and contains company-overview', () => {
    const dir = path.join(process.cwd(), 'data', 'knowledge');
    const sources = loadKnowledgeFromDir(dir);
    expect(Array.isArray(sources)).toBe(true);
    const found = sources.find(s => s.id === 'company-overview');
    expect(found).toBeDefined();
  });
});
