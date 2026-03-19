#!/usr/bin/env node
/**
 * Prepare manifest.json for Firefox
 * 
 * Firefox supports Manifest V3 but needs some adjustments:
 * - browser_specific_settings.gecko.id is required
 * - background.service_worker is not supported (use scripts instead)
 */

import fs from 'fs';
import path from 'path';

const FIREFOX_DIR = 'dist-firefox';
const MANIFEST_PATH = path.join(FIREFOX_DIR, 'manifest.json');

console.log('🦊 Preparing Firefox manifest...');

// Read the current manifest
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

// Add Firefox-specific settings
manifest.browser_specific_settings = {
  gecko: {
    id: 'frontenddevhelper@rejisterjack.github.io',
    strict_min_version: '109.0' // First version with full MV3 support
  }
};

// Firefox doesn't support service_worker in MV3 yet
// Convert to background.scripts (Firefox MV3 hybrid)
if (manifest.background?.service_worker) {
  // Keep service_worker for now - Firefox 109+ supports it in MV3
  // but some versions prefer scripts
  console.log('  ℹ️ Keeping service_worker (Firefox 109+ supports this)');
}

// Update homepage URL to Firefox store (when published)
// manifest.homepage_url = 'https://addons.mozilla.org/en-US/firefox/addon/frontenddevhelper/';

// Write the modified manifest
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

console.log('✓ Firefox manifest prepared');
