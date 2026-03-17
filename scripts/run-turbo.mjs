import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { delimiter, dirname, join } from 'node:path';

import './ensure-pnpm.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');

const [task, ...extraArgs] = process.argv.slice(2);

if (!task) {
  console.error('[run-turbo] Missing task name');
  process.exit(1);
}

const pnpmBinDir = join(repoRoot, '.pnpm-bin');
const nodeBinDir = join(repoRoot, 'node_modules', '.bin');
const env = {
  ...process.env,
  PATH: [pnpmBinDir, nodeBinDir, process.env.PATH ?? ''].join(delimiter),
};

const isWindows = process.platform === 'win32';
const command = 'turbo';
const child = spawn(command, ['run', task, ...extraArgs], {
  cwd: repoRoot,
  env,
  stdio: 'inherit',
  shell: isWindows,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error('[run-turbo] Failed to start turbo', error);
  process.exit(1);
});
