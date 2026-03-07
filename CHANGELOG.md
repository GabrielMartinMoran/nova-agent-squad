# Changelog

All notable changes to Neocortex Strike Team will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-03-07

### Added

- Initial release of Neocortex Strike Team
- Four-agent architecture: Orchestrator, Researcher, Developer, QA
- Planning-first workflow with explicit authorization gates
- Tagged Gherkin specification support
- Skill discovery and assignment system
- Memory integration (Mind MCP or stateless fallback)
- Anti-hallucination contract with three-layer validation
- XML-structured output contracts for each agent
- Makefile for easy installation
- Complete documentation (README, CONTRIBUTING, AGENTS, architecture)

### Agents

| Agent | Description |
|-------|-------------|
| `Neocortex Strike Team` | Primary orchestrator (manager + tech lead) |
| `nst_researcher` | Technical researcher with Gherkin output |
| `nst_developer` | TDD-focused implementation agent |
| `nst_qa` | Strict QA validator with English status reports |

### Features

- Authorization gates requiring explicit user approval before implementation
- Pre-flight validation for authorization metadata in Developer
- QA verification of authorization for each change scope
- Skill Assignment Contract built by orchestrator
- Memory policy with auto-detection of available backends

---

For older changes, see the commit history.
