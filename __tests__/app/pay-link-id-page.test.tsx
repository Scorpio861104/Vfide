import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/app/pay/link/[id]/components/PayLinkContent', () => ({
  PayLinkContent: ({ linkId }: { linkId: string }) => <div data-testid="pay-link-content">Link {linkId}</div>,
}));

describe('Pay link detail route', () => {
  it('passes route id into PayLinkContent and renders footer', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pageModule = require('../../app/pay/link/[id]/page');
    const PayLinkPage = pageModule.default;

    const element = await (PayLinkPage as any)({ params: Promise.resolve({ id: 'plink_123' }) });
    render(element);

    expect(screen.getByTestId('pay-link-content')).toHaveTextContent('Link plink_123');
    expect(screen.getByTestId('footer')).toBeTruthy();
  });
});
