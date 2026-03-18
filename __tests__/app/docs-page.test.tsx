import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const renderDocsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/docs/page');
  const DocsPage = pageModule.default as React.ComponentType;
  return render(<DocsPage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/modals/LessonModal', () => ({
  __esModule: true,
  default: ({ isOpen, lesson }: { isOpen: boolean; lesson?: { title?: string } }) =>
    isOpen ? <div>Lesson Modal: {lesson?.title ?? 'Unknown'}</div> : null,
}));

jest.mock('@/data/lessonContent', () => ({
  lessonContentData: {
    'What is VFIDE?': { title: 'What is VFIDE?' },
    'Your First Wallet': { title: 'Your First Wallet' },
  },
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Docs page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders documentation overview with section links', () => {
    renderDocsPage();

    expect(screen.getByRole('heading', { name: /Documentation & Help/i })).toBeTruthy();
    expect(screen.getByText(/Getting Started/i)).toBeTruthy();
    expect(screen.getByText(/Core Concepts/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Connect Your Wallet/i }).getAttribute('href')).toBe('/dashboard');
  });

  it('switches to FAQ tab and filters questions via search', () => {
    renderDocsPage();

    fireEvent.click(screen.getByRole('button', { name: /FAQ/i }));
    const search = screen.getByPlaceholderText(/Search FAQ/i);
    fireEvent.change(search, { target: { value: 'ProofScore' } });

    expect(screen.getAllByText(/ProofScore/i).length).toBeGreaterThan(0);
  });

  it('opens lesson modal from Learn tab card interaction', () => {
    renderDocsPage();

    fireEvent.click(screen.getByRole('button', { name: /Learn/i }));
    fireEvent.click(screen.getByText('What is VFIDE?'));

    expect(screen.getByText(/Lesson Modal: What is VFIDE\?/i)).toBeTruthy();
  });
});