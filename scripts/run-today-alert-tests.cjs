#!/usr/bin/env node

const { execFileSync } = require('node:child_process');
const { rmSync } = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, '.tmp', 'today-alert-tests');
const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run() {
  rmSync(outDir, { recursive: true, force: true });

  try {
    execFileSync(
      npxBin,
      [
        'tsc',
        '--module',
        'commonjs',
        '--target',
        'es2020',
        '--outDir',
        outDir,
        '--pretty',
        'false',
        'src/domain/todayAlert.test.ts',
      ],
      { cwd: repoRoot, stdio: 'inherit' }
    );

    const testModulePath = path.join(outDir, 'todayAlert.test.js');
    const { runTodayAlertTests } = require(testModulePath);
    if (typeof runTodayAlertTests !== 'function') {
      throw new Error('runTodayAlertTests export is missing');
    }

    runTodayAlertTests();
    console.log('[OK] today alert tests passed.');
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

run();
