/**
 * Model discovery — execute `opencode models` and parse the output.
 *
 * Output is one model per line in format: provider/model-id
 * Example: opencode/deepseek-v4-pro → { id: "opencode/deepseek-v4-pro", provider: "opencode", name: "deepseek-v4-pro" }
 */

export type Model = {
  id: string;
  provider: string;
  name: string;
};

/**
 * Known variant mappings for OpenRouter model families.
 * Keys are model ID prefixes, values are available reasoning effort variants.
 *
 * Source: https://openrouter.ai/docs/features/reasoning-tokens
 */
const KNOWN_VARIANTS: Record<string, string[]> = {
  'openrouter/anthropic/claude': ['high', 'max'],
  'openrouter/anthropic/claude-sonnet': ['high', 'max'],
  'openrouter/anthropic/claude-haiku': ['light', 'high'],
  'openrouter/anthropic/claude-opus': ['high', 'max'],
  'openrouter/openai/gpt': ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'],
  'openrouter/google/gemini': ['low', 'high'],
  'openrouter/deepseek/deepseek': ['high', 'xhigh'],
};

/**
 * Parse a single model line into a Model object.
 * Returns null for empty lines, whitespace-only lines, or lines without a slash.
 */
export function parseModelLine(line: string): Model | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const slashIndex = trimmed.indexOf('/');
  if (slashIndex < 0) return null;

  const provider = trimmed.slice(0, slashIndex);
  const name = trimmed.slice(slashIndex + 1);

  if (!provider || !name) return null;

  return {
    id: trimmed,
    provider,
    name,
  };
}

/**
 * Discover available variants for a given model ID.
 *
 * Matches by longest prefix in KNOWN_VARIANTS.
 * Returns variant names (e.g. ['high', 'max']) or empty array if none known.
 *
 * Example: discoverVariants('openrouter/anthropic/claude-sonnet-4-5') → ['high', 'max']
 */
export function discoverVariants(modelId: string): string[] {
  if (!modelId) return [];

  // Find longest matching prefix in KNOWN_VARIANTS
  let bestMatch: string | null = null;
  let bestLength = 0;

  for (const prefix of Object.keys(KNOWN_VARIANTS)) {
    if (modelId.startsWith(prefix) && prefix.length > bestLength) {
      bestMatch = prefix;
      bestLength = prefix.length;
    }
  }

  if (bestMatch) {
    return [...KNOWN_VARIANTS[bestMatch]];
  }

  return [];
}

/**
 * Discover available models by running `opencode models`.
 * Returns parsed Model[] on success, empty array on failure.
 */
export async function discoverModels(): Promise<Model[]> {
  try {
    const proc = Bun.spawnSync(['opencode', 'models'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    if (proc.exitCode !== 0) {
      console.warn(`opencode models exited with code ${proc.exitCode}: ${proc.stderr.toString()}`);
      return [];
    }

    const output = proc.stdout.toString();
    const lines = output.split('\n');

    const models: Model[] = [];
    for (const line of lines) {
      const parsed = parseModelLine(line);
      if (parsed) models.push(parsed);
    }

    return models;
  } catch (err) {
    console.warn('Failed to discover models:', err instanceof Error ? err.message : String(err));
    return [];
  }
}
