import { describe, expect, it } from 'bun:test';
import { discoverModels, discoverVariants, parseModelLine } from '../../src/cli/lib/model-discovery';

describe('discoverModels', () => {
  describe('parses valid opencode models output', () => {
    it('should discover models from mock spawn output', async () => {
      const fakeOutput = [
        'opencode/deepseek-v4-pro',
        'anthropic/claude-sonnet-4-6',
        'openrouter/anthropic/claude-opus-4.1',
        '',
        '  ',
        'invalid',
      ].join('\n');

      const origSpawn = Bun.spawnSync;
      Bun.spawnSync = (() => ({
        exitCode: 0,
        stdout: Buffer.from(fakeOutput),
        stderr: Buffer.from(''),
      })) as typeof Bun.spawnSync;

      try {
        const models = await discoverModels();
        expect(models).toHaveLength(3);
        expect(models[0]).toEqual({ id: 'opencode/deepseek-v4-pro', provider: 'opencode', name: 'deepseek-v4-pro' });
        expect(models[1]).toEqual({ id: 'anthropic/claude-sonnet-4-6', provider: 'anthropic', name: 'claude-sonnet-4-6' });
        expect(models[2]).toEqual({ id: 'openrouter/anthropic/claude-opus-4.1', provider: 'openrouter', name: 'anthropic/claude-opus-4.1' });
      } finally {
        Bun.spawnSync = origSpawn;
      }
    });
  });

  describe('parseModelLine', () => {
    it('should extract provider and model name from single-segment', () => {
      const result = parseModelLine('anthropic/claude-sonnet-4-6');
      expect(result).toEqual({
        id: 'anthropic/claude-sonnet-4-6',
        provider: 'anthropic',
        name: 'claude-sonnet-4-6',
      });
    });

    it('should handle simple provider/model-id format', () => {
      const result = parseModelLine('opencode/deepseek-v4-pro');
      expect(result).toEqual({
        id: 'opencode/deepseek-v4-pro',
        provider: 'opencode',
        name: 'deepseek-v4-pro',
      });
    });

    it('should handle multi-segment model names', () => {
      const result = parseModelLine('openrouter/anthropic/claude-sonnet-4.6');
      expect(result).toEqual({
        id: 'openrouter/anthropic/claude-sonnet-4.6',
        provider: 'openrouter',
        name: 'anthropic/claude-sonnet-4.6',
      });
    });

    it('should skip lines with no slash', () => {
      expect(parseModelLine('invalidmodel')).toBeNull();
    });

    it('should skip empty lines', () => {
      expect(parseModelLine('')).toBeNull();
    });

    it('should skip whitespace-only lines', () => {
      expect(parseModelLine('   ')).toBeNull();
    });

    it('should skip lines with empty provider', () => {
      expect(parseModelLine('/onlyname')).toBeNull();
    });

    it('should skip lines with empty name', () => {
      expect(parseModelLine('provider/')).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should return empty list when opencode exits non-zero', async () => {
      const origSpawn = Bun.spawnSync;
      Bun.spawnSync = (() => ({
        exitCode: 1,
        stdout: Buffer.from(''),
        stderr: Buffer.from('error'),
      })) as typeof Bun.spawnSync;

      try {
        const models = await discoverModels();
        expect(models).toEqual([]);
      } finally {
        Bun.spawnSync = origSpawn;
      }
    });
  });
});

describe('discoverVariants', () => {
  describe('known models — exact prefix match', () => {
    it('should return variants for openrouter/anthropic/claude-sonnet', () => {
      const variants = discoverVariants('openrouter/anthropic/claude-sonnet');
      expect(variants).toEqual(['high', 'max']);
    });

    it('should return variants for openrouter/anthropic/claude-opus', () => {
      const variants = discoverVariants('openrouter/anthropic/claude-opus');
      expect(variants).toEqual(['high', 'max']);
    });

    it('should return variants for openrouter/anthropic/claude-haiku', () => {
      const variants = discoverVariants('openrouter/anthropic/claude-haiku');
      expect(variants).toEqual(['light', 'high']);
    });

    it('should return variants for openrouter/openai/gpt', () => {
      const variants = discoverVariants('openrouter/openai/gpt');
      expect(variants).toEqual(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']);
    });

    it('should return variants for openrouter/google/gemini', () => {
      const variants = discoverVariants('openrouter/google/gemini');
      expect(variants).toEqual(['low', 'high']);
    });

    it('should return variants for openrouter/deepseek/deepseek', () => {
      const variants = discoverVariants('openrouter/deepseek/deepseek');
      expect(variants).toEqual(['high', 'xhigh']);
    });
  });

  describe('prefix matching — versioned model IDs', () => {
    it('should match openrouter/anthropic/claude-sonnet-4-5 via prefix', () => {
      const variants = discoverVariants('openrouter/anthropic/claude-sonnet-4-5');
      expect(variants).toEqual(['high', 'max']);
    });

    it('should match openrouter/anthropic/claude-opus-4.1 via prefix', () => {
      const variants = discoverVariants('openrouter/anthropic/claude-opus-4.1');
      expect(variants).toEqual(['high', 'max']);
    });

    it('should match openrouter/openai/gpt-5 via prefix', () => {
      const variants = discoverVariants('openrouter/openai/gpt-5');
      expect(variants).toEqual(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']);
    });

    it('should match openrouter/google/gemini-pro-vision via prefix', () => {
      const variants = discoverVariants('openrouter/google/gemini-pro-vision');
      expect(variants).toEqual(['low', 'high']);
    });

    it('should match openrouter/deepseek/deepseek-v4-pro via prefix', () => {
      const variants = discoverVariants('openrouter/deepseek/deepseek-v4-pro');
      expect(variants).toEqual(['high', 'xhigh']);
    });
  });

  describe('longest-prefix wins — avoid false matches', () => {
    it('should prefer openrouter/anthropic/claude-sonnet over openrouter/anthropic/claude', () => {
      // claude-sonnet-4-5 starts with BOTH 'openrouter/anthropic/claude' AND 'openrouter/anthropic/claude-sonnet'
      // Should match the longer one
      const variants = discoverVariants('openrouter/anthropic/claude-sonnet-4-5');
      expect(variants).toEqual(['high', 'max']);
    });

    it('should prefer openrouter/anthropic/claude-haiku over openrouter/anthropic/claude', () => {
      const variants = discoverVariants('openrouter/anthropic/claude-haiku-3-5');
      expect(variants).toEqual(['light', 'high']);
    });

    it('should prefer openrouter/anthropic/claude-opus over openrouter/anthropic/claude', () => {
      const variants = discoverVariants('openrouter/anthropic/claude-opus-4.1');
      expect(variants).toEqual(['high', 'max']);
    });
  });

  describe('unknown models — return empty array', () => {
    it('should return empty for unlisted provider', () => {
      const variants = discoverVariants('openrouter/mistral/mistral-large');
      expect(variants).toEqual([]);
    });

    it('should return empty for opencode provider', () => {
      const variants = discoverVariants('opencode/deepseek-v4-pro');
      expect(variants).toEqual([]);
    });

    it('should return empty for anthropic direct provider', () => {
      const variants = discoverVariants('anthropic/claude-sonnet-4-6');
      expect(variants).toEqual([]);
    });

    it('should return empty for empty string', () => {
      const variants = discoverVariants('');
      expect(variants).toEqual([]);
    });

    it('should match base claude prefix for unknown claude sub-family', () => {
      // Prefix matching to base 'openrouter/anthropic/claude' is correct fallback
      // for any model starting with the claude prefix that doesn't match a sub-family
      const variants = discoverVariants('openrouter/anthropic/claude-unknown');
      expect(variants).toEqual(['high', 'max']);
    });
  });
});
