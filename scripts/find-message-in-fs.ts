import * as fs from 'fs';
import * as path from 'path';

const searchText = process.argv[2] || 'Hello from memory test';
const dir = path.join(process.cwd(), 'data', 'conversations', 'messages');

function run() {
  if (!fs.existsSync(dir)) {
    console.log('No messages directory found at', dir);
    process.exit(0);
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  let found = 0;
  for (const f of files) {
    try {
      const content = fs.readFileSync(path.join(dir, f), 'utf-8');
      if (content.includes(searchText)) {
        found++;
        console.log('Found in file:', f);
        console.log(content.slice(0, 800));
      }
    } catch (e) { /* ignore */ }
  }

  console.log(`Search complete. Found ${found} files containing "${searchText}".`);
}

run();
