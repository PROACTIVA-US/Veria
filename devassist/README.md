# DevAssist Integration

This folder contains **flows** and **prompts** used to orchestrate research, drafting, verification, and packaging.
These integrate with the main DevAssist platform at `/Users/danielconnolly/Projects/Custom_MCP/DevAssist_MCP/`.

## Example Commands

```bash
# List available flows
devassist list

# Run specific flows
devassist run flows/composer/01_bootstrap.yaml
devassist run flows/research/10_rwa_market_landscape.yaml
devassist run flows/bundling/90_build_artifact.yaml
```

## Quick AI Tasks

```bash
# Single-objective tasks with swarm mode
npx devassist swarm "implement the /decide endpoint"
npx devassist swarm "add Redis caching layer" --claude

# Complex projects with hive-mind
npx devassist hive-mind wizard
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