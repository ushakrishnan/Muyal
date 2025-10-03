import 'dotenv/config';
import { initMemory, conversationMemory } from '../src/core/memory';
import { integratedServer } from '../src/integrations/mcp/mcp-a2a-integration';
import { knowledgeLibrary } from '../src/core/knowledge/library';

async function run() {
  console.log('Initializing memory...');
  await initMemory();

  console.log('Initializing integrated server...');
  await integratedServer.initialize();

  const unified = integratedServer.getUnifiedServer();
  const convId = `repro-kelpie-${Date.now()}`;

  // First user ask
  console.log('\n=== User asks for kepie dog photo ===');
  const ask1 = await unified.callFunction('chat', { message: 'Can you show me a kepie dog photo?', conversationId: convId, platform: 'web' });
  console.log('Assistant response 1:', ask1.content || ask1);
  console.log('Assistant metadata 1:', ask1.provider ? ask1 : JSON.stringify(ask1));

  // User consents to Australian kelpie
  console.log('\n=== User: ok show Australian kelpie ===');
  const ask2 = await unified.callFunction('chat', { message: 'Ok', conversationId: convId, platform: 'web' });
  console.log('Assistant response 2:', ask2.content || ask2);
  console.log('Assistant metadata 2:', ask2.provider ? ask2 : JSON.stringify(ask2));

  // Read back messages from memory
  const msgs = await conversationMemory.getConversation(convId);
  console.log(`\nStored messages for ${convId}: (${Array.isArray(msgs) ? msgs.length : 'unknown'})`);
  if (Array.isArray(msgs)) {
    msgs.forEach((m: any, i: number) => {
      console.log(`- [${i}] role=${m.role} id=${m.id}`);
      console.log(`    content: ${String(m.content).slice(0,120)}`);
      console.log(`    metadata:`, m.metadata || {});
      if (m.metadata && m.metadata.knowledge_sources_used) console.log(`    knowledge_sources_used: ${JSON.stringify(m.metadata.knowledge_sources_used)}`);
    });
  }

  // Print knowledge summary
  console.log('\nKnowledge library summary:');
  try {
    console.log(knowledgeLibrary.getKnowledgeSummary());
  } catch (e) {
    console.warn('Could not fetch knowledge summary', e);
  }

  // Cleanup test conversation
  try {
    await conversationMemory.clearConversation(convId);
    console.log('\nCleared test conversation');
  } catch (e) {
    console.warn('Failed to clear conversation', e);
  }
}

run().catch(err => {
  console.error('Repro script failed:', err);
  process.exit(1);
});
