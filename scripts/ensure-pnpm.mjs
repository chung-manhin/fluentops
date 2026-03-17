import { writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const repoRoot = join(__dirname, '..');
const targetDir = join(repoRoot, '.pnpm-bin');
const unixBin = join(targetDir, 'pnpm');
const windowsBin = join(targetDir, 'pnpm.cmd');
const powershellBin = join(targetDir, 'pnpm.ps1');

mkdirSync(targetDir, { recursive: true });

// Create simple wrappers that invoke corepack pnpm on each platform.
writeFileSync(unixBin, `#!/bin/sh
exec corepack pnpm "$@"
`);
writeFileSync(windowsBin, `@echo off\r
corepack pnpm %*\r
`);
writeFileSync(
  powershellBin,
  `#!/usr/bin/env pwsh
corepack pnpm $args
`,
);

chmodSync(unixBin, 0o755);
chmodSync(powershellBin, 0o755);

console.log(`[ensure-pnpm] pnpm wrappers installed to ${targetDir}`);
