/**
 * Unit tests for the read-only `nas agents list` summary surface.
 *
 * The list command shares its renderer with bare `nas agents` (both
 * dispatch to `buildAgentSummary`). This file focuses on the list
 * command's contract:
 *   - byte-identical output between bare `nas agents` and `nas agents list`
 *     is verified by the integration test.
 *   - the read-only property is also verified by the integration test.
 *   - here we exercise the renderer contract: canonical agent list, default
 *     placeholders, override/default state indicators, guidance text, and
 *     the strict color rules.
 *
 * The `formatAgentOutput` helper is no longer used by the list surface; it
 * is now used only by the `setup` wizard for its previews, so it has its
 * own focused tests below.
 */

import { describe, expect, it } from 'bun:test';
import {
  buildAgentSummary,
} from '../../src/cli/commands/agents/presenter';
import { NAS_AGENTS } from '../../src/cli/commands/agents/setup';
import {
  formatAgentOutput,
} from '../../src/cli/commands/agents/setup';
import type { OpenCodeConfig } from '../../src/cli/lib/config-safety';

const PLAIN = { colorize: false } as const;

describe('buildAgentSummary — list command renderer', () => {
  it('should include every NAS agent in stable order', () => {
    const output = buildAgentSummary({}, PLAIN);
    for (const name of NAS_AGENTS) {
      expect(output).toContain(name);
    }
  });

  it('should show "Model: default" for every agent when no overrides are set', () => {
    const output = buildAgentSummary({}, PLAIN);
    const modelDefaultLines = output
      .split('\n')
      .filter((line) => /^Model: /.test(line));
    expect(modelDefaultLines.length).toBe(NAS_AGENTS.length);
    for (const line of modelDefaultLines) {
      // label "Model:" followed by ": default" with optional alignment spaces
      expect(line).toMatch(/^Model:\s+default$/);
    }
  });

  it('should show "Reasoning effort: default" for every agent when no overrides are set', () => {
    const output = buildAgentSummary({}, PLAIN);
    const reasoningLines = output
      .split('\n')
      .filter((line) => /^Reasoning effort: /.test(line));
    expect(reasoningLines.length).toBe(NAS_AGENTS.length);
    for (const line of reasoningLines) {
      expect(line).toMatch(/^Reasoning effort:\s+default$/);
    }
  });

  it('should show the configured model and variant for an overridden agent', () => {
    const config: OpenCodeConfig = {
      agent: {
        nas_developer: { model: 'anthropic/claude-sonnet-4-6', variant: 'high' },
      },
    };
    const output = buildAgentSummary(config, PLAIN);
    expect(output).toMatch(/Model:\s+anthropic\/claude-sonnet-4-6/);
    expect(output).toMatch(/Variant:\s+high/);
  });

  it('should show model override without a Variant line when variant is not set', () => {
    const config: OpenCodeConfig = {
      agent: { nas_qa: { model: 'opencode/deepseek-v4-pro' } },
    };
    const output = buildAgentSummary(config, PLAIN);
    expect(output).toMatch(/Model:\s+opencode\/deepseek-v4-pro/);
    // The default-variant case must not add a redundant "Variant: default" line
    expect(output).not.toMatch(/Variant: default/);
  });

  it('should ignore agents in config that are not in the canonical NAS_AGENTS list', () => {
    const config: OpenCodeConfig = {
      agent: {
        random_other_agent: { model: 'some/model' },
        nas_developer: { model: 'anthropic/claude-sonnet-4-6' },
      },
    };
    const output = buildAgentSummary(config, PLAIN);
    // Unknown agents are not part of the summary
    expect(output).not.toContain('random_other_agent');
    // Known agent still appears with its override
    expect(output).toMatch(/Model:\s+anthropic\/claude-sonnet-4-6/);
  });

  it('should treat missing agent section the same as empty config', () => {
    const outputEmpty = buildAgentSummary({}, PLAIN);
    const outputMissing = buildAgentSummary({ agent: undefined }, PLAIN);
    expect(outputEmpty).toBe(outputMissing);
  });

  it('should be safe when config is undefined', () => {
    const output = buildAgentSummary(undefined, PLAIN);
    expect(output).toMatch(/Model:\s+default/);
  });

  it('should mark each agent with a state indicator (override ● vs default ○)', () => {
    const config: OpenCodeConfig = {
      agent: {
        nas_developer: { model: 'anthropic/claude-sonnet-4-6' },
        nas_qa: {},
      },
    };
    const output = buildAgentSummary(config, PLAIN);
    // exactly one override marker (the nas_developer block)
    expect(output.match(/●/g)?.length).toBe(1);
    // five default markers (every other NAS agent in the canonical set)
    expect(output.match(/○/g)?.length).toBe(NAS_AGENTS.length - 1);
  });

  it('should include a Guidance line referencing the model-capability hint', () => {
    const output = buildAgentSummary({}, PLAIN);
    expect(output).toContain('Guidance:');
    // human-friendly wording, not a hardcoded model name
    expect(output).toMatch(/Guidance:.*(lighter model sufficient|heavy model recommended)/);
  });

  it('should default to plain output (no ANSI) when called without options', () => {
    const output = buildAgentSummary({});
    expect(output).not.toContain('\x1b[');
  });
});

describe('formatAgentOutput — setup wizard preview (still exported)', () => {
  it('should show model and reasoning effort with default placeholders', () => {
    const out = formatAgentOutput('nas_developer', 'anthropic/claude-sonnet-4-6');
    expect(out).toContain('Agent: nas_developer');
    expect(out).toContain('Model: anthropic/claude-sonnet-4-6');
    expect(out).toContain('Reasoning effort: default');
  });

  it('should include the Variant line when a non-default variant is set', () => {
    const out = formatAgentOutput('nas_developer', 'm', 'high');
    expect(out).toContain('Variant: high');
  });

  it('should omit the Variant line when no variant is given', () => {
    const out = formatAgentOutput('nas_qa', 'opencode/deepseek-v4-pro');
    expect(out).not.toContain('Variant:');
  });
});
