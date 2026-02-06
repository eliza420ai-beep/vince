#!/usr/bin/env node
/**
 * Simple build for api-client: tsc emit to dist
 */
import { execSync } from 'child_process';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = __dirname;

if (!existsSync(root + '/dist')) mkdirSync(root + '/dist', { recursive: true });

execSync('npx tsc -p .', {
  cwd: root,
  stdio: 'inherit',
});
