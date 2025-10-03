import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { conversationMemory } from '../src/core/conversation-memory';
import { memoryProvider, initMemory } from '../src/core/memory';

async function run() {

  // ensure provider init runs (creates DB/container for Cosmos)
  console.log('Initializing provider (if it has init) ...');
  await initMemory();
  console.log('Active provider constructor:', memoryProvider && (memoryProvider as any).constructor ? (memoryProvider as any).constructor.name : typeof memoryProvider);

  const convId = `verify-${Date.now()}`;
  console.log('Using conversationId:', convId);

  // create context (await if async)
  await conversationMemory.createContext(convId, 'verify-user', 'script');

  const msg = await conversationMemory.addMessage(convId, {
    timestamp: new Date(),
    role: 'user',
    content: 'Verification ping - write destination check',
    metadata: { verify: true }
  });

  console.log('addMessage returned id:', msg.id);

  // Check filesystem: a filesystem provider would create a file named <convId>.json under data/conversations/messages
  const filePath = path.join(process.cwd(), 'data', 'conversations', 'messages', `${convId}.json`);
  if (fs.existsSync(filePath)) {
    console.log('Filesystem file exists at', filePath);
    try { const contents = fs.readFileSync(filePath, 'utf-8'); console.log('File preview:', contents.slice(0, 800)); } catch (e) { /* ignore */ }
  } else {
    console.log('No filesystem file created at', filePath);
  }

  // Try to read the created item from Cosmos using SDK directly
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cosmos = require('@azure/cosmos');
    const CosmosClient = cosmos.CosmosClient;
    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;
    if (endpoint && key) {
      try { const host = new URL(endpoint).hostname; if (host === 'localhost' || host === '127.0.0.1') process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; } catch (e) {}
      const client = new CosmosClient({ endpoint, key });
      const db = client.database(process.env.COSMOS_DB_DATABASE);
      const cont = db.container(process.env.COSMOS_DB_CONTAINER);
      const id = msg.id;
      const partition = convId;
      console.log('Attempting to read from Cosmos by id and partition:', { id, partition });
      const read = await cont.item(id, partition).read().catch((e: any) => ({ error: String(e) }));
      console.log('Cosmos read response (raw):', read && (read.resource || read.item || read));
    } else {
      console.log('COSMOS_DB_ENDPOINT / COSMOS_DB_KEY not set; skipping Cosmos read');
    }
  } catch (e) {
    console.error('Cosmos SDK not present or error while reading:', String(e));
  }

  // final check: call getConversation
  const conv = await conversationMemory.getConversation(convId);
  console.log('conversationMemory.getConversation returned count:', Array.isArray(conv) ? conv.length : typeof conv);
  if (Array.isArray(conv)) console.log('first item preview:', conv[0]);

  console.log('Verify-destination complete');
}

run().catch(err => { console.error('Error in verify script:', err); process.exit(1); });
