/**
 * Interactive `nas skills setup` wizard.
 *
 * Flow (per 2026-06-30 bugfix — broad scope means "all NAS agents",
 * not top-level `permission.skill`):
 *   1. Pick action (Add | Remove | Clear | Cancel)
 *   2a. (Add | Remove) pick scope — "All NAS agents" or "One specific
 *       agent" (only one scope question; no duplicate prompt)
 *   2b. (Clear)       confirm "clear all NAS agent policies"
 *   3a. (Add)   pick / type a pattern, pick action, confirm, apply
 *   3b. (Remove) pick a pattern from the live view, confirm, apply
 *
 * Uses @inquirer/prompts for interactive select/search/confirm prompts.
 * Always creates a backup before writing, matching the `nas agents
 * setup` policy.
 *
 * The wizard reads the live `opencode debug skill` registry to seed
 * pattern suggestions, but the user can type any native OpenCode
 * wildcard (`*`, `?`). Per the approved contract we do NOT invent a
 * matcher — wildcards are stored verbatim and OpenCode resolves them.
 */

import { defineCommand } from 'citty';
import search from '@inquirer/search';
import select from '@inquirer/select';
import confirm from '@inquirer/confirm';
import {
  readConfig,
  createBackup,
  writeConfig,
} from '../../lib/config-safety';
import {
  readSkillPolicies,
  addSkillPolicy,
  removeSkillPolicy,
  clearSkillPolicies,
  isValidAction,
  type PermissionAction,
  type SkillRule,
  type WriteScope,
} from '../../lib/skill-policies';
import { listAvailableSkills } from '../../lib/skill-discovery';
import { NAS_AGENTS } from '../agents/presenter';

type WizardAction = 'add' | 'remove' | 'clear' | 'cancel';

function fail(message: string, code = 1): never {
  console.error('Error:', message);
  process.exit(code);
}

export default defineCommand({
  meta: {
    name: 'setup',
    description: 'Interactively configure `permission.skill` rules for NAS agents',
  },
  async run() {
    try {
      // Read config first to detect malformed JSON before any interaction.
      const config = readConfig();
      const view = readSkillPolicies(config);

      // Step 1: pick the high-level action
      const action = await select<WizardAction>({
        message: 'What do you want to do?',
        choices: [
          { value: 'add', name: 'Add a rule', description: 'Append a pattern → action mapping' },
          { value: 'remove', name: 'Remove a rule', description: 'Delete an existing pattern' },
          { value: 'clear', name: 'Clear', description: 'Drop all NAS agent skill policies' },
          { value: 'cancel', name: 'Cancel', description: 'Exit without changes' },
        ],
      });

      if (action === 'cancel') {
        console.log('Cancelled. No changes made.');
        return;
      }

      // Step 2: branch on action. Clear is a one-step "all NAS agents"
      // confirmation; Add and Remove ask for scope ONCE here.
      if (action === 'clear') {
        return runClear(config);
      }

      const scope = await select<WriteScope>({
        message: 'Scope?',
        choices: [
          {
            value: 'all-nas',
            name: 'All NAS agents',
            description: 'Fan out the rule to every canonical NAS agent',
          },
          {
            value: 'agent',
            name: 'One specific agent',
            description: 'Apply the rule to a single NAS agent',
          },
        ],
      });

      return action === 'add'
        ? runAdd(config, view, scope)
        : runRemove(config, view, scope);
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err));
    }
  },
});

async function pickAgent(): Promise<string> {
  return await select<string>({
    message: 'Which agent?',
    choices: NAS_AGENTS.map((name) => ({ value: name, name })),
  });
}

function describeScope(scope: WriteScope, agentName?: string): string {
  if (scope === 'agent') return `one specific agent${agentName ? ` (${agentName})` : ''}`;
  return 'all NAS agents';
}

async function runAdd(
  config: ReturnType<typeof readConfig>,
  view: ReturnType<typeof readSkillPolicies>,
  scope: WriteScope,
): Promise<void> {
  const agentName = scope === 'agent' ? await pickAgent() : undefined;

  // Build pattern suggestions: live OpenCode skills + the existing rules
  // (so users can re-apply or modify them).
  let available: string[] = [];
  try {
    available = listAvailableSkills();
  } catch {
    // Discovery is best-effort in the wizard; fall through with []
  }
  const existing: string[] = [];
  for (const list of Object.values(view.perAgent)) {
    for (const r of list) existing.push(r.pattern);
  }
  const suggestions = Array.from(new Set([...available, ...existing])).sort();

  const pattern = await search<string>({
    message: 'Pattern (native OpenCode wildcard, e.g. `docs-*`, `*`, `git?`)',
    source: (term: string | undefined) => {
      const filtered = term
        ? suggestions.filter((s) => s.toLowerCase().includes(term.toLowerCase()))
        : suggestions;
      // Always allow free-form input by including the current term as an
      // option when the user typed something that does not match any
      // suggestion.
      const out = filtered.map((value) => ({ value, name: value }));
      if (term && !filtered.includes(term)) {
        out.unshift({ value: term, name: `${term}  (new)` });
      }
      return out;
    },
  });

  const action = await select<PermissionAction>({
    message: `Action for "${pattern}"?`,
    choices: [
      { value: 'allow', name: 'allow' },
      { value: 'deny', name: 'deny' },
      { value: 'ask', name: 'ask' },
    ],
  });

  if (!isValidAction(action)) fail(`Invalid action: ${action}`);

  const preview = addSkillPolicy(config, scope, pattern, action, agentName);

  const apply = await confirm({
    message:
      `Apply this change?\n\n` +
      `  scope:    ${describeScope(scope, agentName)}\n` +
      `  pattern:  ${pattern}\n` +
      `  action:   ${action}\n`,
    default: true,
  });
  if (!apply) {
    console.log('Cancelled. No changes made.');
    return;
  }

  createBackup();
  writeConfig(preview);
  console.log(
    `Added ${scope === 'agent' ? `agent "${agentName}" ` : 'all NAS agents '}rule: ${pattern} → ${action}`,
  );
  console.log('Restart OpenCode for changes to take effect.');
}

async function runRemove(
  config: ReturnType<typeof readConfig>,
  view: ReturnType<typeof readSkillPolicies>,
  scope: WriteScope,
): Promise<void> {
  const agentName = scope === 'agent' ? await pickAgent() : undefined;

  const rules =
    scope === 'all-nas'
      ? // Union of every NAS agent's rules (preserves per-agent pattern
        // semantics — only rules that exist on at least one agent are
        // listed; removing a pattern here removes it from every agent).
        mergeNasAgentRules(view)
      : (view.perAgent[agentName as string] ?? []);

  if (rules.length === 0) {
    console.log(
      `No rules to remove in ${describeScope(scope, agentName)}.`,
    );
    return;
  }

  const pattern = await search<string>({
    message: 'Which pattern?',
    source: () => rules.map((r) => ({ value: r.pattern, name: `${r.pattern} (${r.action})` })),
  });

  const preview = removeSkillPolicy(config, scope, pattern, agentName);
  const apply = await confirm({
    message:
      `Remove this rule?\n\n` +
      `  scope:    ${describeScope(scope, agentName)}\n` +
      `  pattern:  ${pattern}\n`,
    default: true,
  });
  if (!apply) {
    console.log('Cancelled. No changes made.');
    return;
  }
  createBackup();
  writeConfig(preview);
  console.log(
    `Removed ${scope === 'agent' ? `agent "${agentName}" ` : 'all NAS agents '}rule: ${pattern}`,
  );
  console.log('Restart OpenCode for changes to take effect.');
}

async function runClear(
  config: ReturnType<typeof readConfig>,
): Promise<void> {
  // `nas skills clear` in the wizard = "clear all NAS agent policies"
  // (the wizard never offers to clear a single agent — the user can
  // run `nas skills clear --scope agent --agent <name>` non-interactively).
  const preview = clearSkillPolicies(config, 'all');
  const apply = await confirm({
    message: 'Clear all NAS agent skill policies?',
    default: false,
  });
  if (!apply) {
    console.log('Cancelled. No changes made.');
    return;
  }
  createBackup();
  writeConfig(preview);
  console.log('Cleared all NAS agent skill policies.');
  console.log('Restart OpenCode for changes to take effect.');
}

/**
 * Union of all NAS agent per-agent rules, in stable NAS_AGENTS order.
 * Used by the Remove wizard at `scope=all-nas` so users see one row
 * per pattern (the same pattern may live on multiple agents).
 */
function mergeNasAgentRules(
  view: ReturnType<typeof readSkillPolicies>,
): SkillRule[] {
  const seen = new Set<string>();
  const out: SkillRule[] = [];
  for (const name of NAS_AGENTS) {
    for (const r of view.perAgent[name] ?? []) {
      if (seen.has(r.pattern)) continue;
      seen.add(r.pattern);
      out.push(r);
    }
  }
  return out;
}
