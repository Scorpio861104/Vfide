import React from 'react';
import '@testing-library/jest-dom';

// Mock next/navigation with a redirect spy
const redirectMock = jest.fn(() => { throw new Error('NEXT_REDIRECT'); });

jest.mock('next/navigation', () => ({
  redirect: (...args: any[]) => redirectMock(...args),
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() })),
  usePathname: jest.fn(() => '/dao-hub'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useParams: jest.fn(() => ({})),
  useSelectedLayoutSegment: jest.fn(() => null),
  useSelectedLayoutSegments: jest.fn(() => []),
}));

describe('DaoHubPage', () => {
  it('redirects /dao-hub to /governance?tab=dao', () => {
    jest.isolateModules(() => {
      jest.mock('next/navigation', () => ({
        redirect: (...args: any[]) => redirectMock(...args),
      }));
      const pageModule = require('../page');
      const DaoHubPage = pageModule.default as React.ComponentType;
      expect(() => DaoHubPage({})).toThrow('NEXT_REDIRECT');
    });
    expect(redirectMock).toHaveBeenCalledWith('/governance?tab=dao');
  });
});
