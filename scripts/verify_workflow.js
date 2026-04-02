#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const script = path.resolve(__dirname, 'lead_workflow_cli.js');
const result = spawnSync(process.execPath, [
  script,
  'fixtures/verification-cases.json',
  '--existing',
  'fixtures/mock-existing-leads.json',
  '--output',
  'artifacts/verification-report.json',
  '--summary'
], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit'
});

process.exit(result.status ?? 1);
