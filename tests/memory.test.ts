import path from 'path';
// Ensure tests use filesystem memory provider (avoid contacting Cosmos emulator during unit tests)
process.env.MEMORY_PROVIDER = process.env.MEMORY_PROVIDER || 'filesystem';
process.env.CONVERSATION_STORAGE_DIR = process.env.CONVERSATION_STORAGE_DIR || path.join(process.cwd(), 'tmp', 'test-conversations');
import 'dotenv/config';
import { initMemory, conversationMemory } from '../src/core/memory';

describe('conversation memory', () => {
  test('basic create/add/get/clear cycle', async () => {
    await initMemory();
    const convId = `test-auto-${Date.now()}`;
    await conversationMemory.createContext(convId, 'auto-tester', 'test');
    const m = await conversationMemory.addMessage(convId, { timestamp: new Date(), role: 'user', content: 'unit test', metadata: {} });
    expect(m).toBeDefined();
    const msgs = await conversationMemory.getConversation(convId);
    expect(Array.isArray(msgs)).toBe(true);
    expect(msgs.length).toBeGreaterThanOrEqual(1);
    await conversationMemory.clearConversation(convId);
    const cleared = await conversationMemory.getConversation(convId);
    expect(Array.isArray(cleared)).toBe(true);
  }, 20000);
});

