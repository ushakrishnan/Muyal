const fs = require('fs');
const path = require('path');

// Simple concatenation of README and key docs into a single aggregate file
const workspace = process.cwd();
const docs = [
  path.join(workspace, 'README.md'),
  path.join(workspace, 'docs', 'ARCHITECTURE.md'),
  path.join(workspace, 'docs', 'SETUP_AND_USAGE.md'),
  path.join(workspace, 'docs', 'CAPABILITIES.md'),
  path.join(workspace, 'docs', 'TROUBLESHOOTING.md'),
  path.join(workspace, 'docs', 'MCP_A2A_INTEGRATION.md')
];

const outDir = path.join(workspace, 'src', 'core', 'knowledge-sources', 'knowledge-data');
const outFile = path.join(outDir, 'muyal-docs.txt');

try {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const pieces = [];
  pieces.push('Muyal Consolidated Documentation\n');
  for (const f of docs) {
    try {
      if (fs.existsSync(f)) {
        const name = path.relative(workspace, f);
        pieces.push('---- ' + name + ' ----\n');
        const content = fs.readFileSync(f, 'utf8');
        pieces.push(content + '\n\n');
      } else {
        pieces.push('---- ' + path.relative(workspace, f) + ' (missing) ----\n\n');
      }
    } catch (e) {
      pieces.push('Failed to read ' + f + ': ' + String(e) + '\n\n');
    }
  }

  fs.writeFileSync(outFile, pieces.join('\n'), 'utf8');
  console.log('Generated', outFile);
  process.exit(0);
} catch (e) {
  console.error('Failed to generate docs aggregate:', e);
  process.exit(1);
}
