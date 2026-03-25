# Nova Agent Squad Architecture

This document provides a detailed technical overview of the Nova Agent Squad architecture, including agent roles, communication protocols, permissions, and the anti-hallucination system.

## System Overview

Nova Agent Squad (NAS) is a five-agent system built on OpenCode's agent framework. Each agent has a specific role, strict permissions, and communicates through structured XML contracts.

```
┌────────────────────────────────────────────────────────────────┐
│                           USER                                 │
│                             │                                  │
│                             V                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          Nova Agent Squad (Orchestrator)                 │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ • Plans and coordinates                            │  │  │ 
│  │  │ • Challenges weak requests                         │  │  │ 
│  │  │ • Manages authorization gates                      │  │  │ 
│  │  │ • Delegates to subagents                           │  │  │
│  │  │ • NEVER edits code                                 │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                             │                                  │
│        ┌──────────────┬─────┴────────┬──────────────┐          │
│        V              V              V              V          │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐    │
│   │   nas_   │   │   nas_   │   │   nas_   │   │   nas_   │    │
│   │researcher│   │ planner  │   │developer │   │    qa    │    │
│   └──────────┘   └──────────┘   └──────────┘   └──────────┘    │
└────────────────────────────────────────────────────────────────┘
```

## Agent Roles

### 1. Nova Agent Squad (Orchestrator)

**Mode**: Primary  
**Permissions**: No edit, no bash, task delegation only

The orchestrator acts as Manager and Tech Lead. It is the only agent that interacts directly with the user.

**Responsibilities**:
- Receive and clarify requirements
- Build the Agreement Contract (scope, constraints, assumptions)
- Discover and assign skills
- Delegate to Researcher for feasibility analysis
- Present findings and request user authorization
- Delegate to Developer for implementation
- Delegate to QA for validation
- Handle blockers and escalation

**Key Rules**:
- Never write code
- Never edit files
- In planning, confirm only scope changes or critical assumptions
- Do not request confirmation for minor analysis/spec steps
- Request explicit apply authorization before delegation

### 2. nas_researcher

**Mode**: Subagent (hidden)
**Permissions**: Read, search, webfetch, websearch; no edit, no bash

**Operational handoff policy**:
- Handoff is condition-based: **blocked, risk, or insufficient progress**.

The researcher exhaustively investigates the codebase and external sources. It does NOT produce Gherkin scenarios — that is the planner's job.

**Responsibilities**:
- Map codebase and identify impacted areas
- Research external documentation, library APIs, and best practices
- Exhaust all available information sources (websearch, webfetch, MCPs)
- Validate skill requirements
- Report feasibility and risks
- Produce comprehensive research reports for the planner

**Output Format**:
```xml
<research_report>
<feasibility>(Summary)</feasibility>
<codebase_findings>(Files, patterns, conventions found)</codebase_findings>
<external_findings>(Documentation, APIs, best practices found)</external_findings>
<impacted_areas>(Files and modules affected)</impacted_areas>
<dependencies>(Internal and external dependencies)</dependencies>
<risks>(Risk descriptions with severity)</risks>
<existing_tests>(Test patterns and coverage gaps)</existing_tests>
<assumptions>(What was inferred)</assumptions>
<sources_consulted>(All sources investigated)</sources_consulted>
</research_report>
```

### 3. nas_planner

**Mode**: Subagent (hidden)
**Permissions**: Read, search, write (Gherkin only), webfetch, websearch; no edit, no bash

**Operational handoff policy**:
- Handoff is condition-based: **blocked, risk, or insufficient progress**.

The planner designs the implementation strategy using SDD methodology. It receives the researcher's report and produces tagged Gherkin scenarios, technical design, and implementation tasks. It persists Gherkin feature files when enabled.

**Responsibilities**:
- Analyze the research report and validate findings
- Consult external documentation for design decisions (library APIs, best practices)
- Design the implementation strategy and architecture decisions
- Produce tagged Gherkin scenarios as acceptance contracts
- Persist Gherkin feature files to `gherkin.storage_path` (when `gherkin.enabled`)
- Define ordered implementation tasks for the developer
- Update the plan and Gherkin files when re-delegated with user feedback

**Output Format**:
```xml
<planning_output>
<feasibility>(Verdict based on research + own analysis)</feasibility>
<approach>(Technical strategy and architecture decisions)</approach>
<external_docs_consulted>(URLs and what was learned)</external_docs_consulted>
<gherkin>
@tag1 @tag2
Feature: [Name]
  Scenario: [Scenario 1]
    Given [Context]
    When [Action]
    Then [Expected result]
</gherkin>
<implementation_tasks>(Ordered steps for the developer)</implementation_tasks>
<risks>(Risk descriptions and mitigations)</risks>
<assumptions>(What was inferred)</assumptions>
</planning_output>
```

### 4. nas_developer

**Mode**: Subagent (hidden)  
**Permissions**: Full edit, bash, webfetch

**Operational handoff policy**:
- Handoff is condition-based: **blocked, risk, or insufficient progress**.

The developer implements features using strict TDD methodology.

**Responsibilities**:
- Validate authorization metadata
- Write failing tests (RED)
- Implement minimum code to pass (GREEN)
- Refactor for clarity
- Run linters and formatters
- Execute integration tests
- Provide handoff to QA

**Pre-Flight Checks**:
```yaml
apply_approved: true
approval_scope: [feature identifier]
approved_by_user: [explicit confirmation]
```

**TDD Cycle**:
```xml
<tdd_cycle>
Phase: [Red|Green|Refactor|Linting|Integration]
Action: [File changed or command executed]
</tdd_cycle>
```

### 5. nas_qa

**Mode**: Subagent (hidden)  
**Permissions**: Read, bash; no edit

**Operational handoff policy**:
- Handoff is condition-based: **blocked, risk, or insufficient progress**.

The QA agent validates implementation against specifications.

**Responsibilities**:
- Execute test suites
- Verify Gherkin alignment
- Check for code quality issues
- Detect scope drift
- Validate authorization
- Report with structured status

**Status Values** (English):
- `APPROVED`: Implementation matches contract and passes all checks
- `REJECTED`: Issues found, fix required
- `BLOCKED`: Missing or contradictory requirements

**Output Format**:
```xml
<qa_status>
Status: [APPROVED|REJECTED|BLOCKED]
</qa_status>
<validation_details>
(List of checks performed and evidence)
</validation_details>
<required_action>
(If REJECTED: fix instructions.
 If BLOCKED: question for Orchestrator)
</required_action>
```

## Project Configuration

NAS requires a mandatory project config file at `.agents/nas.config.yaml`. This file configures memory, mind spaces, Gherkin persistence, and modification policies.

### Config Schema

```yaml
version: "1.1"  # Required: config schema version

memory:
  enabled: true  # Enable/disable enhanced memory
  provider: mind  # mind | openspec | engram | claude-mem | stateless

mind_spaces:
  project_space:
    enabled: true
    name: "projects/<repo-name>"
    description: "Project context, decisions, and session checkpoints"

gherkin:
  enabled: true
  storage_path: "specs/features"
  include:
    - "product/*"
    - "application/*"
  exclude:
    - "researcher/*"
    - "sandbox/*"

config_policy:
  require_confirmation: true
```

### First-Run Enforcement

First run = whenever NAS runs and `.agents/nas.config.yaml` is missing.

**On startup, the orchestrator MUST:**
1. Check for config existence
2. If missing: halt workflow, ask user for authorization to create
3. On authorization: delegate config creation to `nas_developer` (orchestrator has no write tools)
4. If not authorized: refuse to proceed

### Config Modification Policy

- Any config change requires explicit user confirmation
- Changes are delegated to `nas_developer` (not written by orchestrator)
- Config modifications are auditable via git history

### Runtime Config Propagation

The orchestrator passes enabled config sections to subagents:
- Only include blocks where `enabled: true`
- Exception: when task is specifically to edit config, pass full config
- Subagents use `mind_spaces` config for memory integration

## Authorization System

### The Three-Layer Guard

```
Layer 1: Orchestrator Gate
    │
    ▼
"Implementation plan is ready. Do you want me to apply it now?"
    │
    ▼
Layer 2: Developer Pre-Flight
    │
    ├── apply_approved: true?
    ├── approval_scope matches?
    └── approved_by_user confirmed?
    │
    ▼
Layer 3: QA Verification
    │
    ├── Tests pass?
    ├── Contract met?
    └── Authorization valid?
```

### Authorization Metadata

When the orchestrator delegates to developer, it must include:

```yaml
apply_authorization:
  approved: true
  approval_scope: "user-authentication-feature"
  approved_by_user: "yes apply it"
  timestamp: "2025-03-07T10:30:00Z"
```

### Scope Rules

- Authorization is **single-use per scope**
- After one feature is applied, new features require new authorization
- Prior approvals do NOT auto-apply to subsequent changes
- Each change scope is explicitly named in the authorization

## Structured handoff extension (compatible)

To preserve compatibility, existing XML contracts stay intact and agents may append a structured handoff block when blocked, risk, or insufficient progress is present:

```xml
<operational_handoff>
current_progress: [...]
remaining_work: [...]
risks: [...]
recommendation: [CONTINUE | DO_NOT_CONTINUE]
question_for_user: [... or "N/A"]
</operational_handoff>
```

## Skill System

### Discovery

The orchestrator discovers skills from:
1. **Project-level**: `./.opencode/skills/`
2. **Global-level**: `~/.config/opencode/skills/`

### Assignment Contract

```yaml
skill_assignment:
  available_skills:
    - tdd
    - react
    - typescript
  required_by_role:
    researcher: []
    developer: [tdd, typescript]
    qa: []
    orchestrator: []
  missing_skills: []
  critical_missing: []
```

### Skill Validation

- **Orchestrator**: Validates at planning time
- **Developer**: Validates in pre-flight; returns BLOCKED if missing
- **QA**: Validates before testing; returns BLOCKED if can't validate

## Memory Integration

### Backend Priority

1. **Mind**: Primary memory backend via MCP
2. **OpenSpec**: Secondary memory backend via MCP
3. **Engram**: Tertiary memory backend via MCP
4. **claude-mem**: Quaternary memory backend via MCP
5. **Stateless**: Only when no memory backend is available

### Auto-Detection

```yaml
memory_backend: robust_or_stateless
```

In `robust_or_stateless` mode:
- Check backends in priority order: Mind → OpenSpec → Engram → claude-mem
- If a backend is configured/available, agents MUST use it
- Agents MUST NOT fall back to stateless while any backend is configured/available
- If none are available, operate stateless and say so

If any memory backend is configured/available, agents MUST use it and MUST NOT fall back to stateless.

### What Gets Persisted

- Agreement contracts
- Accepted assumptions
- Skill assignments
- Key decisions
- Final approvals

## Permissions Matrix

| Tool | Orchestrator | Researcher | Planner | Developer | QA |
|------|-------------|-----------|---------|----------|-----|
| read | ✗ | ✓ | ✓ | ✓ | ✓ |
| write | ✗ | ✗ | ✓ (Gherkin only) | ✓ | ✗ |
| edit | ✗ | ✗ | ✗ | ✓ | ✗ |
| bash | ✗ | ✗ | ✗ | ✓ | ✓ |
| webfetch | ✓ | ✓ | ✓ | ✓ | ✓ |
| websearch | ✗ | ✓ | ✓ | ✗ | ✗ |
| task | ✓ (restricted) | ✗ | ✗ | ✗ | ✗ |
| grep/glob | ✗ | ✓ | ✓ | ✓ | ✓ |

### Task Permissions (Orchestrator)

```yaml
permission:
  task:
    "*": deny
    "nas_researcher": allow
    "nas_planner": allow
    "nas_developer": allow
    "nas_qa": allow
```

## Workflow Diagram

```
User Request
     │
     ▼
┌────────────┐
│Clarify     │◄── Questions to user
│Ambiguities │
└─────┬──────┘
      │
      ▼
┌────────────┐
│Delegate to │◄── Researcher investigates exhaustively
│Researcher  │
└─────┬──────┘
      │
      ▼
┌────────────┐
│Delegate to │◄── Planner receives research report
│Planner     │    Designs strategy + Gherkin + tasks
└─────┬──────┘
      │
      ▼
┌────────────┐
│Present     │◄── User reviews plan
│Plan        │
└─────┬──────┘
      │
      ▼
┌────────────┐
│Request     │◄── "Apply now?"
│Authorization│
└─────┬──────┘
      │
   [User says "yes"]
      │
      ▼
┌────────────┐
│Delegate to │◄── With auth metadata
│Developer   │
└─────┬──────┘
      │
      ▼
┌────────────┐
│Implement   │◄── TDD cycle
│(TDD)       │
└─────┬──────┘
      │
      ▼
┌────────────┐
│Delegate to │
│QA          │
└─────┬──────┘
      │
      ▼
   ┌───────┐
   │ QA    │
   │Report │
   └──┬────┘
      │
   [APPROVED]
      │
      ▼
  User notified
```

## Error Handling

### Blocked States

| Agent | Blocked By | Resolution |
|-------|------------|------------|
| Orchestrator | Missing critical skill | Ask user: proceed without skill or wait? |
| Researcher | Insufficient sources or access | Return to orchestrator with partial report |
| Planner | Incomplete research report | Return to orchestrator for re-investigation |
| Developer | No apply authorization | Return to orchestrator for authorization |
| Developer | Missing required skill | Return to orchestrator |
| QA | Can't validate (missing skill/tool) | Return to orchestrator |
| QA | Contradictory requirement | Return to orchestrator |

### Escalation Path

```
Developer ──fix──► QA ──approve──► Orchestrator ──notify──► User
     ▲              │
     │              └──reject──► Developer (fix loop)
     │
     └──block──► Orchestrator ──clarify──► User
```

## Anti-Hallucination Mechanisms

1. **Explicit Contracts**: Everything in writing (Agreement Contract, Skill Assignment, Gherkin)
2. **Authorization Gates**: No implementation without explicit approval
3. **Three-Layer Validation**: Orchestrator assumptions → Developer pre-flight → QA verification
4. **Pre-Commit Validation**: Tests must actually pass (not claimed)
5. **Scope Enforcement**: No deviation from approved Gherkin
6. **Stateless Awareness**: Reports when memory unavailable (prevents false assumptions)

## Model Trust Tiers and Operational Guidance

### Roles requiring high-compliance

- **Orchestrator** and **nas_developer** should run on a high-compliance model because they enforce authorization gates, permission contracts, and scope boundaries.
- **nas_planner** should run on a high-compliance model for precise specification writing and design decisions.
- **nas_qa** should also prefer a high-compliance model for strict rejection/approval behavior tied to test evidence.

### Recommended behavior for lower-trust models

- A lower-trust model should be limited to non-authoritative support tasks (draft analysis, summarization, optional research notes).
- A lower-trust model must not be the final decision-maker for apply authorization, permission interpretation, or QA approval.
- If a lower-trust model sees denied tools, missing authorization, or contradictory requirements, it should return BLOCKED/escalate instead of inventing workaround paths.

## Best Practices

### For Users

- Be specific in requirements
- Confirm or correct assumptions
- Review Gherkin before approving
- Say "yes" only when ready to apply
- Don't approve new changes just because previous ones were approved

### For Developers Extending Agents

- Never remove authorization gates
- Maintain XML output contracts
- Test locally before committing
- Update CHANGELOG
- Consider impact on other agents
- Document non-obvious behaviors

## References

- [OpenCode Agents Documentation](https://opencode.ai/docs/agents/)
- [OpenCode Permissions](https://opencode.ai/docs/permissions/)
- [OpenCode Skills](https://opencode.ai/docs/skills/)
- [Gherkin Language](https://cucumber.io/docs/gherkin/)
- [Mind Memory](https://github.com/GabrielMartinMoran/mind)
