#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const srcMain = path.join(repoRoot, 'src', 'main.tsx');
const rootMain = path.join(repoRoot, 'main.tsx');

if (fs.existsSync(srcMain)) {
  console.log('[ensure-vite-entry] src/main.tsx exists.');
  process.exit(0);
}

if (!fs.existsSync(rootMain)) {
  console.error('[ensure-vite-entry] Missing both src/main.tsx and main.tsx. Cannot continue.');
  process.exit(1);
}

fs.mkdirSync(path.dirname(srcMain), { recursive: true });
fs.copyFileSync(rootMain, srcMain);
console.log('[ensure-vite-entry] Restored src/main.tsx from main.tsx.');
