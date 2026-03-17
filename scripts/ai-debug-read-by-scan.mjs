#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const analysisIdRaw = process.argv[2] ?? '';
const analysisId = Number(analysisIdRaw);
if (!Number.isFinite(analysisId) || analysisId <= 0) {
  console.error('Usage: node scripts/ai-debug-read-by-scan.mjs <analysisId>');
  process.exit(1);
}

const sinkRoot = path.resolve(
  process.env.AI_DEBUG_SINK_DIR ?? path.join(repoRoot, '.tmp', 'ai_debug_local_sink')
);
const filePath = path.join(sinkRoot, 'analyses', `${Math.floor(analysisId)}.jsonl`);

function formatEntry(entry) {
  const parts = [
    entry.createdAt ?? '-',
    String(entry.level ?? 'info').toUpperCase(),
    entry.task ?? '-',
    entry.stage ?? '-',
    entry.message ?? '',
  ];
  const lines = [parts.join(' | ')];
  lines.push(
    `meta: analysisId=${entry.analysisId ?? '-'} session=${entry.sessionId ?? '-'} model=${entry.model ?? '-'} status=${entry.status ?? '-'} durationMs=${entry.durationMs ?? '-'}`
  );
  if (entry.details && typeof entry.details === 'object') {
    lines.push(`details: ${JSON.stringify(entry.details)}`);
  }
  lines.push('');
  return lines.join('\n');
}

try {
  const raw = await fs.readFile(filePath, 'utf8');
  const entries = raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  console.log(`Buddy AI local sink report | analysisId=${Math.floor(analysisId)}`);
  console.log(`File: ${filePath}`);
  console.log(`Entries: ${entries.length}`);
  console.log('');
  for (const entry of entries) {
    console.log(formatEntry(entry));
  }
} catch {
  console.error(`No log file found for analysisId=${Math.floor(analysisId)} at ${filePath}`);
  process.exit(2);
}

