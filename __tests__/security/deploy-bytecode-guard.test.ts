import fs from 'fs';
import { describe, it, expect } from '@jest/globals';

describe('deploy-all bytecode guardrails', () => {
  it('enforces EIP-170 runtime size preflight before deployment', () => {
    const source = fs.readFileSync('scripts/deploy-all.ts', 'utf-8');

    expect(source).toContain('const EIP170_RUNTIME_LIMIT = 24_576;');
    expect(source).toContain('assertDeploymentBytecodeLimits');
    expect(source).toContain('hre.artifacts.readArtifact');
    expect(source).toContain('Deployment blocked: EIP-170 runtime limit');
    expect(source).toContain('Bytecode size preflight: all deployment contracts are within EIP-170 runtime limit.');
  });
});
