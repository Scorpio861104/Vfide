import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const repoRoot = process.cwd();
const baseTsconfigPath = path.join(repoRoot, 'tsconfig.json');
const baseConfig = JSON.parse(readFileSync(baseTsconfigPath, 'utf8'));

const tempRoot = path.join(repoRoot, '.typecheck-temp');
rmSync(tempRoot, { recursive: true, force: true });
mkdirSync(tempRoot, { recursive: true });
const tempDir = mkdtempSync(path.join(tempRoot, 'shard-'));

const commonIncludes = [
  'next-env.d.ts',
  'jest.d.ts',
  'next.config.ts',
  'proxy.ts',
  'instrumentation.ts',
  'instrumentation-client.ts',
  'sentry.edge.config.ts',
  'sentry.server.config.ts',
  '.next/types/**/*.ts',
  'data/**/*.ts',
  'data/**/*.tsx',
  'hooks/**/*.ts',
  'hooks/**/*.tsx',
  'providers/**/*.ts',
  'providers/**/*.tsx',
  'public/**/*.ts',
  'public/**/*.tsx',
  'types/**/*.d.ts',
  'types/**/*.ts',
  'types/**/*.tsx',
  'app/components/**/*.ts',
  'app/components/**/*.tsx',
];

function chunk(values, size) {
  const groups = [];
  for (let index = 0; index < values.length; index += size) {
    groups.push(values.slice(index, index + size));
  }
  return groups;
}

function listChildDirectories(relativeDir) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  return readdirSync(absoluteDir)
    .filter((entry) => statSync(path.join(absoluteDir, entry)).isDirectory())
    .sort((left, right) => left.localeCompare(right));
}

function listDirectTypeScriptFiles(relativeDir) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  return readdirSync(absoluteDir)
    .filter((entry) => statSync(path.join(absoluteDir, entry)).isFile())
    .filter((entry) => entry.endsWith('.ts') || entry.endsWith('.tsx') || entry.endsWith('.d.ts'))
    .map((entry) => `${relativeDir}/${entry}`)
    .sort((left, right) => left.localeCompare(right));
}

function directoryGlobs(baseDir, entries) {
  return entries.flatMap((entry) => [`${baseDir}/${entry}/**/*.ts`, `${baseDir}/${entry}/**/*.tsx`, `${baseDir}/${entry}/**/*.d.ts`]);
}

function absolutizePattern(pattern) {
  return path.join(repoRoot, pattern);
}

const shards = [];

const appDirectories = listChildDirectories('app').filter((entry) => entry !== 'components');
const appChunks = chunk(appDirectories, 12);
appChunks.forEach((entries, index) => {
  const includes = [...commonIncludes, ...directoryGlobs('app', entries)];
  if (index === 0) {
    includes.push(...listDirectTypeScriptFiles('app'));
  }

  shards.push({
    name: `app-${String(index + 1).padStart(2, '0')}`,
    includes,
  });
});

const componentDirectories = listChildDirectories('components');
const componentChunks = chunk(componentDirectories, 16);
componentChunks.forEach((entries, index) => {
  const includes = [...commonIncludes, ...directoryGlobs('components', entries)];
  if (index === 0) {
    includes.push(...listDirectTypeScriptFiles('components'));
  }

  shards.push({
    name: `components-${String(index + 1).padStart(2, '0')}`,
    includes,
  });
});

const libDirectories = listChildDirectories('lib');
const libChunks = chunk(libDirectories, 16);
libChunks.forEach((entries, index) => {
  const includes = [...commonIncludes, ...directoryGlobs('lib', entries)];
  if (index === 0) {
    includes.push(...listDirectTypeScriptFiles('lib'));
  }

  shards.push({
    name: `lib-${String(index + 1).padStart(2, '0')}`,
    includes,
  });
});

async function runCommand(command, args) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`Command terminated by ${signal}`));
        return;
      }

      resolve(code ?? 1);
    });
  });
}

async function main() {
  console.log(`[typecheck] running ${shards.length} shard(s)`);

  for (const [index, shard] of shards.entries()) {
    const shardConfigPath = path.join(tempDir, `${shard.name}.json`);
    const shardConfig = {
      ...baseConfig,
      compilerOptions: {
        ...baseConfig.compilerOptions,
        baseUrl: repoRoot,
        ignoreDeprecations: '6.0',
        incremental: false,
        tsBuildInfoFile: path.join(tempDir, `${shard.name}.tsbuildinfo`),
      },
      include: shard.includes.map(absolutizePattern),
      exclude: (baseConfig.exclude ?? []).map(absolutizePattern),
    };

    writeFileSync(shardConfigPath, `${JSON.stringify(shardConfig, null, 2)}\n`);
    console.log(`[typecheck] shard ${index + 1}/${shards.length}: ${shard.name}`);

    const exitCode = await runCommand('node', [
      'scripts/typecheck-with-heartbeat.mjs',
      '-p',
      shardConfigPath,
      '--noEmit',
      '--incremental',
      'false',
    ]);

    if (exitCode !== 0) {
      process.exit(exitCode);
    }
  }
}

main()
  .catch((error) => {
    console.error('[typecheck] shard run failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  })
  .finally(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });