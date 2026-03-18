import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockIsConnected = true;

const mockWriteText = jest.fn();

const renderHeadhunterPage = () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const pageModule = require('../../app/headhunter/page');
	const HeadhunterPage = pageModule.default as React.ComponentType;
	return render(<HeadhunterPage />);
};

jest.mock('wagmi', () => ({
	useAccount: () => ({
		address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
		isConnected: mockIsConnected,
	}),
}));

jest.mock('@/hooks/useHeadhunterHooks', () => ({
	useHeadhunterStats: () => ({
		currentYearPoints: 42,
		estimatedRank: 8,
		quarterEndsAt: BigInt(Math.floor(Date.now() / 1000) + 10 * 24 * 60 * 60),
		currentYearNumber: 2026,
		currentQuarterNumber: 1,
	}),
	useReferralLink: () => ({
		referralLink: 'https://vfide.io/invite/0xaaaaaa',
		qrCodeUrl: 'https://vfide.io/qr/0xaaaaaa',
	}),
	useLeaderboard: () => ({
		leaderboard: [
			{
				rank: 1,
				isCurrentUser: true,
				address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
				points: 99,
				userReferrals: 10,
				merchantReferrals: 5,
			},
		],
		isLoading: false,
	}),
	useReferralActivity: () => ({
		activity: [
			{
				id: 'act-1',
				type: 'user',
				status: 'credited',
				points: 1,
				address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
				timestamp: new Date().toISOString(),
			},
		],
		isLoading: false,
	}),
}));

jest.mock('lucide-react', () => {
	const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
	return {
		Trophy: Icon,
		Users: Icon,
		TrendingUp: Icon,
		Copy: Icon,
		Check: Icon,
		Award: Icon,
		Target: Icon,
		Crown: Icon,
		Share2: Icon,
		MessageCircle: Icon,
		Mail: Icon,
		Twitter: Icon,
	};
});

describe('Headhunter page logic pathways', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockIsConnected = true;
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText: mockWriteText },
			configurable: true,
		});
	});

	it('shows wallet gate when disconnected', () => {
		mockIsConnected = false;
		renderHeadhunterPage();

		expect(screen.getByRole('heading', { name: /Headhunter Competition/i })).toBeTruthy();
		expect(screen.getByText(/Connect your wallet to participate/i)).toBeTruthy();
	});

	it('renders connected dashboard and copies referral link', () => {
		renderHeadhunterPage();

		expect(screen.getByRole('heading', { name: /Headhunter Competition/i })).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: /copy/i }));
		expect(mockWriteText).toHaveBeenCalledWith('https://vfide.io/invite/0xaaaaaa');
	});

	it('switches between leaderboard and activity tabs', () => {
		renderHeadhunterPage();

		fireEvent.click(screen.getByRole('button', { name: /Leaderboard/i }));
		expect(screen.getByText(/Showing top 20 headhunters/i)).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: /Activity/i }));
		expect(screen.getByText(/Referral Activity/i)).toBeTruthy();
	});
});
