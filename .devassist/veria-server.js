#!/usr/bin/env node

/**
 * Veria DevAssist Server
 * This runs the MAIN DevAssist with Veria-specific environment
 */

// Set Veria-specific environment BEFORE importing DevAssist
process.env.DEVASSIST_PROJECT = 'Veria';
process.env.DEVASSIST_PROJECT_PATH = '/Users/danielconnolly/Projects/Veria';
process.env.DEVASSIST_DATA_PATH = '/Users/danielconnolly/Projects/Veria/.devassist/data';
process.env.DEVASSIST_WARMUP_ENABLED = 'true';
process.env.PROJECT_ROOT = '/Users/danielconnolly/Projects/Veria';

// Now import and run the main DevAssist
import('/Users/danielconnolly/Projects/Custom_MCP/DevAssist_MCP/index.js').catch(err => {
  console.error('Failed to start Veria DevAssist:', err);
  process.exit(1);
});
