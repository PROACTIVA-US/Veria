#!/usr/bin/env node

// Fixed DevAssist MCP Server Wrapper - No console.log to stdout!
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load project configuration
const configPath = path.join(__dirname, 'config.json');
let config;

if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  // DO NOT console.log - it breaks MCP protocol!
  // console.log(`Starting DevAssist for ${config.project} with warm-up enabled...`);
} else {
  config = {
    project: 'Veria',
    projectPath: '/Users/danielconnolly/Projects/Veria',
    dataPath: '/Users/danielconnolly/Projects/Veria/.devassist/data',
    warmup: { enabled: true }
  };
}

// Ensure data directory exists
if (!fs.existsSync(config.dataPath)) {
  fs.mkdirSync(config.dataPath, { recursive: true });
}

// Set environment variables - MUST use absolute paths!
process.env.DEVASSIST_PROJECT = config.project;
process.env.DEVASSIST_PROJECT_PATH = config.projectPath;
process.env.DEVASSIST_DATA_PATH = config.dataPath;
process.env.DEVASSIST_DOCUMENTATION = config.documentation?.sources || '';
process.env.DEVASSIST_WARMUP_ENABLED = String(config.warmup?.enabled || false);

// Launch main DevAssist MCP server
const devassistPath = '/Users/danielconnolly/Projects/Custom_MCP/DevAssist_MCP/index.js';

if (!fs.existsSync(devassistPath)) {
  // Write to stderr, not stdout!
  process.stderr.write('DevAssist MCP not found at: ' + devassistPath + '\n');
  process.exit(1);
}

const devassist = spawn('node', [devassistPath], {
  env: { ...process.env },
  stdio: 'inherit'
});

devassist.on('error', (err) => {
  process.stderr.write('Failed to start DevAssist: ' + err + '\n');
  process.exit(1);
});

devassist.on('exit', (code) => {
  process.exit(code || 0);
});
