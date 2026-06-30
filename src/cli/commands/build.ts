import { defineCommand } from 'citty';
import { parseManifest, type ManifestEntry } from '../lib/manifest';
import { Eta } from 'eta';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';

const eta = new Eta({ autoTrim: false });

function rmrf(path: string): void {
  if (!path) return;
  try {
    rmSync(path, { recursive: true, force: true });
  } catch {
    // ignore - dir may not exist
  }
}

function getCavemanContent(agent: 'developer' | 'qa'): string {
  const templatePath = `${import.meta.dir}/../templates/nas_caveman.eta`;
  const template = readFileSync(templatePath, 'utf-8');
  return eta.renderString(template, { agent });
}

function getDeveloperSharedContent(agent: 'developer' | 'developer_mini', section: string): string {
  const templatePath = `${import.meta.dir}/../templates/nas_developer_shared.eta`;
  const template = readFileSync(templatePath, 'utf-8');
  return eta.renderString(template, { agent, section });
}

function detectDeveloperAgent(sourceFile: string): 'developer' | 'developer_mini' | null {
  const fileName = sourceFile.split('/').pop();
  if (fileName === 'nas_developer.md') return 'developer';
  if (fileName === 'nas_developer_mini.md') return 'developer_mini';
  return null;
}

function processAgentFile(sourceFile: string, destFile: string): void {
  let content = readFileSync(sourceFile, 'utf-8');
  const devAgent = detectDeveloperAgent(sourceFile);

  // Check for caveman INJECT markers
  if (content.includes('INJECT:caveman_developer')) {
    const cavemanContent = getCavemanContent('developer');
    content = content.replace(`<!-- INJECT:caveman_developer -->\n`, cavemanContent);
  } else if (content.includes('INJECT:caveman_qa')) {
    const cavemanContent = getCavemanContent('qa');
    content = content.replace(`<!-- INJECT:caveman_qa -->\n`, cavemanContent);
  }

  // Check for developer shared INJECT markers
  if (devAgent && content.includes('INJECT:developer_shared')) {
    const markerPattern = /<!-- INJECT:developer_shared_(\w+) -->\n/g;
    content = content.replace(markerPattern, (_match, section) => {
      return getDeveloperSharedContent(devAgent, section);
    });
  }

  writeFileSync(destFile, content);
}

function buildDirEntry(entry: ManifestEntry): void {
  const sourceDir = entry.source;
  const destDir = `dist/${entry.distPath}`;

  mkdirSync(destDir, { recursive: true });

  const files = readdirSync(sourceDir);
  for (const file of files) {
    const srcPath = `${sourceDir}/${file}`;
    const destPath = `${destDir}/${file}`;
    processAgentFile(srcPath, destPath);
  }

  console.log(`Built target: ${entry.target} -> dist/${entry.distPath}`);
}

function buildFileEntry(entry: ManifestEntry): void {
  const destPath = `dist/${entry.distPath}`;
  mkdirSync(destPath.substring(0, destPath.lastIndexOf('/')), { recursive: true });
  const content = readFileSync(entry.source);
  writeFileSync(destPath, content);
  console.log(`Built target: ${entry.target} -> dist/${entry.distPath}`);
}

export const buildCommand = defineCommand({
  meta: {
    name: 'build',
    description: 'Build agent files for distribution',
  },
  args: {
    target: {
      type: 'string',
      description: 'Target platform to build (builds all if omitted)',
    },
  },
  async run({ args }) {
    const entries = parseManifest();
    const target = args.target as string | undefined;

    // Clean dist for target(s) before building
    if (target) {
      rmrf(`dist/platforms/${target}`);
    }

    let found = false;
    for (const entry of entries) {
      if (target && entry.target !== target) continue;
      found = true;

      if (entry.kind === 'dir') {
        buildDirEntry(entry);
      } else {
        buildFileEntry(entry);
      }
    }

    if (!found) {
      console.error(`ERROR: unknown TARGET '${target}'`);
      process.exit(1);
    }
  },
});
