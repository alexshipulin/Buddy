#!/usr/bin/env node

const { execFileSync } = require('node:child_process');
const { rmSync } = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, '.tmp', 'day-budget-tests');
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
        'src/domain/dayBudget.test.ts',
      ],
      { cwd: repoRoot, stdio: 'inherit' }
    );

    const testModulePath = path.join(outDir, 'dayBudget.test.js');
    const { runDayBudgetTests } = require(testModulePath);
    if (typeof runDayBudgetTests !== 'function') {
      throw new Error('runDayBudgetTests export is missing');
    }

    runDayBudgetTests();
    console.log('[OK] dayBudget tests passed.');
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

run();
