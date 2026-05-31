import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const loadEmbedPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../../app/(commerce)/embed/[slug]/page') as {
    default: (props: any) => Promise<React.ReactElement>;
  };
};

describe('Embed store slug route', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
  });

  it('renders not-found state when merchant is missing', async () => {
    const { default: EmbedPage } = loadEmbedPage();

    const element = await EmbedPage({
      params: Promise.resolve({ slug: 'missing-store' }),
      searchParams: Promise.resolve({ theme: 'dark', cols: '2', max: '12' }),
    });

    render(element);

    expect(screen.getByText(/Store not found/i)).toBeTruthy();
  });
});
