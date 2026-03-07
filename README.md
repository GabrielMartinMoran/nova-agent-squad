# Neocortex Strike Team

A production-ready multi-agent system for OpenCode that eliminates hallucinations through strict role separation, explicit authorization gates, and formal specification workflows.

## Overview

Neocortex Strike Team (NST) is a four-agent architecture designed for reliable, auditable software development. It enforces planning-first behavior, requires explicit user authorization before any code modification, and validates implementation against formally specified Gherkin scenarios.

## Why Neocortex Strike Team?

AI coding assistants are powerful but prone to hallucinations, scope drift, and unauthorized modifications. NST addresses these issues through:

- **Zero Unauthorized Changes**: Default to planning mode; implementation only after explicit user approval
- **Role Separation**: Orchestrator (manager), Researcher (analyst), Developer (implementer), QA (validator)
- **Formal Specifications**: Gherkin scenarios with tags as the source of truth
- **Anti-Hallucination Guards**: Three-layer validation (Orchestrator assumptions, Developer pre-flight, QA verification)
- **Skill-Aware Workflow**: Automatically discovers and assigns relevant skills per task

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Neocortex Strike Team                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │          ORCHESTRATOR (Primary Agent)           │   │
│  │  - Manager + Tech Lead                         │   │
│  │  - Plans, delegates, validates assumptions     │   │
│  │  - NEVER writes code                           │   │
│  └───────────────┬─────────────────────────────────┘   │
│                  │                                         
│    ┌─────────────┼─────────────┐                           
│    ▼             ▼             ▼                           
│ ┌────────┐  ┌──────────┐  ┌─────────┐                     
│ │RESEARCH│  │DEVELOPER │  │   QA    │                     
│ │  ER   │  │          │  │         │                     
│ └────────┘  └──────────┘  └─────────┘                     
└─────────────────────────────────────────────────────────┘
```

### Agents

| Agent | Mode | Role |
|-------|------|------|
| `Neocortex Strike Team` | primary | Orchestrator - coordinates, challenges requests, delegates |
| `cst_researcher` | subagent | Maps codebase, checks feasibility, outputs Gherkin |
| `cst_developer` | subagent | TDD implementation from approved contract only |
| `cst_qa` | subagent | Validates against contract, Gherkin, and quality gates |

## Features

### 1. Planning-First Default

Every feature request starts in planning mode. The orchestrator will:
1. Clarify ambiguities
2. Discover available skills
3. Delegate to researcher for feasibility and specs
4. Present findings for approval
5. **Ask**: "Implementation plan is ready. Do you want me to apply it now?"
6. Only after explicit "yes" will it delegate to developer

### 2. Authorization Gates

- **Assumption Confirmation**: If the orchestrator infers any default, it must ask the user before proceeding
- **Apply Authorization**: Each feature/scope requires explicit approval; prior approvals do not auto-apply to new changes
- **Developer Pre-Flight**: Developer validates authorization metadata before editing any file
- **QA Verification**: QA confirms authorization was properly obtained

### 3. Tagged Gherkin Specifications

All specifications are written in Gherkin format with tags:

```gherkin
@critical @api
Feature: User Authentication
  Scenario: Successful login with valid credentials
    Given the user is on the login page
    When they enter valid username and password
    Then they should be redirected to the dashboard
```

### 4. Skill Discovery & Assignment

The orchestrator automatically:
1. Discovers installed skills (project-level + global)
2. Builds a Skill Assignment Contract
3. Passes required skills to each subagent
4. Blocks implementation if critical skills are missing

### 5. Memory Integration

NST supports persistent memory for decision tracking:
- **Engram** (preferred): https://github.com/gentleman-programming/engram
- **Mind** (fallback): https://github.com/GabrielMartinMoran/mind
- **Stateless**: Reports when no memory backend is available

## Quick Start

### Prerequisites

- [OpenCode](https://opencode.ai) installed
- Git configured

### Installation

```bash
# Clone this repository
git clone git@github.com:GabrielMartinMoran/neocortex-strike-team.git

# Install agents to your global OpenCode config
cd neocortex-strike-team
make install
```

### Manual Installation

If you prefer to install manually:

```bash
# Copy agents to your global OpenCode agents directory
cp -r .opencode/agents/* ~/.config/opencode/agents/

# Verify agents are detected
opencode --list-agents
```

### Configuration

The default agent is already set to `Neocortex Strike Team` in the included configuration. OpenCode will automatically use it as your primary agent.

To switch back to the default OpenCode agent:

Edit `~/.config/opencode/opencode.json` and remove or change the `default_agent` field.

## Usage

When you start OpenCode, you'll be working with the Neocortex Strike Team orchestrator. Just describe what you want to build:

1. **Describe your feature** - The orchestrator will analyze and ask clarifying questions
2. **Review the plan** - Researcher will produce Gherkin specs
3. **Approve or refine** - You can modify scope, add constraints, or request alternatives
4. **Authorize implementation** - When ready, say "yes" to apply
5. **QA validates** - After implementation, QA verifies against specs

### Example Workflow

```
You: I want to add user authentication to my API

Orchestrator: Let me clarify a few things:
- What authentication method? (JWT, session, OAuth?)
- Which API endpoints need protection?
- Do you have existing user models?

You: JWT tokens, /api/users and /api/orders, yes User model exists

[Orchestrator delegates to Researcher...]
[Researcher produces Gherkin specs...]
[Orchestrator presents plan...]

Orchestrator: Implementation plan is ready. Do you want me to apply it now?

You: Yes

[Orchestrator delegates to Developer...]
[Developer implements with TDD...]
[QA validates implementation...]
```

## Project Structure

```
neocortex-strike-team/
├── .opencode/
│   └── agents/
│       ├── Neocortex Strike Team.md   # Primary orchestrator
│       ├── cst_researcher.md          # Research/spec agent
│       ├── cst_developer.md            # Implementation agent
│       └── cst_qa.md                  # Validation agent
├── docs/
│   ├── architecture.md                # Detailed architecture docs
│   └── AGENTS.md                      # Agent versioning guide
├── Makefile                           # Installation commands
├── README.md                          # This file
├── LICENSE                           # MIT License
├── CONTRIBUTING.md                   # Contribution guidelines
└── CHANGELOG.md                      # Version history
```

## Documentation

- [Architecture Details](docs/architecture.md) - Deep dive into agent contracts, permissions, and workflows
- [Agent Versioning](docs/AGENTS.md) - How to maintain and version the agents

## Credits

Neocortex Strike Team uses [Mind](https://github.com/GabrielMartinMoran/mind) for persistent memory integration. Mind is a powerful memory system for developers and AI agents, providing structured storage, full-text search, and MCP integration.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

Built with OpenCode Agents. Eliminate hallucinations. Ship with confidence.
