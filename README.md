# ☄️ Nova Agent Squad (NAS) 🚀

A production-ready, multi-platform multi-agent system that reduces hallucinations through strict role separation, explicit authorization gates, and a contract-driven, SDD-inspired workflow.

## Overview

Nova Agent Squad (NAS) is a four-agent architecture for reliable, auditable software delivery. It enforces planning-first behavior, requires explicit user authorization before any file modification, and validates implementation against approved contracts and tagged Gherkin scenarios.

## Why Nova Agent Squad?

AI coding assistants are powerful but prone to hallucinations, scope drift, and unauthorized modifications. NAS addresses these issues through:

- **Zero Unauthorized Changes**: Default to planning mode; implementation only after explicit user approval
- **Role Separation**: Orchestrator (manager), Researcher (analyst), Developer (implementer), QA (validator)
- **Formal Specifications**: Gherkin scenarios with tags as the source of truth
- **Anti-Hallucination Guards**: Three-layer validation (Orchestrator assumptions, Developer pre-flight, QA verification)
- **Skill-Aware Workflow**: Automatically discovers and assigns relevant skills per task

## Architecture

```mermaid
flowchart TD
    U[User] --> O[Orchestrator\nNova Agent Squad]

    O -->|Scope + constraints| R[nas_researcher]
    O -->|Approved apply contract + required skills| D[nas_developer]
    O -->|Verification request + acceptance contract| Q[nas_qa]

    R -->|Feasibility analysis + tagged Gherkin| O
    D -->|TDD implementation report + checks| O
    Q -->|Contract/Gherkin/quality-gates verdict| O

    O -->|Clarifications, decisions, approvals| U
```

### Coordination policy

- Subagents are coordinated by the orchestrator.
- Scope/contract decisions and conflicts are escalated back to the orchestrator.
- The architecture does **not** assume guaranteed direct subagent-to-subagent interaction; orchestrator mediation is the default coordination path.

### Agents

| Agent | Mode | Role |
|-------|------|------|
| `Nova Agent Squad` | primary | Orchestrator: discovers installed skills, assigns required skills to subagents, coordinates workflow, escalates decisions, never performs implementation edits |
| `nas_researcher` | subagent | Research: evaluates feasibility, maps impacted areas, and produces tagged Gherkin scenarios/acceptance contracts |
| `nas_developer` | subagent | Developer: executes TDD (Red→Green→Refactor) and implements only within explicitly approved apply contract scope |
| `nas_qa` | subagent | QA: verifies implementation against approved contract + tagged Gherkin + quality gates (tests/lint/checks) |

## Features

### Operational Handoff Policy

NAS subagents `nas_researcher`, `nas_developer`, and `nas_qa` use condition-based handoff triggers.
Handoff is used when there is **blocked, risk, or insufficient progress**.

When a handoff is required, agents provide a structured **handoff** block compatible with existing XML contracts, including:
- `current_progress`
- `remaining_work`
- `risks`
- `recommendation: [CONTINUE | DO_NOT_CONTINUE]`
- `question_for_user` (when blocked/missing info)

### 1. Planning-First Default

Every feature request starts in planning mode. The orchestrator will:
1. Clarify ambiguities
2. Discover available skills
3. Delegate to researcher for feasibility and specs
4. Present findings for approval
5. **Ask**: "Implementation plan is ready. Do you want me to apply it now?"
6. Only after explicit "yes" will it delegate to developer

Planning uses a hybrid confirmation policy: confirm only scope changes or critical assumptions, and do not request confirmation for minor analysis/spec steps.

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
3. Assigns and passes required skills to each subagent
4. Blocks implementation if critical skills are missing

### 5. Memory Integration

NAS supports persistent memory for decision tracking:
- **Mind** (MCP): https://github.com/GabrielMartinMoran/mind
- **Stateless**: Reports when no memory backend is available

## Quick Start

### Prerequisites

- Git configured
- One supported runtime from the platform matrix (OpenCode recommended)

### Installation

```bash
# Clone this repository
git clone git@github.com:GabrielMartinMoran/nova-agent-squad.git

# Install agents to your global OpenCode config (canonical target)
cd nova-agent-squad
make install TARGET=opencode
```

### Centralized source/build/install

NAS now uses a **single source-of-truth** and generates platform artifacts from it:

- Canonical source: `src/agents/`
- Platform templates: `src/templates/platforms/`
- Target map + destinations: `config/platforms.manifest`
- Generated outputs: `dist/platforms/<target>/...`

Build all targets:

```bash
make build TARGET=all
```

Install one target (build + install):

```bash
# Canonical OpenCode install path (~/.config/opencode/agents)
make install TARGET=opencode

# Safe dry-run with custom destination root
make install TARGET=cursor DRY_RUN=1 DESTDIR=/tmp/nas-install
```

### Multi-platform installation (generated templates)

NAS keeps **OpenCode** as the primary GA runtime and ships distribution templates for other approved targets:

- OpenCode
- Cursor
- Cursor CLI Agent
- Claude Code
- Codex
- Gemini CLI
- Kiro
- VS Code

See the full matrix (status, limitations, and template paths) in [docs/installation-matrix.md](docs/installation-matrix.md).

Legacy per-platform source artifacts were removed to avoid double source. Use generated outputs in `dist/platforms/`.

- Gemini CLI remains **Experimental** and requires `experimental.enableAgents=true`.
- Kiro CLI supports subagents with runtime subagent tool limitations.

You can list available distribution templates with:

```bash
make list-platform-templates
```

### Manual Installation

If you prefer to install manually:

```bash
# Build and copy generated OpenCode artifacts manually
make build TARGET=opencode
cp -r dist/platforms/opencode/agents/* ~/.config/opencode/agents/

# Verify agents are detected
opencode --list-agents
```

### Configuration

The default agent can be set to `Nova Agent Squad` in your selected runtime configuration.
OpenCode remains the primary GA example, but the same orchestration flow applies to other supported platforms in the installation matrix.

To switch back to your platform default agent:

For OpenCode, edit `~/.config/opencode/opencode.json` and remove or change the `default_agent` field.

## Usage

When you start NAS on your selected platform runtime, you'll be working with the Nova Agent Squad orchestrator. Just describe what you want to build:

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
nova-agent-squad/
├── src/
│   ├── agents/                        # Canonical NAS source-of-truth
│   └── templates/
│       └── platforms/                 # Per-target templates
├── config/
│   └── platforms.manifest             # Target kind/source/dist/install mapping
├── scripts/
│   ├── build.sh                       # dist artifact generation by target
│   └── install.sh                     # target install with dry-run support
├── dist/
│   └── platforms/                     # Generated artifacts (not primary source)
├── .opencode/
│   └── agents/                        # Synced OpenCode runtime copy
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

Nova Agent Squad uses [Mind](https://github.com/GabrielMartinMoran/mind) for persistent memory integration. Mind is a powerful memory system for developers and AI agents, providing structured storage, full-text search, and MCP integration.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

Built with a contract-driven, SDD-inspired multi-agent workflow. Eliminate hallucinations. Ship with confidence.
