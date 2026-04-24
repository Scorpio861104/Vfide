import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const renderDeveloperPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/developer/page');
  const DeveloperPage = pageModule.default as React.ComponentType;
  return render(<DeveloperPage />);
};

describe('Developer page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders integration center header and access links', () => {
    renderDeveloperPage();

    expect(screen.getByRole('heading', { name: /Integrations Center/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Access & Safety/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Open Merchant Portal/i }).getAttribute('href')).toBe('/merchant');
    expect(screen.getByRole('link', { name: /Review Security Center/i }).getAttribute('href')).toBe('/security-center');
  });

  it('switches to webhooks tab and shows merchant webhook guidance', () => {
    renderDeveloperPage();

    fireEvent.click(screen.getByRole('button', { name: /webhooks/i }));

    expect(screen.getByRole('heading', { name: /Merchant Webhook Setup/i })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /Open Merchant Portal/i })[1]?.getAttribute('href')).toBe('/merchant');
    expect(screen.getByText(/GET \/api\/merchant\/webhooks/i)).toBeTruthy();
    expect(screen.getAllByText(/X-Webhook-Signature/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/A payment was confirmed on-chain/i)).toBeTruthy();
  });

  it('switches to api tab and displays endpoint + rate limit info', () => {
    renderDeveloperPage();

    fireEvent.click(screen.getByRole('button', { name: /^api$/i }));

    expect(screen.getByRole('heading', { name: /REST API Endpoints/i })).toBeTruthy();
    expect(screen.getByText('/v1/payments')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Rate Limits/i })).toBeTruthy();
    expect(screen.getByText(/Requests\/minute \(test\)/i)).toBeTruthy();
  });
});
