#!/usr/bin/env node

const { execFileSync } = require('node:child_process');
const { rmSync } = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, '.tmp', 'recommendation-ranking-tests');
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
        'src/domain/recommendationRanking.test.ts',
      ],
      { cwd: repoRoot, stdio: 'inherit' }
    );

    const testModulePath = path.join(outDir, 'recommendationRanking.test.js');
    const { runRecommendationRankingTests } = require(testModulePath);
    if (typeof runRecommendationRankingTests !== 'function') {
      throw new Error('runRecommendationRankingTests export is missing');
    }

    runRecommendationRankingTests();
    console.log('[OK] recommendationRanking tests passed.');
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

run();
