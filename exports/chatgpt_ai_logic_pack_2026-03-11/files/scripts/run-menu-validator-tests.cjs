#!/usr/bin/env node

const { execFileSync } = require('node:child_process');
const { rmSync } = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, '.tmp', 'menu-validator-tests');
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
        'src/validation/menuAnalysisValidator.test.ts',
      ],
      { cwd: repoRoot, stdio: 'inherit' }
    );

    const testModulePath = path.join(outDir, 'validation', 'menuAnalysisValidator.test.js');
    const { runMenuAnalysisValidatorTests } = require(testModulePath);
    if (typeof runMenuAnalysisValidatorTests !== 'function') {
      throw new Error('runMenuAnalysisValidatorTests export is missing');
    }

    runMenuAnalysisValidatorTests();
    console.log('[OK] menuAnalysisValidator tests passed.');
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

run();
