/**
 * Interactive NAS agent model configuration wizard.
 *
 * Flow: Select agent → Choose action → (if change) Search model → Confirm → Apply
 *
 * Uses @inquirer/prompts for interactive search/select/confirm prompts.
 */

import { defineCommand } from 'citty';
import search from '@inquirer/search';
import select from '@inquirer/select';
import confirm from '@inquirer/confirm';
import {
  readConfig,
  createBackup,
  setAgentModel,
  removeAgentOverride,
  writeConfig,
} from '../../lib/config-safety';
import { discoverModels, discoverVariants, type Model } from '../../lib/model-discovery';
import {
  NAS_AGENTS as PRESENTER_NAS_AGENTS,
  getModelGuidance as presenterGetModelGuidance,
  getModelGuidanceLabel as presenterGetModelGuidanceLabel,
} from './presenter';

// Re-exported for backward compatibility with existing imports (tests, etc).
export const NAS_AGENTS = PRESENTER_NAS_AGENTS;

type Action = 'change_model' | 'inherit_default' | 'cancel';

function currentModelLabel(config: Record<string, unknown> | undefined): string | undefined {
  return config?.model as string | undefined;
}

/**
 * Returns the model-capability guidance kind for an agent
 * (`'light' | 'heavy' | undefined`). Used by the setup wizard and any
 * callers that need the structured kind, not the human-readable label.
 */
export function getModelGuidance(agentName: string) {
  return presenterGetModelGuidance(agentName);
}

/**
 * Returns the human-friendly model-capability guidance label for an agent
 * (e.g. "heavy model recommended"). Used by the list presenter and any
 * callers that want to display the wording directly.
 */
export function getModelGuidanceLabel(agentName: string) {
  return presenterGetModelGuidanceLabel(agentName);
}

/**
 * Format a human-friendly summary line for an agent's model configuration.
 * Shows "default" when no model override is set. Used by the setup wizard
 * preview only — the list surface uses the richer card view from
 * `./presenter`.
 */
export function formatAgentOutput(
  agentName: string,
  modelId: string | undefined,
  variant?: string,
  reasoningEffort?: string,
): string {
  const lines: string[] = [];
  lines.push(`Agent: ${agentName}`);
  lines.push(`Model: ${modelId ?? 'default'}`);
  if (variant && variant !== 'default') {
    lines.push(`Variant: ${variant}`);
  }
  lines.push(`Reasoning effort: ${reasoningEffort ?? 'default'}`);
  return lines.join('\n');
}

export default defineCommand({
  meta: {
    name: 'setup',
    description: 'Interactively configure NAS agent models',
  },
  async run() {
    try {
      // Read config first to detect malformed JSON before any interaction
      const config = readConfig();

      // Step 1: Select agent
      const agentName = await search<string>({
        message: 'Select agent to configure',
        source: async (term: string | undefined) => {
          const filtered = term
            ? NAS_AGENTS.filter((a) => a.toLowerCase().includes(term.toLowerCase()))
            : NAS_AGENTS;

          return filtered.map((name) => {
            const currentModel = currentModelLabel(config.agent?.[name]);
            const guidance = presenterGetModelGuidanceLabel(name);
            const parts: string[] = [];
            if (currentModel) {
              parts.push(`(${currentModel})`);
            }
            if (guidance) {
              parts.push(guidance);
            }
            return {
              value: name,
              name: name,
              description: parts.join(' · '),
            };
          });
        },
      });

      // Step 2: Choose action
      const action = await select<Action>({
        message: `What do you want to do with ${agentName}?`,
        choices: [
          {
            value: 'change_model',
            name: 'Change model',
            description: 'Set a specific model for this agent',
          },
          {
            value: 'inherit_default',
            name: 'Inherit default',
            description: 'Remove override, use default model',
          },
          {
            value: 'cancel',
            name: 'Cancel',
            description: 'Exit without changes',
          },
        ],
      });

      if (action === 'cancel') {
        console.log('Cancelled. No changes made.');
        return;
      }

      // Step 3: Apply
      if (action === 'inherit_default') {
        const modified = removeAgentOverride(config, agentName);
        createBackup();
        writeConfig(modified);
        console.log(formatAgentOutput(agentName, undefined));
        console.log('Restart OpenCode for changes to take effect.');
        return;
      }

      // Step 3a: Search for model
      const allModels = await discoverModels();
      if (allModels.length === 0) {
        console.log('No models discovered. Is opencode installed and working?');
        return;
      }

      const modelId = await search<Model>({
        message: 'Search for a model',
        source: async (term: string | undefined) => {
          const filtered = term
            ? allModels.filter(
                (m) =>
                  m.id.toLowerCase().includes(term.toLowerCase()) ||
                  m.name.toLowerCase().includes(term.toLowerCase()),
              )
            : allModels;

          return filtered.map((m) => ({
            value: m,
            name: m.id,
          }));
        },
      });

      // Step 3b: Select variant if available
      const availableVariants = discoverVariants(modelId.id);
      let selectedVariant: string | undefined;

      if (availableVariants.length > 0) {
        const variantChoices = [
          { value: 'default', name: 'default (no variant)' },
          ...availableVariants.map((v) => ({ value: v, name: v })),
        ];

        selectedVariant = await select<string>({
          message: `Select variant for ${modelId.id}`,
          choices: variantChoices,
        });
      }

      // Step 4: Confirm
      const previewConfig = setAgentModel(
        config,
        agentName,
        modelId.id,
        selectedVariant,
      );

      const apply = await confirm({
        message: formatAgentOutput(agentName, modelId.id, selectedVariant) + '\n\n' +
                 `Apply this change?`,
        default: true,
      });

      if (!apply) {
        console.log('Cancelled. No changes made.');
        return;
      }

      // Step 5: Apply
      createBackup();
      writeConfig(previewConfig);
      console.log(formatAgentOutput(agentName, modelId.id, selectedVariant));
      console.log('Restart OpenCode for changes to take effect.');
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  },
});
