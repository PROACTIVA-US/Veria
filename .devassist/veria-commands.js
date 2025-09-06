#!/usr/bin/env node

/**
 * Project-Specific Claude Code Commands for Veria
 * These augment DevAssist with Veria-specific slash commands
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class VeriaCommands {
  constructor() {
    this.projectPath = '/Users/danielconnolly/Projects/Veria';
  }

  /**
   * /veria-start - Start Veria session with warmup
   */
  async veriaStart() {
    console.log('🔥 Starting Veria Development Session...');
    console.log('Running warmup sequence...');
    
    // Trigger warmup
    await this.runWarmup();
    
    // Run DevAssist start_session
    return {
      action: 'delegate',
      tool: 'start_session',
      args: {
        description: 'Veria blockchain integration development'
      }
    };
  }

  /**
   * /veria-end - End Veria session with cleanup
   */
  async veriaEnd() {
    console.log('🏁 Ending Veria Session...');
    
    // Run cleanup agent
    await this.runCleanup();
    
    // Delegate to DevAssist end_session
    return {
      action: 'delegate',
      tool: 'end_session'
    };
  }

  /**
   * /veria-sprint - Check sprint status
   */
  async veriaSprint() {
    const sprintFile = path.join(this.projectPath, 'SPRINT_BLOCKCHAIN_INTEGRATION.md');
    const content = await fs.readFile(sprintFile, 'utf8');
    
    // Parse sprint status
    const lines = content.split('\n');
    const completed = lines.filter(l => l.includes('✅')).length;
    const total = lines.filter(l => l.match(/^\d+\./)).length;
    
    return {
      content: [{
        type: 'text',
        text: `📊 Veria Sprint Status:
- Progress: ${completed}/${total} tasks completed (${Math.round(completed/total * 100)}%)
- Current Phase: Blockchain Integration
- Next Task: ${this.getNextTask(lines)}

Use /veria-task to work on the next task.`
      }]
    };
  }

  /**
   * /veria-agents - Run Veria subagents
   */
  async veriaAgents(type = 'all') {
    const agents = {
      cleanup: '🧹 Cleanup Agent',
      testing: '🧪 Testing Agent',
      blockchain: '⛓️ Blockchain Agent',
      compliance: '📋 Compliance Agent'
    };
    
    if (type === 'all') {
      for (const [key, name] of Object.entries(agents)) {
        console.log(`Running ${name}...`);
        await this.runAgent(key);
      }
    } else if (agents[type]) {
      console.log(`Running ${agents[type]}...`);
      await this.runAgent(type);
    }
    
    return {
      content: [{
        type: 'text',
        text: `✅ Agent execution complete: ${type}`
      }]
    };
  }

  // Helper methods
  async runWarmup() {
    try {
      await execAsync('node .devassist/warmup.js', { cwd: this.projectPath });
    } catch (e) {
      console.error('Warmup error:', e.message);
    }
  }

  async runCleanup() {
    try {
      await execAsync('node .devassist/agents/cleanup.js', { cwd: this.projectPath });
    } catch (e) {
      console.error('Cleanup error:', e.message);
    }
  }

  async runAgent(type) {
    const agentPath = path.join(this.projectPath, `.devassist/agents/${type}.js`);
    try {
      await execAsync(`node "${agentPath}"`, { cwd: this.projectPath });
    } catch (e) {
      console.error(`Agent ${type} error:`, e.message);
    }
  }

  getNextTask(lines) {
    for (const line of lines) {
      if (line.match(/^\d+\./) && !line.includes('✅')) {
        return line.trim();
      }
    }
    return 'All tasks completed!';
  }
}

export default VeriaCommands;