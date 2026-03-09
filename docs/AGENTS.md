# Agent Versioning and Maintenance Guide

This document describes how to version, maintain, and update the Nova Agent Squad agents.

## Versioning Scheme

Nova Agent Squad follows **Semantic Versioning** (SemVer):

- **MAJOR**: Breaking changes to agent behavior, permission changes, or removal of features
- **MINOR**: New features, additional rules, or backward-compatible behavior changes
- **PATCH**: Bug fixes, documentation updates, minor clarifications

### Version Location

The current version is documented in:
- `CHANGELOG.md` (human-readable history)
- Agent frontmatter (optional, for future tooling)

## Versioning Workflow

### Before Making Changes

1. **Assess impact**: Will this change how the agent behaves?
2. **Test locally**: Copy agents to your OpenCode config and verify
3. **Check dependencies**: Does this affect other agents?

### Making Changes

1. Update the relevant agent `.md` file
2. Test the change locally
3. Update `CHANGELOG.md`:
   ```markdown
   ## [X.Y.Z] - YYYY-MM-DD

   ### Changed
   - Description of what changed
   ```
4. Commit with conventional message:
   ```bash
   git commit -m "feat: description of change"
   ```

### Release Process

1. Ensure all changes are committed
2. Update `CHANGELOG.md` with release version
3. Tag the release:
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin main --tags
   ```

## Agent File Structure

Each agent is a Markdown file with YAML frontmatter:

```markdown
---
description: Agent description
mode: primary|subagent
temperature: 0.1
steps: 20
permission:
  edit: deny|allow
  bash: deny|allow
  webfetch: allow|deny
  task:
    "*": deny
    "agent-name": allow
---

[Agent prompt content...]
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `description` | Yes | Human-readable description for agent list |
| `mode` | Yes | `primary` or `subagent` |
| `hidden` | No | Hide from `@` autocomplete (subagents only) |
| `temperature` | No | Model temperature (default varies by model) |
| `steps` | No | Max agent iterations before forcing response |
| `permission` | No | Tool-specific permissions |
| `default_agent` | No | For primary agents, sets default |

## Operational Policy: hard cap + soft thresholds + handoff

For `nas_researcher`, `nas_developer`, and `nas_qa`:

- Frontmatter uses **hard cap** `steps: 30`.
- Prompt rules include **soft thresholds**:
  - `<=10`: estándar
  - `>=20`: tarea compleja; evaluar cercanía de cierre
  - `>=27`: decisión obligatoria: cerrar si está cerca o handoff al orquestador si falta trabajo sustantivo

### Structured handoff (compatible contract extension)

Existing XML tags must remain unchanged. If operational handoff is needed, agents append:

```xml
<handoff_operativo>
progreso_actual: [...]
trabajo_restante: [...]
riesgos: [...]
recomendacion: [SEGUIR | NO_SEGUIR]
pregunta_al_usuario: [... o "N/A"]
</handoff_operativo>
```

## Common Update Patterns

## Planning Confirmation Policy (Hybrid)

When updating the orchestrator prompt, keep this behavior aligned with docs and tests:

- In planning, confirm only scope changes or critical assumptions.
- Do not ask confirmation for minor analysis/spec steps.
- Keep the apply gate question exact: "Implementation plan is ready. Do you want me to apply it now?"
- Keep single-use authorization per scope and never auto-approve new scopes.

### Adding a New Rule

1. Identify the appropriate agent
2. Add rule to the prompt in the correct section
3. Test locally
4. Update CHANGELOG as MINOR or PATCH depending on impact

Example:
```markdown
### ADDED RULE
- New rule description here
```

### Changing Permissions

1. Update the `permission` section in frontmatter
2. Test that the agent still functions
3. Update CHANGELOG as MAJOR if this breaks workflows

### Adding a New Agent

1. Create new `.md` file in `.opencode/agents/`
2. Add appropriate frontmatter
3. Update README.md to document the new agent
4. Update CHANGELOG as MINOR
5. Update this guide if workflow changes

## Best Practices

### Do

- Test changes locally before committing
- Use clear, specific descriptions in prompts
- Maintain XML output contracts (they're used by other agents)
- Keep prompts focused on single responsibilities
- Document non-obvious behaviors

### Don't

- Remove authorization gates without MAJOR version bump
- Change XML tag names (breaks agent communication)
- Make changes without testing first
- Forget to update CHANGELOG

## Agent Communication Contracts

Agents communicate using structured XML tags:

### Orchestrator → User
```xml
<analysis>
(Reasoning...)
</analysis>
(Direct response...)
```

### Orchestrator → Researcher
Delegation via Task tool with context

### Researcher → Orchestrator
```xml
<feasibility>
(Summary...)
</feasibility>
<rearched_alternatives>
(Research results...)
</researched_alternatives>
<gherkin>
Feature: ...
</gherkin>
```

### Developer → QA (via output)
```xml
<tdd_cycle>
Phase: [Red|Green|Refactor|Linting|Integration]
Action: [Description]
</tdd_cycle>
```

### QA → Orchestrator
```xml
<qa_status>
Status: [APPROVED|REJECTED|BLOCKED]
</qa_status>
<validation_details>
(Checks performed...)
</validation_details>
<required_action>
(Next steps...)
</required_action>
```

## Troubleshooting

### Agent not being picked up

1. Check file is in `~/.config/opencode/agents/` (global) or `.opencode/agents/` (project)
2. Verify YAML frontmatter is valid
3. Restart OpenCode

### Permission issues

1. Check `permission` section in frontmatter
2. Ensure syntax is correct YAML
3. Test with minimal permissions first

### Agent behaving unexpectedly

1. Review prompt for conflicting instructions
2. Check temperature and steps settings
3. Test with reduced complexity

## References

- [OpenCode Agents Documentation](https://opencode.ai/docs/agents/)
- [OpenCode Permissions](https://opencode.ai/docs/permissions/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)
