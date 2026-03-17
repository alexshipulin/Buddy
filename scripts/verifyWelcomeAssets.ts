/**
 * Verification: Welcome screen assets and require() usage.
 * Run: npx tsx scripts/verifyWelcomeAssets.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ASSETS_DIR = path.join(process.cwd(), 'assets', 'welcome');

const IMAGE_KEYS = [
  'sticker',
  'cameraWithFlash',
  'forkKnifePlate',
  'brain',
  'checkMark', // code key checkMarkButton -> file checkMark.png
  'directHit',
  'avocado',
  'burrito',
  'croissant',
  'stuffedFlatbread',
  'pizza',
  'spaghetti',
] as const;

const KEY_TO_FILE: Record<string, string> = {
  sticker: 'sticker',
  cameraWithFlash: 'cameraWithFlash',
  forkKnifePlate: 'forkKnifePlate',
  brain: 'brain',
  checkMarkButton: 'checkMark',
  checkMark: 'checkMark',
  directHit: 'directHit',
  avocado: 'avocado',
  burrito: 'burrito',
  croissant: 'croissant',
  stuffedFlatbread: 'stuffedFlatbread',
  pizza: 'pizza',
  spaghetti: 'spaghetti',
};

function main() {
  console.log('=== Welcome screen assets verification ===\n');

  const usedKeys = [
    'sticker',
    'cameraWithFlash',
    'forkKnifePlate',
    'brain',
    'checkMarkButton',
    'directHit',
    'avocado',
    'burrito',
    'croissant',
    'stuffedFlatbread',
    'pizza',
    'spaghetti',
  ];

  let allOk = true;
  console.log('1) File existence (name.png, name@2x.png, name@3x.png):');
  for (const key of usedKeys) {
    const baseName = KEY_TO_FILE[key] ?? key;
    const f1 = path.join(ASSETS_DIR, `${baseName}.png`);
    const f2 = path.join(ASSETS_DIR, `${baseName}@2x.png`);
    const f3 = path.join(ASSETS_DIR, `${baseName}@3x.png`);
    const has1 = fs.existsSync(f1);
    const has2 = fs.existsSync(f2);
    const has3 = fs.existsSync(f3);
    const ok = has1 && has2 && has3;
    if (!ok) allOk = false;
    console.log(`   ${baseName}: 1x=${has1 ? 'yes' : 'MISSING'} 2x=${has2 ? 'yes' : 'MISSING'} 3x=${has3 ? 'yes' : 'MISSING'} ${ok ? 'OK' : 'FAIL'}`);
  }

  console.log('\n2) require() uses only base name (name.png):');
  const welcomePath = path.join(process.cwd(), 'src', 'screens', 'WelcomeScreen.tsx');
  const code = fs.readFileSync(welcomePath, 'utf-8');
  const requireMatches = code.match(/require\(['"].*?welcome\/[^'"]+['"]\)/g) ?? [];
  const hasAt2x3xInRequire = requireMatches.some((m) => m.includes('@2x') || m.includes('@3x'));
  const requireBaseOnly = requireMatches.length > 0 && !hasAt2x3xInRequire;
  console.log(`   Base name only in require(): ${requireBaseOnly ? 'OK' : 'FAIL'} (${requireMatches.length} require(s))`);
  if (!requireBaseOnly) allOk = false;

  console.log('\n=== Result: ' + (allOk ? 'Pass' : 'Fail') + ' ===');
  if (!allOk) {
    console.log('Add missing @2x/@3x files to assets/welcome/ for crisp graphics.');
  }
  process.exit(allOk ? 0 : 1);
}

main();
