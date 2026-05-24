/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {existsSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {rm} from 'node:fs/promises';
import {resolve} from 'node:path';

// In a monorepo, deps may be hoisted to root node_modules
function findNodeModules(): string {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (existsSync(resolve(dir, 'node_modules'))) {
      return resolve(dir, 'node_modules');
    }
    dir = resolve(dir, '..');
  }
  return resolve(process.cwd(), 'node_modules');
}

const nodeModulesDir = findNodeModules();

const filesToRemove = [
  'chrome-devtools-frontend/package.json',
  'chrome-devtools-frontend/front_end/models/trace/lantern/testing',
  'chrome-devtools-frontend/front_end/third_party/intl-messageformat/package/package.json',
];

function removeConflictingGlobalDeclaration(): void {
  const searchPaths = [
    resolve(nodeModulesDir, '@paulirish/trace_engine/models/trace/ModelImpl.d.ts'),
  ];
  // Bun stores deps in .bun cache with scoped names
  const bunDir = resolve(nodeModulesDir, '.bun');
  if (existsSync(bunDir)) {
    try {
      const entries = readdirSync(bunDir).filter(e => e.startsWith('@paulirish+trace_engine'));
      for (const entry of entries) {
        searchPaths.push(
          resolve(bunDir, entry, 'node_modules/@paulirish/trace_engine/models/trace/ModelImpl.d.ts'),
        );
      }
    } catch { /* ignore */ }
  }

  const filePath = searchPaths.find(p => existsSync(p));
  if (!filePath) {
    console.log('Skipping conflicting global declaration removal (file not found in monorepo layout).');
    return;
  }

  console.log('Removing conflicting global declaration from @paulirish/trace_engine...');
  const content = readFileSync(filePath, 'utf-8');
  const newContent = content.replace(
    /declare global\s*\{\s*interface HTMLElementEventMap\s*\{[^}]*\[ModelUpdateEvent\.eventName\]:\s*ModelUpdateEvent;\s*\}\s*\}/s,
    '',
  );
  writeFileSync(filePath, newContent, 'utf-8');
  console.log('Successfully removed conflicting global declaration.');
}

async function main() {
  console.log('Running prepare script to clean up chrome-devtools-frontend...');
  for (const file of filesToRemove) {
    const fullPath = resolve(nodeModulesDir, file);
    console.log(`Removing: ${file}`);
    try {
      await rm(fullPath, {recursive: true, force: true});
    } catch (error) {
      console.error(`Failed to remove ${file}:`, error);
      process.exit(1);
    }
  }
  console.log('Clean up of chrome-devtools-frontend complete.');

  removeConflictingGlobalDeclaration();
}

void main();
