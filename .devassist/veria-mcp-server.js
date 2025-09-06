#!/usr/bin/env node

/**
 * Veria-Specific DevAssist MCP Server Wrapper
 * This starts the FULL DevAssist with Veria context
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up Veria-specific environment variables
const env = {
  ...process.env,
  DEVASSIST_PROJECT: 'Veria',
  DEVASSIST_PROJECT_PATH: '/Users/danielconnolly/Projects/Veria',
  DEVASSIST_DATA_PATH: `${__dirname}/data`,
  DEVASSIST_WARMUP_ENABLED: 'true'
};

// Path to main DevAssist
const devassistPath = '/Users/danielconnolly/Projects/Custom_MCP/DevAssist_MCP/index.js';

// Start the main DevAssist server with Veria context
const devassist = spawn('node', [devassistPath], {
  env: env,
  stdio: 'inherit'  // Pass through all stdio to allow MCP communication
});

// Handle errors
devassist.on('error', (err) => {
  console.error('Failed to start Veria DevAssist:', err);
  process.exit(1);
});

// Pass through exit codes
devassist.on('exit', (code) => {
  process.exit(code || 0);
});

// Log startup
console.error('🚀 Starting Veria DevAssist MCP Server...');
console.error(`📁 Project: Veria`);
console.error(`📂 Path: /Users/danielconnolly/Projects/Veria`);
