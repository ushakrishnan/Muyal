import 'dotenv/config';
import { initMemory, conversationMemory } from '../src/core/memory';

async function runTest() {
  console.log('Initializing memory provider...');
  try {
    await initMemory();
    console.log('Memory provider initialized');
  } catch (err) {
    console.error('Failed to initialize memory provider:', err);
    process.exit(1);
  }

  const convId = `test-${Date.now()}`;
  console.log('Creating context for', convId);
  await conversationMemory.createContext(convId, 'test-user', 'script');

  console.log('Adding a test message...');
  const msg = await conversationMemory.addMessage(convId, {
    timestamp: new Date(),
    role: 'user',
    content: 'Hello from memory test',
    metadata: { test: true }
  });

  console.log('Message saved with id:', msg.id);

  const messages = await conversationMemory.getConversation(convId);
  console.log('Read back messages count:', Array.isArray(messages) ? messages.length : typeof messages);
  if (Array.isArray(messages)) console.log(messages.map((m: any) => ({ id: m.id, role: m.role, content: m.content })));

  console.log('Clearing test conversation...');
  await conversationMemory.clearConversation(convId);
  console.log('Done');
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
