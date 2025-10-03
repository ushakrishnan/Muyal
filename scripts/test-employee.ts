import 'dotenv/config';
import { initMemory, conversationMemory } from '../src/core/memory';
import { integratedServer } from '../src/integrations/mcp/mcp-a2a-integration';

async function run() {
  await initMemory();
  await integratedServer.initialize();
  const unified = integratedServer.getUnifiedServer();
  const conv = `test-emp-${Date.now()}`;
  console.log('Calling chat with employee question...');
  const res = await unified.callFunction('chat', { message: 'Tell me about employee Alice from engineering', conversationId: conv, platform: 'web' });
  console.log('Response:', res);
  const msgs = await conversationMemory.getConversation(conv);
  console.log('Stored messages:');
  console.log(msgs && msgs.map((m:any)=>({id:m.id, role:m.role, metadata:m.metadata, content:String(m.content).slice(0,200)})));
  await conversationMemory.clearConversation(conv);
}

run().catch(e=>{console.error(e); process.exit(1);});