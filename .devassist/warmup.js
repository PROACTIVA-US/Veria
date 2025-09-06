#!/usr/bin/env node

/**
 * Veria DevAssist Warmup
 */

console.log('🔥 Veria DevAssist Warmup');
console.log('=====================================\n');

// Check git status
const { execSync } = require('child_process');
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  const changes = status.split('\n').filter(l => l.trim()).length;
  console.log(`📊 Git: ${changes} uncommitted changes`);
} catch {}

// Check project structure
const fs = require('fs');
const dirs = ['src', 'tests', 'docs'];
dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    const count = fs.readdirSync(dir).length;
    console.log(`📁 ${dir}/: ${count} items`);
  }
});

console.log('\n✨ Warmup Complete!');
