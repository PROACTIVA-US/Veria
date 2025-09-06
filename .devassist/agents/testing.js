#!/usr/bin/env node

/**
 * Testing Agent for Veria
 * 
 */

const { execSync } = require('child_process');

console.log('🧪 Veria Testing Agent');

// Run tests based on project type
try {
  // Check for test runners
  if (require('fs').existsSync('package.json')) {
    const pkg = JSON.parse(require('fs').readFileSync('package.json', 'utf8'));
    
    if (pkg.scripts && pkg.scripts.test) {
      console.log('Running npm test...');
      execSync('npm test', { stdio: 'inherit' });
    }
  }
  
  if (require('fs').existsSync('pytest.ini')) {
    console.log('Running pytest...');
    execSync('pytest -v', { stdio: 'inherit' });
  }
  
} catch (error) {
  console.error('Test error:', error.message);
}

console.log('✅ Testing complete!');
