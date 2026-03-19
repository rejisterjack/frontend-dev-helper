#!/usr/bin/env node
/**
 * Build and package FrontendDevHelper for Chrome Web Store and Firefox
 * Windows-compatible version
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

// Colors for terminal output
const colors = {
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
  nc: '\x1b[0m'
};

function log(message, color = 'nc') {
  console.log(`${colors[color]}${message}${colors.nc}`);
}

async function zipDirectory(source, out) {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const stream = fs.createWriteStream(out);

  return new Promise((resolve, reject) => {
    archive
      .directory(source, false)
      .on('error', err => reject(err))
      .pipe(stream);

    stream.on('close', () => resolve());
    archive.finalize();
  });
}

async function main() {
  log('🔧 FrontendDevHelper Release Builder', 'blue');
  log('========================================', 'blue');

  // Get version
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  const version = packageJson.version;
  log(`Version: ${version}`, 'blue');

  // Build
  log('\n📦 Building extension...', 'yellow');
  process.chdir(ROOT_DIR);
  execSync('npm run build', { stdio: 'inherit' });

  // Create releases directory
  const releasesDir = path.join(ROOT_DIR, 'releases');
  if (!fs.existsSync(releasesDir)) {
    fs.mkdirSync(releasesDir);
  }

  // Chrome Build
  log('\n🔵 Packaging for Chrome Web Store...', 'yellow');
  const chromeZip = path.join(releasesDir, `frontend-dev-helper-chrome-v${version}.zip`);
  await zipDirectory(path.join(ROOT_DIR, 'dist'), chromeZip);
  log(`✓ Chrome package created: ${chromeZip}`, 'green');

  // Firefox Build
  log('\n🟠 Packaging for Firefox...', 'yellow');
  const firefoxDir = path.join(ROOT_DIR, 'dist-firefox');
  
  // Copy dist to firefox dir
  if (fs.existsSync(firefoxDir)) {
    fs.rmSync(firefoxDir, { recursive: true });
  }
  fs.cpSync(path.join(ROOT_DIR, 'dist'), firefoxDir, { recursive: true });

  // Prepare Firefox manifest
  const manifestPath = path.join(firefoxDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  manifest.browser_specific_settings = {
    gecko: {
      id: 'frontenddevhelper@rejisterjack.github.io',
      strict_min_version: '109.0'
    }
  };
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const firefoxZip = path.join(releasesDir, `frontend-dev-helper-firefox-v${version}.zip`);
  await zipDirectory(firefoxDir, firefoxZip);
  fs.rmSync(firefoxDir, { recursive: true });
  log(`✓ Firefox package created: ${firefoxZip}`, 'green');

  // Summary
  log('\n========================================', 'green');
  log('✓ Build complete!', 'green');
  log('========================================', 'green');
  log('\nNext steps:', 'blue');
  log(`  1. Upload Chrome package to Chrome Web Store`, 'nc');
  log(`     → https://chrome.google.com/webstore/devconsole`, 'nc');
  log(`  2. Upload Firefox package to Firefox Add-ons`, 'nc');
  log(`     → https://addons.mozilla.org/en-US/developers/`, 'nc');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
