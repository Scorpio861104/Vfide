import { describe, expect, it } from '@jest/globals';

describe('public route metadata coverage', () => {
  it('exports support route metadata', async () => {
    const { metadata } = await import('../../app/support/layout');

    expect(String(metadata.title)).toMatch(/Support Center/);
    expect(String(metadata.description)).toMatch(/support center/i);
    expect(String(metadata.alternates?.canonical)).toContain('/support');
  });

  it('exports social hub metadata', async () => {
    const { metadata } = await import('../../app/social-messaging/layout');

    expect(String(metadata.title)).toMatch(/Social Hub/);
    expect(String(metadata.description)).toMatch(/encrypted messaging|social hub/i);
    expect(String(metadata.alternates?.canonical)).toContain('/social-messaging');
  });

  it('exports marketplace metadata', async () => {
    const { metadata } = await import('../../app/marketplace/layout');

    expect(String(metadata.title)).toMatch(/Marketplace/);
    expect(String(metadata.description)).toMatch(/marketplace|commerce/i);
    expect(String(metadata.alternates?.canonical)).toContain('/marketplace');
  });

  it('exports seer service metadata', async () => {
    const { metadata } = await import('../../app/seer-service/layout');

    expect(String(metadata.title)).toMatch(/Seer/);
    expect(String(metadata.description)).toMatch(/safety|insights|telemetry/i);
    expect(String(metadata.alternates?.canonical)).toContain('/seer-service');
  });
});
