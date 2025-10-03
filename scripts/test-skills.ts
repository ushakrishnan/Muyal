import 'dotenv/config';
import { initMemory } from '../src/core/memory';
import { integratedServer } from '../src/integrations/mcp/mcp-a2a-integration';

async function run() {
  await initMemory();
  await integratedServer.initialize();
  const unified = integratedServer.getUnifiedServer();
  const conv = `test-skills-${Date.now()}`;

  console.log('\n-- Asking for skills --');
  const res = await unified.callFunction('chat', { message: 'List me all your skills', conversationId: conv, platform: 'web' });
  console.log('Response:', res.content);
  console.log('Metadata:', res);

  // cleanup
  try { const { conversationMemory } = require('../src/core/memory'); await conversationMemory.clearConversation(conv); } catch (e) { /* ignore */ }
}

run().catch(err => { console.error(err); process.exit(1); });
