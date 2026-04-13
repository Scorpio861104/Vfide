import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const mockCopy = jest.fn();
const mockWindowOpen = jest.fn();

let mockAddress: `0x${string}` | undefined;

const renderInvitePage = () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const pageModule = require('../../app/invite/page');
	const InvitePage = pageModule.default as React.ComponentType;
	return render(<InvitePage />);
};

jest.mock('wagmi', () => ({
	useAccount: () => ({ address: mockAddress }),
}));

jest.mock('@/lib/hooks/useCopyToClipboard', () => ({
	useCopyToClipboard: () => ({ copied: false, copy: mockCopy }),
}));

jest.mock('framer-motion', () => {
	const motion = new Proxy(
		{},
		{
			get: (_target, prop: string) => {
				if (prop === 'button') {
					return ({ children, ...props }: any) => <button {...props}>{children}</button>;
				}
				return ({ children, ...props }: any) => <div {...props}>{children}</div>;
			},
		}
	);

	return { motion };
});

jest.mock('lucide-react', () => {
	const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
	return {
		Copy: Icon,
		Check: Icon,
		Mail: Icon,
		MessageCircle: Icon,
		X: Icon,
		Share2: Icon,
		Users: Icon,
		Trophy: Icon,
		Zap: Icon,
		QrCode: Icon,
	};
});

describe('Invite page logic pathways', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
		Object.defineProperty(window, 'open', {
			writable: true,
			value: mockWindowOpen,
		});
	});

	it('renders a wallet-derived invite link and supports copy action', () => {
		renderInvitePage();

		expect(screen.getByText(/https:\/\/vfide.io\/invite\/0xaaaaaa/i)).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: /copy/i }));
		expect(mockCopy).toHaveBeenCalledWith('https://vfide.io/invite/0xaaaaaa');
	});

	it('opens social share URLs for configured channels', () => {
		renderInvitePage();

		fireEvent.click(screen.getByRole('button', { name: /email/i }));
		fireEvent.click(screen.getByRole('button', { name: /twitter/i }));
		fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }));

		expect(mockWindowOpen).toHaveBeenCalledTimes(3);
		expect(mockWindowOpen.mock.calls[0][0]).toContain('mailto:?subject=Join%20me%20on%20VFIDE!');
		expect(mockWindowOpen.mock.calls[1][0]).toContain('twitter.com/intent/tweet');
		expect(mockWindowOpen.mock.calls[2][0]).toContain('wa.me/?text=');
	});
});
