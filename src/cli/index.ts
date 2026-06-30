import { defineCommand, runMain } from 'citty';

const agentsCommand = defineCommand({
  meta: {
    name: 'agents',
    description: 'Manage NAS agents',
  },
  // Read-only default: bare `nas agents` (no subcommand) dispatches to
  // the `list` subcommand, so it prints the same multi-agent configured-
  // models summary as `nas agents list`.
  default: 'list',
  subCommands: {
    setup: () => import('./commands/agents/setup').then((m) => m.default),
    list: () => import('./commands/agents/list').then((m) => m.default),
  },
});

const skillsCommand = defineCommand({
  meta: {
    name: 'skills',
    description: 'Manage `permission.skill` rules in OpenCode',
  },
  // Read-only default: bare `nas skills` (no subcommand) dispatches to
  // the `list` subcommand, so it prints the same global + per-agent
  // skill policy view as `nas skills list`.
  default: 'list',
  subCommands: {
    list: () => import('./commands/skills/list').then((m) => m.default),
    setup: () => import('./commands/skills/setup').then((m) => m.default),
    add: () => import('./commands/skills/add').then((m) => m.default),
    remove: () => import('./commands/skills/remove').then((m) => m.default),
    clear: () => import('./commands/skills/clear').then((m) => m.default),
  },
});

const main = defineCommand({
  meta: {
    name: 'nas',
    version: '1.0.0',
    description: 'Nova Agent Squad CLI — build and install agent files across platforms',
  },
  subCommands: {
    build: () => import('./commands/build').then((m) => m.buildCommand),
    install: () => import('./commands/install').then((m) => m.installCommand),
    doctor: () => import('./commands/doctor').then((m) => m.doctorCommand),
    validate: () => import('./commands/validate').then((m) => m.validateCommand),
    test: () => import('./commands/test').then((m) => m.testCommand),
    uninstall: () => import('./commands/uninstall').then((m) => m.uninstallCommand),
    update: () => import('./commands/update').then((m) => m.updateCommand),
    agents: () => Promise.resolve(agentsCommand),
    skills: () => Promise.resolve(skillsCommand),
  },
});

runMain(main);
