import { writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const repoRoot = join(__dirname, '..');
const targetDir = join(repoRoot, '.pnpm-bin');
const targetBin = join(targetDir, 'pnpm');

mkdirSync(targetDir, { recursive: true });

// Create a simple wrapper that invokes corepack pnpm
writeFileSync(targetBin, `#!/bin/bash
exec corepack pnpm "$@"
`);

chmodSync(targetBin, 0o755);

console.log(`[ensure-pnpm] pnpm wrapper installed to ${targetBin}`);
