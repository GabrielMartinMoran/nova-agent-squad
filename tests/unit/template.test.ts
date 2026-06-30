import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'fs';

/**
 * Read the canonical sed output for comparison.
 * The old make build output is stored at /tmp/canonical-dist-openode/
 */
function getCanonicalOutput(agent: 'developer' | 'qa'): string {
  const file = agent === 'developer' ? 'nas_developer.md' : 'nas_qa.md';
  return readFileSync(`/tmp/canonical-dist-openode/${file}`, 'utf-8');
}

describe('nas_caveman.eta template', () => {
  it('should render developer section for agent=developer', async () => {
    const template = readFileSync('src/cli/templates/nas_caveman.eta', 'utf-8');
    const { Eta } = await import('eta');
    const eta = new Eta({ autoTrim: false });
    const result = eta.renderString(template, { agent: 'developer' });
    expect(result).toContain('## Developer');
    expect(result).toContain('## Preserve exactly');
  });

  it('should render QA section for agent=qa', async () => {
    const template = readFileSync('src/cli/templates/nas_caveman.eta', 'utf-8');
    const { Eta } = await import('eta');
    const eta = new Eta({ autoTrim: false });
    const result = eta.renderString(template, { agent: 'qa' });
    expect(result).toContain('## QA');
    expect(result).not.toContain('## Developer');
    expect(result).toContain('## Preserve exactly');
  });

  it('should render shared section for both agents', async () => {
    const template = readFileSync('src/cli/templates/nas_caveman.eta', 'utf-8');
    const { Eta } = await import('eta');
    const eta = new Eta({ autoTrim: false });
    const devResult = eta.renderString(template, { agent: 'developer' });
    const qaResult = eta.renderString(template, { agent: 'qa' });

    expect(devResult).toContain('# NAS Caveman Reference');
    expect(qaResult).toContain('# NAS Caveman Reference');
    expect(devResult).toContain('## Preserve exactly');
    expect(qaResult).toContain('## Preserve exactly');
    expect(devResult).toContain('## Auto-clarity');
    expect(qaResult).toContain('## Auto-clarity');
  });

  it('should produce developer output byte-identical to old sed pipeline', async () => {
    const template = readFileSync('src/cli/templates/nas_caveman.eta', 'utf-8');
    const { Eta } = await import('eta');
    const eta = new Eta({ autoTrim: false });
    const result = eta.renderString(template, { agent: 'developer' });

    const canonical = getCanonicalOutput('developer');
    // Extract the caveman section from canonical (after "### Caveman reference (mandatory)")
    const cavemanStart = canonical.indexOf('# NAS Caveman Reference');
    expect(cavemanStart).toBeGreaterThan(-1);

    // Find where the caveman section ends (next "##" or "###" after caveman content)
    const afterCaveman = canonical.indexOf('### Memory', cavemanStart);
    const canonicalCaveman = canonical.substring(cavemanStart, afterCaveman).trimEnd();

    expect(result.trimEnd()).toBe(canonicalCaveman);
  });

  it('should produce QA output byte-identical to old sed pipeline', async () => {
    const template = readFileSync('src/cli/templates/nas_caveman.eta', 'utf-8');
    const { Eta } = await import('eta');
    const eta = new Eta({ autoTrim: false });
    const result = eta.renderString(template, { agent: 'qa' });

    const canonical = getCanonicalOutput('qa');
    const cavemanStart = canonical.indexOf('# NAS Caveman Reference');
    expect(cavemanStart).toBeGreaterThan(-1);

    const afterCaveman = canonical.indexOf('### Memory', cavemanStart);
    const canonicalCaveman = canonical.substring(cavemanStart, afterCaveman).trimEnd();

    expect(result.trimEnd()).toBe(canonicalCaveman);
  });
});

describe('nas_developer_shared.eta template', () => {
  const canonicalDeveloper = readFileSync('/tmp/canonical-dist-openode/nas_developer.md', 'utf-8');
  const canonicalDeveloperMini = readFileSync('/tmp/canonical-dist-openode/nas_developer_mini.md', 'utf-8');

  function renderSection(section: string, agent: 'developer' | 'developer_mini'): string {
    const template = readFileSync('src/cli/templates/nas_developer_shared.eta', 'utf-8');
    // Dynamic import for ESM compatibility
    const etaModule = require('eta');
    const eta = new etaModule.Eta({ autoTrim: false });
    return eta.renderString(template, { agent, section });
  }

  function getCanonicalSection(canonical: string, heading: string, nextHeading: string): string {
    const start = canonical.indexOf(heading);
    if (start === -1) return '';
    const afterStart = start + heading.length;
    const end = canonical.indexOf(nextHeading, afterStart);
    if (end === -1) return canonical.substring(start);
    return canonical.substring(start, end).trimEnd();
  }

  it('constraints section: renders developer constraints matching canonical output', async () => {
    const { Eta } = await import('eta');
    const eta = new Eta({ autoTrim: false });
    const template = readFileSync('src/cli/templates/nas_developer_shared.eta', 'utf-8');
    const result = eta.renderString(template, { agent: 'developer', section: 'constraints' });

    const canonicalSection = getCanonicalSection(
      canonicalDeveloper,
      '## HARD CONSTRAINTS (never violate)\n',
      '\n<default_to_action>'
    );
    expect(result.trimEnd()).toBe(canonicalSection);
  });

  it('constraints section: renders developer_mini constraints with extra item 9', async () => {
    const { Eta } = await import('eta');
    const eta = new Eta({ autoTrim: false });
    const template = readFileSync('src/cli/templates/nas_developer_shared.eta', 'utf-8');
    const result = eta.renderString(template, { agent: 'developer_mini', section: 'constraints' });

    // Mini has item 9 about ambiguity escalation
    expect(result).toContain('9. If you encounter ANY ambiguity, unclear requirement, or missing information: ESCALATE with BLOCKED + `question_for_user`.');
    // Mini's item 1 has "Nothing more" appended
    expect(result).toContain('1. ONLY implement what is in the approved apply contract. Nothing more.');
  });

  it('tool_guidance section: renders developer tool guidance matching canonical output', async () => {
    const { Eta } = await import('eta');
    const eta = new Eta({ autoTrim: false });
    const template = readFileSync('src/cli/templates/nas_developer_shared.eta', 'utf-8');
    const result = eta.renderString(template, { agent: 'developer', section: 'tool_guidance' });

    const canonicalSection = getCanonicalSection(
      canonicalDeveloper,
      '## Tool Guidance\n',
      '## Runtime config'
    );
    expect(result.trimEnd()).toBe(canonicalSection.trimEnd());
  });

  it('tool_guidance section: renders developer_mini tool guidance', async () => {
    const { Eta } = await import('eta');
    const eta = new Eta({ autoTrim: false });
    const template = readFileSync('src/cli/templates/nas_developer_shared.eta', 'utf-8');
    const result = eta.renderString(template, { agent: 'developer_mini', section: 'tool_guidance' });

    // Mini uses 'bun test' not 'make test'
    expect(result).toContain('`bun test`');
    expect(result).not.toContain('`make test`');
    // Mini has shorter descriptions
    expect(result).toContain('Read existing files to understand structure');
  });

  it('output_format section: renders developer output format matching canonical output', async () => {
    const { Eta } = await import('eta');
    const eta = new Eta({ autoTrim: false });
    const template = readFileSync('src/cli/templates/nas_developer_shared.eta', 'utf-8');
    const result = eta.renderString(template, { agent: 'developer', section: 'output_format' });

    const canonicalSection = getCanonicalSection(
      canonicalDeveloper,
      '## Output format\n',
      '## Few-Shot Example'
    );
    expect(result.trimEnd()).toBe(canonicalSection.trimEnd());
  });

  it('output_format section: renders developer_mini output format with different heading', async () => {
    const { Eta } = await import('eta');
    const eta = new Eta({ autoTrim: false });
    const template = readFileSync('src/cli/templates/nas_developer_shared.eta', 'utf-8');
    const result = eta.renderString(template, { agent: 'developer_mini', section: 'output_format' });

    // Mini has the extra parenthetical in the heading
    expect(result).toContain('## Output format (same contract as full developer for uniform QA validation)');
    expect(result).toContain('<implementation_report>');
  });

  it('handoff section: renders identically for both agents', async () => {
    const { Eta } = await import('eta');
    const eta = new Eta({ autoTrim: false });
    const template = readFileSync('src/cli/templates/nas_developer_shared.eta', 'utf-8');
    const devResult = eta.renderString(template, { agent: 'developer', section: 'handoff' });
    const miniResult = eta.renderString(template, { agent: 'developer_mini', section: 'handoff' });

    expect(devResult.trimEnd()).toBe(miniResult.trimEnd());
    expect(devResult).toContain('## Handoff');
    expect(devResult).toContain('If blocked, at risk, or insufficient progress:');
  });
});
