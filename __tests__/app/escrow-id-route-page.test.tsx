import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const loadEscrowPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../../app/escrow/[id]/page') as {
    default: (props: any) => Promise<React.ReactElement>;
  };
};

jest.mock('../../app/escrow/[id]/components/EscrowDetailContent', () => ({
  EscrowDetailContent: ({ id }: { id: string }) => <div>Escrow content {id}</div>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

describe('Escrow id route', () => {
  it('renders escrow detail content with route param id', async () => {
    const { default: EscrowPage } = loadEscrowPage();

    const element = await EscrowPage({ params: Promise.resolve({ id: '42' }) });
    render(element);

    expect(screen.getByText(/Escrow content 42/i)).toBeTruthy();
    expect(screen.getByTestId('footer')).toBeTruthy();
  });
});
