import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderCrossChainPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/cross-chain/page');
  const CrossChainPage = pageModule.default as React.ComponentType;
  return render(<CrossChainPage />);
};

jest.mock('@/components/CrossChainTransfer', () => ({
  __esModule: true,
  default: () => <div>CrossChain Transfer Widget</div>,
}));

describe('Cross-chain page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders sr-only route heading and transfer widget', () => {
    renderCrossChainPage();

    expect(screen.getByRole('heading', { name: /Cross-Chain Transfer/i })).toBeTruthy();
    expect(screen.getByText(/CrossChain Transfer Widget/i)).toBeTruthy();
  });
});
