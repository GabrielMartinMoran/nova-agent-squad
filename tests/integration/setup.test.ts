import { describe, expect, it, afterEach } from 'bun:test';
import {
  setAgentModel,
  removeAgentOverride,
  readConfig,
  writeConfig,
  createBackup,
  type OpenCodeConfig,
} from '../../src/cli/lib/config-safety';
import { NAS_AGENTS, getModelGuidance, formatAgentOutput } from '../../src/cli/commands/agents/setup';
import { rmSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), 'nas-setup-integration-' + Date.now());

function createTestConfig(content: object): string {
  mkdirSync(testDir, { recursive: true });
  const path = join(testDir, 'opencode.json');
  writeFileSync(path, JSON.stringify(content, null, 2));
  return path;
}

function cleanup() {
  try { rmSync(testDir, { recursive: true, force: true }); } catch {}
}

afterEach(cleanup);

describe('Setup wizard — config persistence', () => {
  it('should apply setAgentModel and persist to file', () => {
    const path = createTestConfig({ default_agent: 'nas_developer' });
    const config = readConfig(path);
    const modified = setAgentModel(config, 'nas_developer', 'anthropic/claude-sonnet-4-6');
    writeConfig(modified, path);

    const reread = readConfig(path);
    expect(reread.agent).toBeDefined();
    expect(reread.agent!.nas_developer).toEqual({ model: 'anthropic/claude-sonnet-4-6' });
    expect(reread.default_agent).toBe('nas_developer');
  });

  it('should remove override and persist to file', () => {
    const path = createTestConfig({
      agent: { nas_developer: { model: 'old/model' } },
    });
    const config = readConfig(path);
    const removed = removeAgentOverride(config, 'nas_developer');
    writeConfig(removed, path);

    const reread = readConfig(path);
    expect(reread.agent).toBeUndefined();
  });

  it('should preserve complex existing config through modification', () => {
    const original = {
      $schema: 'https://opencode.ai/config.json',
      default_agent: 'Nova Agent Squad',
      mcp: {
        server: { type: 'local', command: ['echo'], enabled: true },
      },
      instructions: ['instruction-file.md'],
      plugin: ['plugin-one'],
      provider: { cursor: { name: 'Cursor' } },
    };
    const path = createTestConfig(original);
    const config = readConfig(path);
    const modified = setAgentModel(config, 'nas_developer', 'anthropic/model');
    writeConfig(modified, path);

    const reread = readConfig(path);
    expect(reread.$schema).toBe('https://opencode.ai/config.json');
    expect(reread.default_agent).toBe('Nova Agent Squad');
    expect(reread.mcp).toBeDefined();
    expect(reread.instructions).toBeDefined();
    expect(reread.plugin).toBeDefined();
    expect(reread.provider).toBeDefined();
    expect(reread.agent!.nas_developer.model).toBe('anthropic/model');
  });

  it('should create backup before modification', () => {
    const path = createTestConfig({ key: 'original' });
    const backupPath = createBackup(path);
    expect(backupPath).toMatch(/\.bak\.\d{14}$/);

    const backupContent = readFileSync(backupPath, 'utf-8');
    expect(backupContent).toContain('"key": "original"');
    try { rmSync(backupPath); } catch {}
  });

  it('should handle running setup twice — second run reads previous override', () => {
    const path = createTestConfig({ default_agent: 'test' });

    // First run: set model
    const config1 = readConfig(path);
    const modified1 = setAgentModel(config1, 'nas_developer', 'first/model');
    writeConfig(modified1, path);

    // Second run: read and find previous override
    const config2 = readConfig(path);
    expect(config2.agent).toBeDefined();
    expect(config2.agent!.nas_developer.model).toBe('first/model');

    // Second run: change model
    const modified2 = setAgentModel(config2, 'nas_developer', 'second/model');
    writeConfig(modified2, path);

    const final = readConfig(path);
    expect(final.agent!.nas_developer.model).toBe('second/model');
  });

  it('should clean up empty agent section after last override removal', () => {
    const path = createTestConfig({
      agent: { nas_developer: { model: 'test/model' } },
      default_agent: 'test',
    });
    const config = readConfig(path);
    expect(config.agent).toBeDefined();

    const removed = removeAgentOverride(config, 'nas_developer');
    expect(removed.agent).toBeUndefined();
    writeConfig(removed, path);

    const reread = readConfig(path);
    expect(reread.agent).toBeUndefined();
    expect(reread.default_agent).toBe('test');
  });

  it('should throw on malformed JSON before any modification', () => {
    const path = join(testDir, 'broken.json');
    mkdirSync(testDir, { recursive: true });
    writeFileSync(path, '{ invalid json');
    expect(() => readConfig(path)).toThrow(/malformed|parse|JSON/i);
  });
});

describe('Setup wizard — model lookup helpers', () => {
  it('should find current model for an agent from config', () => {
    const config: OpenCodeConfig = {
      agent: {
        nas_developer: { model: 'anthropic/claude-sonnet-4-6' },
        nas_qa: { model: 'opencode/deepseek-v4-pro' },
      },
    };
    expect(config.agent?.nas_developer?.model).toBe('anthropic/claude-sonnet-4-6');
    expect(config.agent?.nas_qa?.model).toBe('opencode/deepseek-v4-pro');
    expect(config.agent?.nas_planner?.model).toBeUndefined();
  });

  it('should return undefined when agent has no config section', () => {
    const config: OpenCodeConfig = { default_agent: 'test' };
    expect(config.agent?.nas_developer?.model).toBeUndefined();
  });
});

describe('Setup wizard — variant flow', () => {
  it('should persist model with variant and re-read correctly', () => {
    const path = createTestConfig({ default_agent: 'nas_developer' });
    const config = readConfig(path);
    const modified = setAgentModel(config, 'nas_developer', 'openrouter/anthropic/claude-sonnet', 'high');
    writeConfig(modified, path);

    const reread = readConfig(path);
    expect(reread.agent!.nas_developer).toEqual({
      model: 'openrouter/anthropic/claude-sonnet',
      variant: 'high',
    });
  });

  it('should change variant on re-run and persist', () => {
    const path = createTestConfig({
      agent: { nas_developer: { model: 'openrouter/anthropic/claude-sonnet', variant: 'high' } },
    });

    // Re-run: change variant from high to max
    const config = readConfig(path);
    const modified = setAgentModel(config, 'nas_developer', 'openrouter/anthropic/claude-sonnet', 'max');
    writeConfig(modified, path);

    const final = readConfig(path);
    expect(final.agent!.nas_developer.variant).toBe('max');
    expect(final.agent!.nas_developer.model).toBe('openrouter/anthropic/claude-sonnet');
  });

  it('should switch to default (no variant) and remove variant field', () => {
    const path = createTestConfig({
      agent: { nas_developer: { model: 'openrouter/anthropic/claude-sonnet', variant: 'high' } },
    });

    const config = readConfig(path);
    const modified = setAgentModel(config, 'nas_developer', 'openrouter/anthropic/claude-sonnet', 'default');
    writeConfig(modified, path);

    const final = readConfig(path);
    expect(final.agent!.nas_developer.model).toBe('openrouter/anthropic/claude-sonnet');
    expect(final.agent!.nas_developer.variant).toBeUndefined();
  });

  it('should preserve variant when setting model without variant', () => {
    const path = createTestConfig({
      agent: { nas_developer: { model: 'old/model', variant: 'high' } },
    });

    const config = readConfig(path);
    // setAgentModel without variant should preserve existing variant
    const modified = setAgentModel(config, 'nas_developer', 'new/model');
    writeConfig(modified, path);

    const final = readConfig(path);
    expect(final.agent!.nas_developer.model).toBe('new/model');
    expect(final.agent!.nas_developer.variant).toBe('high');
  });
});

describe('Setup wizard — NAS agents list', () => {
  it('should include all six agents including nas_developer_mini', () => {
    expect(NAS_AGENTS).toHaveLength(6);
    expect(NAS_AGENTS).toContain('nas_researcher');
    expect(NAS_AGENTS).toContain('nas_planner');
    expect(NAS_AGENTS).toContain('nas_developer');
    expect(NAS_AGENTS).toContain('nas_developer_mini');
    expect(NAS_AGENTS).toContain('nas_qa');
    expect(NAS_AGENTS).toContain('Nova Agent Squad');
  });
});

describe('Setup wizard — agent model capability guidance', () => {
  it('should classify nas_developer_mini and nas_qa as light-model agents', () => {
    expect(getModelGuidance('nas_developer_mini')).toBe('light');
    expect(getModelGuidance('nas_qa')).toBe('light');
  });

  it('should classify nas_researcher, nas_planner, nas_developer, and Nova Agent Squad as heavy-model agents', () => {
    expect(getModelGuidance('nas_researcher')).toBe('heavy');
    expect(getModelGuidance('nas_planner')).toBe('heavy');
    expect(getModelGuidance('nas_developer')).toBe('heavy');
    expect(getModelGuidance('Nova Agent Squad')).toBe('heavy');
  });

  it('should return undefined for unknown agents', () => {
    expect(getModelGuidance('unknown-agent')).toBeUndefined();
  });
});

describe('Setup wizard — human-friendly output formatting', () => {
  it('should format agent config output with model and variant', () => {
    expect(formatAgentOutput('nas_developer', 'anthropic/claude-sonnet-4-6', 'high'))
      .toContain('nas_developer');
    expect(formatAgentOutput('nas_developer', 'anthropic/claude-sonnet-4-6', 'high'))
      .toContain('Model: anthropic/claude-sonnet-4-6');
    expect(formatAgentOutput('nas_developer', 'anthropic/claude-sonnet-4-6', 'high'))
      .toContain('Variant: high');
  });

  it('should show default when agent has no explicit model override', () => {
    expect(formatAgentOutput('nas_researcher', undefined))
      .toContain('Model: default');
  });

  it('should include reasoning effort when provided', () => {
    const output = formatAgentOutput('nas_qa', 'opencode/deepseek-v4-pro', undefined, 'medium');
    expect(output).toContain('Model: opencode/deepseek-v4-pro');
    expect(output).toContain('Reasoning effort: medium');
  });

  it('should show default for reasoning effort when not provided', () => {
    const output = formatAgentOutput('nas_qa', 'opencode/deepseek-v4-pro');
    expect(output).toContain('Reasoning effort: default');
  });
});
