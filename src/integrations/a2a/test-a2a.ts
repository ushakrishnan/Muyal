import A2AClient from './a2a-client';

async function main() {
  const client = new A2AClient({ timeoutMs: 3000, maxRetries: 1 });

  console.log('Calling mock echo...');
  const r1 = await client.callAgent('echo', { hello: 'world' });
  console.log('Echo response:', r1);

  console.log('Calling list_tools...');
  const r2 = await client.callAgent('list_tools');
  console.log('List response:', r2);

  try {
    console.log('Calling unknown tool...');
    const r3 = await client.callAgent('unknown_tool');
    console.log('Unknown tool response:', r3);
  } catch (err) {
    console.error('Error calling unknown tool:', err);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
