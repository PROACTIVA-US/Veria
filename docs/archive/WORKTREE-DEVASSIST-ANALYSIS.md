# Will /initproject Be Aware of Worktrees?

## Short Answer: NO ❌

The current `/initproject` command from Prjctzr will NOT automatically detect or configure for worktrees.

## What /initproject Actually Does:

When you run `/initproject` for Veria, it creates a basic setup:

```
/Projects/Veria/.devassist/
├── server.js           # Basic MCP server
├── package.json        # Dependencies
├── data/              # Data storage
├── knowledge/         # Knowledge base
├── sessions/          # Session logs
└── agents/            # Agent configs (empty)
```

The generated server only provides:
- `/start-veria` - Basic session start
- `/end-veria` - Basic session end
- `/status-veria` - Basic status check

## What It DOESN'T Do:

1. **No worktree detection** - Doesn't check for `.worktrees/`
2. **No worktree commands** - No `/veria-worktrees` command
3. **No agent orchestration** - No multi-agent setup
4. **No worktree-specific tools** - No branch management

## DevAssist's Current Capabilities:

Looking at the main DevAssist code (`/Custom_MCP/DevAssist_MCP/`):
- Has basic git awareness (status, commits)
- NO worktree functionality
- NO multi-workspace support
- Designed for single project directory

## Options for Veria with Worktrees:

### Option 1: Use Basic /initproject (Quick but Limited)
- Run `/initproject` as-is
- Get basic DevAssist functionality
- Manually navigate to worktrees when needed
- No integrated worktree management

### Option 2: Enhance After /initproject (Recommended)
1. Run `/initproject` first for basic setup
2. Then manually add worktree commands to the generated server.js:
   - Add `/veria-worktrees` command
   - Add worktree status checking
   - Add agent orchestration

### Option 3: Create Custom Veria Server (Most Complete)
- Skip `/initproject` entirely
- Create a fully custom server.js with:
  - Worktree awareness
  - Agent orchestration
  - Branch management
  - Inter-worktree communication

## Example Enhancement for Option 2:

After running `/initproject`, you could add to the generated server.js:

```javascript
// Add to tools array:
{
  name: 'veria-worktrees',
  description: 'Manage Veria git worktrees',
  inputSchema: { 
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['list', 'status', 'sync']
      }
    }
  }
},

// Add to switch statement:
case 'veria-worktrees':
  const action = args?.action || 'list';
  const worktreeResult = await execAsync('git worktree list', { cwd: PROJECT_PATH });
  return {
    content: [{
      type: 'text',
      text: `🌳 Veria Worktrees:\n${worktreeResult.stdout}`
    }]
  };
```

## Reality Check:

**DevAssist is NOT "smart enough" to automatically handle worktrees.** It's designed for standard single-directory projects. The worktree setup you have is more advanced than what DevAssist expects.

## Recommendation:

1. **Run `/initproject`** to get the basic structure
2. **Test the basic commands** to ensure they work
3. **Decide if you need worktree integration**:
   - If NO: Use as-is, manually navigate to worktrees
   - If YES: Enhance the generated server.js with worktree commands

The worktrees will still exist and work - you just won't have integrated DevAssist commands for managing them unless you add them manually.

---
*Analysis completed: September 6, 2025*
