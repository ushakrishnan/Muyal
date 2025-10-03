import 'dotenv/config';
import { initMemory } from '../src/core/memory';
import { conversationMemory } from '../src/core/conversation-memory';

async function run() {
  await initMemory();
  const convId = `test-auto-${Date.now()}`;
  await conversationMemory.createContext(convId, 'auto-tester', 'test');
  const m = await conversationMemory.addMessage(convId, { timestamp: new Date(), role: 'user', content: 'unit test', metadata: {} });
  const msgs = await conversationMemory.getConversation(convId);
  if (!Array.isArray(msgs) || msgs.length === 0) throw new Error('No messages returned');
  await conversationMemory.clearConversation(convId);
  console.log('Memory test passed');
}

run().catch(err => { console.error('Memory test failed:', err); process.exit(1); });
