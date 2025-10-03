import { spawnSync } from 'child_process';

function runCommand(cmd: string) {
  console.log('\n$ ' + cmd);
  const r = spawnSync(cmd, { shell: true, stdio: 'inherit' });
  if (r.error) {
    console.error('Failed to run:', cmd, r.error);
    process.exit(1);
  }
  if (typeof r.status === 'number' && r.status !== 0) {
    console.error(`Command exited with code ${r.status}: ${cmd}`);
    process.exit(r.status || 1);
  }
}

function captureCommand(cmd: string): string {
  try {
    const out = spawnSync(cmd, { shell: true, encoding: 'utf8' });
    if (out.error) throw out.error;
    return out.stdout || '';
  } catch (e) {
    console.warn('Failed to capture output for', cmd, e instanceof Error ? e.message : String(e));
    return '';
  }
}

// 1) Remove existing skill documents (robust cleanup)
runCommand('node -r ts-node/register ./scripts/cleanup-skills-robust.ts');

// 2) Seed descriptors and skills
runCommand('npm run seed:all');

// 3) Run the test harness to exercise the fast-path
// We keep the output so the user can inspect it; its exit code determines success
console.log('\n-- Running test harness --');
const test = spawnSync('node -r ts-node/register ./scripts/test-skills.ts', { shell: true, stdio: 'inherit' });
const testSuccess = test.status === 0;

// 4) Capture skill/descriptor counts for a compact verification summary
const found = captureCommand('node -r ts-node/register ./scripts/find-skills-in-containers.ts');

// Extract counts for the knowledge container (fall back to any found values)
let skillsCount: number | null = null;
let descCount: number | null = null;
for (const line of found.split(/\r?\n/)) {
  const ks = line.match(/Container\s+(\S+)\s+=>\s+skill docs found:\s*(\d+)/i);
  if (ks) {
    const container = ks[1];
    const cnt = parseInt(ks[2], 10);
    if (container.toLowerCase() === 'knowledge') skillsCount = cnt;
  }
  const kd = line.match(/Container\s+(\S+)\s+=>\s+descriptor docs found:\s*(\d+)/i);
  if (kd) {
    const container = kd[1];
    const cnt = parseInt(kd[2], 10);
    if (container.toLowerCase() === 'knowledge') descCount = cnt;
  }
}

// Print compact summary
console.log('\n=== Verification summary ===');
console.log('Test harness status:', testSuccess ? 'PASS' : 'FAIL');
console.log('Knowledge container counts: skills =', skillsCount === null ? 'unknown' : skillsCount, ', descriptors =', descCount === null ? 'unknown' : descCount);
if (!testSuccess) process.exit(2);
console.log('Done.');
