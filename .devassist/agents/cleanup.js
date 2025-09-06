#!/usr/bin/env node

/**
 * Cleanup Agent for Veria Project
 * Runs at session end to organize and clean up the project
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
const projectPath = '/Users/danielconnolly/Projects/Veria';

console.log('🧹 Running Veria Cleanup Agent...');

async function cleanup() {
  const actions = [];
  
  // 1. Remove Python cache files
  try {
    await execAsync('find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null', { cwd: projectPath });
    actions.push('✓ Removed Python cache files');
  } catch {}
  
  // 2. Remove .pyc files
  try {
    await execAsync('find . -name "*.pyc" -delete 2>/dev/null', { cwd: projectPath });
    actions.push('✓ Removed .pyc files');
  } catch {}
  
  // 3. Clean test coverage reports
  try {
    await execAsync('rm -rf htmlcov .coverage 2>/dev/null', { cwd: projectPath });
    actions.push('✓ Cleaned coverage reports');
  } catch {}
  
  // 4. Organize root directory
  const rootFiles = await fs.readdir(projectPath);
  let movedCount = 0;
  
  for (const file of rootFiles) {
    if (file.endsWith('.py') && !file.startsWith('setup') && !file.startsWith('manage')) {
      // Move stray Python files to src
      const srcDir = path.join(projectPath, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      try {
        await fs.rename(
          path.join(projectPath, file),
          path.join(srcDir, file)
        );
        movedCount++;
      } catch {}
    }
  }
  
  if (movedCount > 0) {
    actions.push(`✓ Moved ${movedCount} files to proper directories`);
  }
  
  // 5. Archive old logs
  const logsPath = path.join(projectPath, '.devassist/terminal_logs');
  try {
    const logs = await fs.readdir(logsPath);
    const oldLogs = logs.filter(f => {
      const stat = fs.stat(path.join(logsPath, f));
      return Date.now() - stat.mtime > 7 * 24 * 60 * 60 * 1000; // 7 days
    });
    
    if (oldLogs.length > 0) {
      const archivePath = path.join(logsPath, 'archive');
      await fs.mkdir(archivePath, { recursive: true });
      
      for (const log of oldLogs) {
        await fs.rename(
          path.join(logsPath, log),
          path.join(archivePath, log)
        );
      }
      actions.push(`✓ Archived ${oldLogs.length} old log files`);
    }
  } catch {}
  
  // 6. Update git ignore
  const gitignoreContent = `
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
.venv
.coverage
htmlcov/
.pytest_cache/

# DevAssist
.devassist/terminal_logs/
.devassist/data/
.devassist/sessions/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Project specific
*.log
*.db
.env.local
`;
  
  try {
    await fs.writeFile(path.join(projectPath, '.gitignore'), gitignoreContent);
    actions.push('✓ Updated .gitignore');
  } catch {}
  
  // Report results
  console.log('\n📊 Cleanup Summary:');
  actions.forEach(action => console.log(`  ${action}`));
  console.log(`\n✨ Veria project cleaned and organized!`);
}

cleanup().catch(console.error);