import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { existsSync, readdirSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { $ } from 'bun';

const CLI_ENTRY = 'src/cli/index.ts';

// Clean up before tests
beforeAll(() => {
  if (existsSync('dist/platforms/opencode')) {
    rmSync('dist/platforms/opencode', { recursive: true, force: true });
  }
});

afterAll(() => {
  // Restore from canonical backup
  if (existsSync('/tmp/canonical-dist-openode')) {
    mkdirSync('dist/platforms/opencode/agents', { recursive: true });
    for (const f of readdirSync('/tmp/canonical-dist-openode')) {
      const content = readFileSync(`/tmp/canonical-dist-openode/${f}`);
      Bun.write(`dist/platforms/opencode/agents/${f}`, content);
    }
  }
});

describe('build command', () => {
  it('should create dist/platforms/opencode/agents/ with 5 files', async () => {
    const result = await $`bun run ${CLI_ENTRY} build --target=opencode`.quiet();
    expect(result.exitCode).toBe(0);

    const agentsDir = 'dist/platforms/opencode/agents';
    expect(existsSync(agentsDir)).toBe(true);

    const files = readdirSync(agentsDir);
    expect(files.length).toBeGreaterThanOrEqual(5);
    expect(files).toContain('Nova Agent Squad.md');
    expect(files).toContain('nas_developer.md');
    expect(files).toContain('nas_qa.md');
    expect(files).toContain('nas_researcher.md');
    expect(files).toContain('nas_planner.md');
  });

  it('should inject caveman content into nas_developer.md', async () => {
    const result = await $`bun run ${CLI_ENTRY} build --target=opencode`.quiet();
    expect(result.exitCode).toBe(0);

    const devContent = readFileSync('dist/platforms/opencode/agents/nas_developer.md', 'utf-8');
    expect(devContent).toContain('## Developer');
    expect(devContent).toContain('## Preserve exactly');
    expect(devContent).not.toContain('INJECT:caveman');
  });

  it('should inject caveman content into nas_qa.md', async () => {
    const result = await $`bun run ${CLI_ENTRY} build --target=opencode`.quiet();
    expect(result.exitCode).toBe(0);

    const qaContent = readFileSync('dist/platforms/opencode/agents/nas_qa.md', 'utf-8');
    expect(qaContent).toContain('## QA');
    expect(qaContent).not.toContain('## Developer');
    expect(qaContent).not.toContain('INJECT:caveman');
  });

  it('should build file-based platform target', async () => {
    const result = await $`bun run ${CLI_ENTRY} build --target=cursor`.quiet();
    expect(result.exitCode).toBe(0);

    expect(existsSync('dist/platforms/cursor/AGENTS.md')).toBe(true);
  });

  it('should fail for unknown target', async () => {
    let exitCode = 0;
    try {
      await $`bun run ${CLI_ENTRY} build --target=nonexistent`.quiet();
    } catch (e: any) {
      exitCode = e.exitCode;
    }
    expect(exitCode).not.toBe(0);
  });

  it('should build output byte-identical to old make build', async () => {
    // Build with new CLI
    const result = await $`bun run ${CLI_ENTRY} build --target=opencode`.quiet();
    expect(result.exitCode).toBe(0);

    // Compare each file
    const files = ['Nova Agent Squad.md', 'nas_developer.md', 'nas_qa.md', 'nas_researcher.md', 'nas_planner.md'];
    for (const file of files) {
      const newContent = readFileSync(`dist/platforms/opencode/agents/${file}`, 'utf-8');
      const canonicalContent = readFileSync(`/tmp/canonical-dist-openode/${file}`, 'utf-8');
      expect(newContent).toBe(canonicalContent);
    }
  });
});
