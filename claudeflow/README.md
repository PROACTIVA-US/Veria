# ClaudeFlow Integration

This folder contains **flows** and **prompts** used to orchestrate research, drafting, verification, and packaging.
These integrate with the main ClaudeFlow platform at `/Users/danielconnolly/Projects/claudeflow/`.

## Example Commands

```bash
# List available flows
claudeflow list

# Run specific flows
claudeflow run flows/composer/01_bootstrap.yaml
claudeflow run flows/research/10_rwa_market_landscape.yaml
claudeflow run flows/bundling/90_build_artifact.yaml
```

## Quick AI Tasks

```bash
# Single-objective tasks with swarm mode
npx claude-flow@alpha swarm "implement the /decide endpoint"
npx claude-flow@alpha swarm "add Redis caching layer" --claude

# Complex projects with hive-mind
npx claude-flow@alpha hive-mind wizard
```

## Project Flows

- `flows/composer/` - Project bootstrapping and setup
- `flows/research/` - Market research and analysis
- `flows/bundling/` - Artifact building and packaging
- `prompts/` - Template prompts for each flow stage

## Features

- 🐝 Hive-mind swarm intelligence
- 🧠 27+ neural cognitive models
- 🔧 87 MCP tools for automation
- 💾 SQLite memory persistence in `.swarm/`
- 🔄 Dynamic agent architecture

Memory persists across sessions in `.swarm/memory.db`