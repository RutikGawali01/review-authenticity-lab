/**
 * Scratch test script to verify complete dist/ build output and manifest alignment.
 */

import fs from 'fs';
import path from 'path';

function runBundlingVerification() {
  console.log('--- STARTING COMPLETE BUILD VERIFICATION TESTS ---');

  const rootDir = process.cwd();
  const distDir = path.join(rootDir, 'dist');
  const distManifestPath = path.join(distDir, 'manifest.json');
  const distPopupHtmlPath = path.join(distDir, 'ui', 'popup.html');
  const distSidepanelHtmlPath = path.join(distDir, 'ui', 'sidepanel.html');
  const bundledContentPath = path.join(distDir, 'content', 'content.js');
  const bundledBackgroundPath = path.join(distDir, 'background', 'background.js');

  // Test 1: Check dist/manifest.json contents & file existence
  console.log('1. Inspecting dist/manifest.json...');
  if (!fs.existsSync(distManifestPath)) {
    throw new Error(`dist/manifest.json missing at ${distManifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(distManifestPath, 'utf8'));

  const popupPath = manifest.action?.default_popup;
  console.log('   action.default_popup:', popupPath);
  if (popupPath !== 'ui/popup.html') {
    throw new Error(`dist/manifest.json default_popup expected 'ui/popup.html', got '${popupPath}'`);
  }

  const contentJs = manifest.content_scripts?.[0]?.js?.[0];
  console.log('   content_scripts[0].js:', contentJs);
  if (contentJs !== 'content/content.js') {
    throw new Error(`dist/manifest.json content script path expected 'content/content.js', got '${contentJs}'`);
  }

  const serviceWorker = manifest.background?.service_worker;
  console.log('   background.service_worker:', serviceWorker);
  if (serviceWorker !== 'background/background.js') {
    throw new Error(`dist/manifest.json service_worker path expected 'background/background.js', got '${serviceWorker}'`);
  }

  // Test 2: Check popup HTML exists at exact manifest path
  console.log('2. Inspecting dist/ui/popup.html...');
  if (!fs.existsSync(distPopupHtmlPath)) {
    throw new Error(`dist/ui/popup.html missing at ${distPopupHtmlPath}! Causes ERR_FILE_NOT_FOUND!`);
  }
  console.log('   ✓ dist/ui/popup.html exists and matches manifest action.default_popup.');

  // Test 3: Check sidepanel HTML exists
  console.log('3. Inspecting dist/ui/sidepanel.html...');
  if (!fs.existsSync(distSidepanelHtmlPath)) {
    throw new Error(`dist/ui/sidepanel.html missing at ${distSidepanelHtmlPath}!`);
  }
  console.log('   ✓ dist/ui/sidepanel.html exists.');

  // Test 4: Verify bundled content script has NO import / export statements
  console.log('4. Inspecting dist/content/content.js...');
  if (!fs.existsSync(bundledContentPath)) {
    throw new Error(`Bundled content script file missing at ${bundledContentPath}`);
  }
  const contentCode = fs.readFileSync(bundledContentPath, 'utf8');
  console.log(`   File size: ${contentCode.length} bytes.`);

  if (/^\s*import\s+/m.test(contentCode) || /^\s*export\s+/m.test(contentCode)) {
    throw new Error('Bundled content script contains top-level import/export statements!');
  }
  console.log('   ✓ Zero import/export statements found in bundled content script.');

  // Test 5: Verify bundled background service worker
  console.log('5. Inspecting dist/background/background.js...');
  if (!fs.existsSync(bundledBackgroundPath)) {
    throw new Error(`Bundled background script missing at ${bundledBackgroundPath}`);
  }
  const bgCode = fs.readFileSync(bundledBackgroundPath, 'utf8');
  console.log(`   File size: ${bgCode.length} bytes.`);
  console.log('   ✓ dist/background/background.js exists.');

  console.log('--- ALL BUILD VERIFICATION TESTS PASSED CLEANLY ---');
}

runBundlingVerification();
