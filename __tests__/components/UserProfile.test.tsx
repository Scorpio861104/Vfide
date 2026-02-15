/**
 * Comprehensive test suite for UserProfile component
 * Tests profile display, editing, badges, activity, privacy settings, and validation
 */

import React from 'react';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserProfile from '@/components/profile/UserProfile';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onClick, ...props }: any) => (
      <div className={className} style={style} onClick={onClick} {...props}>{children}</div>
    ),
    button: ({ children, className, style, onClick, disabled, ...props }: any) => (
      <button className={className} style={style} onClick={onClick} disabled={disabled} {...props}>{children}</button>
    ),
    span: ({ children, className, style, ...props }: any) => (
      <span className={className} style={style} {...props}>{children}</span>
    ),
    p: ({ children, className, style, ...props }: any) => (
      <p className={className} style={style} {...props}>{children}</p>
    ),
    img: ({ src, alt, className, ...props }: any) => (
      <img src={src} alt={alt} className={className} {...props} />
    ),
    a: ({ children, className, style, href, target, rel, ...props }: any) => (
      <a className={className} style={style} href={href} target={target} rel={rel} {...props}>{children}</a>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useMotionValue: () => ({ get: () => 0, set: jest.fn(), on: () => () => {} }),
  useTransform: () => ({ get: () => 0, on: () => () => {} }),
  animate: jest.fn(() => ({ stop: jest.fn() })),
}));

jest.mock('@/hooks/useTransactionSounds', () => ({
  useTransactionSounds: () => ({ playSuccess: jest.fn(), playNotification: jest.fn(), play: jest.fn() }),
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  }),
}));

jest.mock('@/hooks/useAPI', () => ({
  useUserProfile: () => ({
    profile: {
      address: '0x1234567890123456789012345678901234567890',
      username: 'johndoe',
      displayName: 'John Doe',
      email: 'john@example.com',
      bio: 'Blockchain enthusiast',
      avatar: '👤',
      createdAt: new Date().toISOString(),
      location: 'San Francisco, CA',
      website: 'https://example.com',
      twitter: 'johndoe',
      github: 'johndoe',
    },
    updateProfile: jest.fn(),
    uploadAvatar: jest.fn(),
    isLoading: false,
    error: null,
  }),
}));

beforeEach(() => {
  global.fetch = jest.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url.includes('/api/badges')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          badges: [
            {
              badge_id: 1,
              badge_name: 'PIONEER',
              badge_description: 'First supporters',
              badge_icon: '🏁',
              badge_rarity: 'legendary',
              earned_at: new Date().toISOString(),
            },
          ],
        }),
      } as Response);
    }

    if (url.includes('/api/activities')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          activities: [
            {
              id: 1,
              activity_type: 'transaction',
              title: 'Sent payment',
              created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            },
          ],
        }),
      } as Response);
    }

    if (url.includes('/api/users/privacy')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ settings: {} }),
      } as Response);
    }

    return Promise.resolve({
      ok: true,
      json: async () => ({}),
    } as Response);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  jest.resetAllMocks();
});

// ==================== COMPONENT RENDERING TESTS ====================

describe('UserProfile - Component Rendering', () => {
  test('renders main heading and description', () => {
    render(<UserProfile />);
    expect(screen.getByText(/User Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/Manage your profile and settings/i)).toBeInTheDocument();
  });

  test('renders all tab buttons', () => {
    render(<UserProfile />);
    expect(screen.getByRole('button', { name: /👤 Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /🏆 Badges/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /📊 Activity/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /⚙️ Settings/i })).toBeInTheDocument();
  });

  test('renders with overview tab active by default', () => {
    render(<UserProfile />);
    const overviewTab = screen.getByRole('button', { name: /👤 Overview/i });
    expect(overviewTab).toHaveClass('text-amber-400');
  });

  test('displays badge count in badges tab button', () => {
    render(<UserProfile />);
    const badgesTab = screen.getByRole('button', { name: /🏆 Badges/i });
    expect(badgesTab.textContent).toMatch(/\(\d+\)/);
  });
});

// ==================== PROFILE DISPLAY TESTS ====================

describe('UserProfile - Profile Display', () => {
  test('displays user avatar', () => {
    render(<UserProfile />);
    expect(screen.getByText('👤')).toBeInTheDocument();
  });

  test('displays user display name', () => {
    render(<UserProfile />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  test('displays username with @ symbol', () => {
    render(<UserProfile />);
    expect(screen.getAllByText(/@johndoe/i).length).toBeGreaterThan(0);
  });

  test('displays user bio', () => {
    render(<UserProfile />);
    expect(screen.getByText(/Blockchain enthusiast/i)).toBeInTheDocument();
  });

  test('displays joined date', () => {
    render(<UserProfile />);
    expect(screen.getAllByText(/Joined/i).length).toBeGreaterThan(0);
  });

  test('displays location when available', () => {
    render(<UserProfile />);
    expect(screen.getByText(/San Francisco, CA/i)).toBeInTheDocument();
  });

  test('displays social links when available', () => {
    render(<UserProfile />);
    expect(screen.getByText(/Website/i)).toBeInTheDocument();
    expect(screen.getAllByText(/@johndoe/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^johndoe$/i).length).toBeGreaterThan(0);
  });

  test('displays social connections counts', () => {
    render(<UserProfile />);
    expect(screen.getByText('Followers')).toBeInTheDocument();
    expect(screen.getByText('Following')).toBeInTheDocument();
    expect(screen.getByText('Friends')).toBeInTheDocument();
  });

  test('displays edit profile button', () => {
    render(<UserProfile />);
    expect(screen.getByRole('button', { name: /Edit Profile/i })).toBeInTheDocument();
  });
});

// ==================== PROFILE EDITING TESTS ====================

describe('UserProfile - Profile Editing', () => {
  test('enters edit mode when edit button clicked', () => {
    render(<UserProfile />);
    const editButton = screen.getByRole('button', { name: /Edit Profile/i });
    fireEvent.click(editButton);
    
    // Should show save and cancel buttons
    expect(screen.getByRole('button', { name: /Save Profile/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  test('displays editable fields in edit mode', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    expect(screen.getByLabelText(/Username \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Display Name \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email \*/i)).toBeInTheDocument();
  });

  test('displays additional fields in edit mode', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    expect(screen.getByLabelText(/Bio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Website/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Twitter/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/GitHub/i)).toBeInTheDocument();
  });

  test('displays change avatar button in edit mode', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    expect(screen.getByTestId('avatar-upload')).toBeInTheDocument();
  });

  test('updates username field when typing', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    const usernameInput = screen.getByLabelText(/Username \*/i);
    fireEvent.change(usernameInput, { target: { value: 'newusername' } });
    
    expect(usernameInput).toHaveValue('newusername');
  });

  test('updates display name field when typing', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    const displayNameInput = screen.getByLabelText(/Display Name \*/i);
    fireEvent.change(displayNameInput, { target: { value: 'New Name' } });
    
    expect(displayNameInput).toHaveValue('New Name');
  });

  test('updates bio field when typing', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    const bioInput = screen.getByLabelText(/Bio/i);
    fireEvent.change(bioInput, { target: { value: 'New bio text' } });
    
    expect(bioInput).toHaveValue('New bio text');
  });

  test('cancels edit mode without saving changes', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    const usernameInput = screen.getByLabelText(/Username \*/i);
    fireEvent.change(usernameInput, { target: { value: 'changed' } });
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);
    
    // Should exit edit mode
    expect(screen.getByRole('button', { name: /Edit Profile/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save Profile/i })).not.toBeInTheDocument();
  });

  test('saves profile changes when valid', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    const displayNameInput = screen.getByLabelText(/Display Name \*/i);
    fireEvent.change(displayNameInput, { target: { value: 'Updated Name' } });
    
    const saveButton = screen.getByRole('button', { name: /Save Profile/i });
    fireEvent.click(saveButton);
    
    // Should exit edit mode and show updated name
    expect(screen.getByText('Updated Name')).toBeInTheDocument();
  });
});

// ==================== VALIDATION TESTS ====================

describe('UserProfile - Validation', () => {
  test('shows error for empty username', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    const usernameInput = screen.getByLabelText(/Username \*/i);
    fireEvent.change(usernameInput, { target: { value: '' } });
    
    const saveButton = screen.getByRole('button', { name: /Save Profile/i });
    fireEvent.click(saveButton);
    
    expect(screen.getByText(/Username is required/i)).toBeInTheDocument();
  });

  test('shows error for invalid username format', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    const usernameInput = screen.getByLabelText(/Username \*/i);
    fireEvent.change(usernameInput, { target: { value: 'a' } }); // Too short
    
    const saveButton = screen.getByRole('button', { name: /Save Profile/i });
    fireEvent.click(saveButton);
    
    expect(screen.getByText(/3-20 characters/i)).toBeInTheDocument();
  });

  test('shows error for empty display name', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    const displayNameInput = screen.getByLabelText(/Display Name \*/i);
    fireEvent.change(displayNameInput, { target: { value: '' } });
    
    const saveButton = screen.getByRole('button', { name: /Save Profile/i });
    fireEvent.click(saveButton);
    
    expect(screen.getByText(/Display name is required/i)).toBeInTheDocument();
  });

  test('shows error for empty email', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    const emailInput = screen.getByLabelText(/Email \*/i);
    fireEvent.change(emailInput, { target: { value: '' } });
    
    const saveButton = screen.getByRole('button', { name: /Save Profile/i });
    fireEvent.click(saveButton);
    
    expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
  });

  test('shows error for invalid email format', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    const emailInput = screen.getByLabelText(/Email \*/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    const saveButton = screen.getByRole('button', { name: /Save Profile/i });
    fireEvent.click(saveButton);
    
    expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
  });

  test('shows error for invalid website URL', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    const websiteInput = screen.getByLabelText(/Website/i);
    fireEvent.change(websiteInput, { target: { value: 'not-a-url' } });
    
    const saveButton = screen.getByRole('button', { name: /Save Profile/i });
    fireEvent.click(saveButton);
    
    expect(screen.getByText(/valid URL/i)).toBeInTheDocument();
  });

  test('clears error when field is corrected', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    const usernameInput = screen.getByLabelText(/Username \*/i);
    fireEvent.change(usernameInput, { target: { value: '' } });
    
    const saveButton = screen.getByRole('button', { name: /Save Profile/i });
    fireEvent.click(saveButton);
    
    expect(screen.getByText(/Username is required/i)).toBeInTheDocument();
    
    // Fix the error
    fireEvent.change(usernameInput, { target: { value: 'validusername' } });
    
    // Error should be cleared
    expect(screen.queryByText(/Username is required/i)).not.toBeInTheDocument();
  });

  test('allows saving with valid data', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    const usernameInput = screen.getByLabelText(/Username \*/i);
    const displayNameInput = screen.getByLabelText(/Display Name \*/i);
    const emailInput = screen.getByLabelText(/Email \*/i);
    
    fireEvent.change(usernameInput, { target: { value: 'validuser' } });
    fireEvent.change(displayNameInput, { target: { value: 'Valid User' } });
    fireEvent.change(emailInput, { target: { value: 'valid@example.com' } });
    
    const saveButton = screen.getByRole('button', { name: /Save Profile/i });
    fireEvent.click(saveButton);
    
    // Should exit edit mode (no errors)
    expect(screen.queryByText(/is required/i)).not.toBeInTheDocument();
  });
});

// ==================== BADGES TAB TESTS ====================

describe('UserProfile - Badges Tab', () => {
  test('switches to badges tab when clicked', () => {
    render(<UserProfile />);
    const badgesTab = screen.getByRole('button', { name: /🏆 Badges/i });
    fireEvent.click(badgesTab);
    
    expect(badgesTab).toHaveClass('text-amber-400');
    expect(screen.getByText('Achievements')).toBeInTheDocument();
  });

  test('displays badge count in badges tab', () => {
    render(<UserProfile />);
    const badgesTab = screen.getByRole('button', { name: /🏆 Badges/i });
    fireEvent.click(badgesTab);
    
    expect(screen.getByText(/\d+ badges? earned/i)).toBeInTheDocument();
  });

  test('displays badge cards with names', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /🏆 Badges/i }));
    
    expect(screen.getByText('Early Adopter')).toBeInTheDocument();
    expect(screen.getByText('Active Voter')).toBeInTheDocument();
  });

  test('displays badge descriptions', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /🏆 Badges/i }));
    
    expect(screen.getByText(/Joined in the first month/i)).toBeInTheDocument();
    expect(screen.getByText(/Participated in 25\+ votes/i)).toBeInTheDocument();
  });

  test('displays badge icons', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /🏆 Badges/i }));
    
    expect(screen.getByText('🚀')).toBeInTheDocument();
    expect(screen.getByText('🗳️')).toBeInTheDocument();
  });

  test('displays badge rarity labels', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /🏆 Badges/i }));
    
    expect(screen.getByText('Legendary')).toBeInTheDocument();
    expect(screen.getAllByText(/Epic/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Rare/i).length).toBeGreaterThan(0);
  });

  test('displays badge earned dates', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /🏆 Badges/i }));
    
    const earnedText = screen.getAllByText(/Earned/i);
    expect(earnedText.length).toBeGreaterThan(0);
  });

  test('sorts badges by rarity', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /🏆 Badges/i }));
    
    const badges = screen.getAllByText(/Legendary|Epic|Rare|Common/);
    // First badge should be legendary or epic (highest rarity first)
    expect(badges[0].textContent).toMatch(/Legendary|Epic/);
  });
});

// ==================== ACTIVITY TAB TESTS ====================

describe('UserProfile - Activity Tab', () => {
  test('switches to activity tab when clicked', () => {
    render(<UserProfile />);
    const activityTab = screen.getByRole('button', { name: /📊 Activity/i });
    fireEvent.click(activityTab);
    
    expect(activityTab).toHaveClass('text-amber-400');
    expect(screen.getByText('Activity History')).toBeInTheDocument();
  });

  test('displays activity items with titles', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /📊 Activity/i }));
    
    expect(screen.getByText(/Voted on Treasury Proposal/i)).toBeInTheDocument();
    expect(screen.getByText(/Received 500 USDC/i)).toBeInTheDocument();
  });

  test('displays activity timestamps', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /📊 Activity/i }));
    
    const timestamps = screen.getAllByText(/ago|just now/i);
    expect(timestamps.length).toBeGreaterThan(0);
  });

  test('displays activity icons', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /📊 Activity/i }));
    
    // Activity icons should be present
    expect(screen.getAllByText('🗳️').length).toBeGreaterThan(0);
    expect(screen.getAllByText('💰').length).toBeGreaterThan(0);
  });

  test('displays load more button', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /📊 Activity/i }));
    
    expect(screen.getByRole('button', { name: /Load More Activities/i })).toBeInTheDocument();
  });
});

// ==================== STATISTICS TESTS ====================

describe('UserProfile - Statistics', () => {
  test('displays statistics section in overview', () => {
    render(<UserProfile />);
    expect(screen.getByText('Statistics')).toBeInTheDocument();
  });

  test('displays all stat cards', () => {
    render(<UserProfile />);
    expect(screen.getByText('Activities')).toBeInTheDocument();
    expect(screen.getByText('Badges')).toBeInTheDocument();
    expect(screen.getByText('Votes Cast')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Governance Score')).toBeInTheDocument();
    expect(screen.getByText('Proof Score')).toBeInTheDocument();
  });

  test('displays stat values', () => {
    render(<UserProfile />);
    const statsSection = screen.getByText('Statistics').closest('div');
    const values = within(statsSection!).getAllByText(/^\d+$/);
    expect(values.length).toBeGreaterThanOrEqual(6);
  });

  test('stat cards have icons', () => {
    render(<UserProfile />);
    expect(screen.getAllByText('📊').length).toBeGreaterThan(0);
    expect(screen.getAllByText('🏆').length).toBeGreaterThan(0);
    expect(screen.getAllByText('🗳️').length).toBeGreaterThan(0);
    expect(screen.getAllByText('💰').length).toBeGreaterThan(0);
  });
});

// ==================== PRIVACY SETTINGS TESTS ====================

describe('UserProfile - Privacy Settings', () => {
  test('switches to settings tab when clicked', () => {
    render(<UserProfile />);
    const settingsTab = screen.getByRole('button', { name: /⚙️ Settings/i });
    fireEvent.click(settingsTab);
    
    expect(settingsTab).toHaveClass('text-amber-400');
    expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
  });

  test('displays profile visibility dropdown', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /⚙️ Settings/i }));
    
    expect(screen.getByText('Profile Visibility')).toBeInTheDocument();
    const select = screen.getByDisplayValue(/Public/i);
    expect(select).toBeInTheDocument();
  });

  test('displays information visibility toggles', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /⚙️ Settings/i }));
    
    expect(screen.getByText('Show Email')).toBeInTheDocument();
    expect(screen.getByText('Show Activities')).toBeInTheDocument();
    expect(screen.getByText('Show Badges')).toBeInTheDocument();
    expect(screen.getByText('Show Statistics')).toBeInTheDocument();
    expect(screen.getByText('Allow Messages')).toBeInTheDocument();
  });

  test('toggles show email checkbox', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /⚙️ Settings/i }));
    
    const checkbox = screen.getByRole('checkbox', { name: /Show Email/i }) as HTMLInputElement;
    const initialState = checkbox.checked;
    
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(!initialState);
  });

  test('toggles show activities checkbox', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /⚙️ Settings/i }));
    
    const checkbox = screen.getByRole('checkbox', { name: /Show Activities/i }) as HTMLInputElement;
    const initialState = checkbox.checked;
    
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(!initialState);
  });

  test('changes profile visibility setting', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /⚙️ Settings/i }));
    
    const select = screen.getByDisplayValue(/Public/i);
    fireEvent.change(select, { target: { value: 'private' } });
    
    expect(select).toHaveValue('private');
  });

  test('displays save settings button', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /⚙️ Settings/i }));
    
    expect(screen.getByRole('button', { name: /Save Settings/i })).toBeInTheDocument();
  });

  test('hides email when show email is disabled', () => {
    render(<UserProfile />);
    
    // Email should be visible initially
    expect(screen.getByText(/john\.doe@example\.com/i)).toBeInTheDocument();
    
    // Disable show email
    fireEvent.click(screen.getByRole('button', { name: /⚙️ Settings/i }));
    const checkbox = screen.getByRole('checkbox', { name: /Show Email/i }) as HTMLInputElement;
    fireEvent.click(checkbox);
    
    // Go back to overview
    fireEvent.click(screen.getByRole('button', { name: /👤 Overview/i }));
    
    // Email should be hidden
    expect(screen.queryByText(/john\.doe@example\.com/i)).not.toBeInTheDocument();
  });
});

// ==================== SOCIAL FEATURES TESTS ====================

describe('UserProfile - Social Features', () => {
  test('displays social connections section', () => {
    render(<UserProfile />);
    expect(screen.getByText('Connections')).toBeInTheDocument();
  });

  test('displays followers count', () => {
    render(<UserProfile />);
    expect(screen.getByText('Followers')).toBeInTheDocument();
    const followersSection = screen.getByText('Followers').closest('div');
    expect(within(followersSection!).getByText(/^\d+$/)).toBeInTheDocument();
  });

  test('displays following count', () => {
    render(<UserProfile />);
    expect(screen.getByText('Following')).toBeInTheDocument();
    const followingSection = screen.getByText('Following').closest('div');
    expect(within(followingSection!).getByText(/^\d+$/)).toBeInTheDocument();
  });

  test('displays friends count', () => {
    render(<UserProfile />);
    expect(screen.getByText('Friends')).toBeInTheDocument();
    const friendsSection = screen.getByText('Friends').closest('div');
    expect(within(friendsSection!).getByText(/^\d+$/)).toBeInTheDocument();
  });

  test('social links are clickable', () => {
    render(<UserProfile />);
    const websiteLink = screen.getByText(/Website/i).closest('a');
    expect(websiteLink).toHaveAttribute('href');
    expect(websiteLink).toHaveAttribute('target', '_blank');
  });
});

// ==================== ACCESSIBILITY TESTS ====================

describe('UserProfile - Accessibility', () => {
  test('tab buttons have proper roles', () => {
    render(<UserProfile />);
    const tabs = screen.getAllByRole('button', { name: /Overview|Badges|Activity|Settings/ });
    expect(tabs.length).toBe(4);
  });

  test('form inputs have labels in edit mode', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    expect(screen.getByLabelText(/Username \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Display Name \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email \*/i)).toBeInTheDocument();
  });

  test('checkboxes have accessible labels', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /⚙️ Settings/i }));
    
    expect(screen.getByRole('checkbox', { name: /Show Email/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Show Activities/i })).toBeInTheDocument();
  });

  test('buttons have descriptive text', () => {
    render(<UserProfile />);
    expect(screen.getByRole('button', { name: /Edit Profile/i })).toBeInTheDocument();
  });

  test('error messages are displayed for invalid inputs', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    const usernameInput = screen.getByLabelText(/Username \*/i);
    fireEvent.change(usernameInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Profile/i }));
    
    expect(screen.getByText(/Username is required/i)).toBeInTheDocument();
  });
});

// ==================== MOBILE RESPONSIVENESS TESTS ====================

describe('UserProfile - Mobile Responsiveness', () => {
  test('renders with responsive container', () => {
    render(<UserProfile />);
    const container = document.querySelector('.max-w-6xl');
    expect(container).toBeInTheDocument();
  });

  test('statistics use responsive grid', () => {
    render(<UserProfile />);
    const statsGrid = document.querySelector('.grid.grid-cols-2');
    expect(statsGrid).toBeInTheDocument();
  });

  test('badges use responsive grid', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /🏆 Badges/i }));
    
    const badgesGrid = document.querySelector('.grid.grid-cols-1');
    expect(badgesGrid).toBeInTheDocument();
  });

  test('tabs wrap on small screens', () => {
    render(<UserProfile />);
    const tabsContainer = screen.getByRole('button', { name: /👤 Overview/i }).parentElement;
    expect(tabsContainer).toHaveClass('flex-wrap');
  });

  test('profile header adapts to mobile', () => {
    render(<UserProfile />);
    const profileHeader = document.querySelector('.flex.flex-col.md\\:flex-row');
    expect(profileHeader).toBeInTheDocument();
  });
});

// ==================== INTEGRATION TESTS ====================

describe('UserProfile - Integration', () => {
  test('full edit workflow', () => {
    render(<UserProfile />);
    
    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    // Edit fields
    const displayNameInput = screen.getByLabelText(/Display Name \*/i);
    fireEvent.change(displayNameInput, { target: { value: 'New Name' } });
    
    const bioInput = screen.getByLabelText(/Bio/i);
    fireEvent.change(bioInput, { target: { value: 'New bio' } });
    
    // Save
    fireEvent.click(screen.getByRole('button', { name: /Save Profile/i }));
    
    // Verify changes
    expect(screen.getByText('New Name')).toBeInTheDocument();
    expect(screen.getByText('New bio')).toBeInTheDocument();
  });

  test('privacy settings affect profile display', () => {
    render(<UserProfile />);
    
    // Check initial state - stats visible
    expect(screen.getByText('Statistics')).toBeInTheDocument();
    
    // Disable stats
    fireEvent.click(screen.getByRole('button', { name: /⚙️ Settings/i }));
    const showStatsCheckbox = screen.getByRole('checkbox', { name: /Show Statistics/i });
    fireEvent.click(showStatsCheckbox);
    
    // Go back to overview
    fireEvent.click(screen.getByRole('button', { name: /👤 Overview/i }));
    
    // Stats should be hidden
    expect(screen.queryByText('Statistics')).not.toBeInTheDocument();
  });

  test('tab navigation preserves state', () => {
    render(<UserProfile />);
    
    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    const displayNameInput = screen.getByLabelText(/Display Name \*/i);
    fireEvent.change(displayNameInput, { target: { value: 'Changed' } });
    
    // Switch tabs
    fireEvent.click(screen.getByRole('button', { name: /🏆 Badges/i }));
    fireEvent.click(screen.getByRole('button', { name: /👤 Overview/i }));
    
    // Edit mode should be exited (state reset)
    expect(screen.queryByLabelText(/Display Name \*/i)).not.toBeInTheDocument();
  });

  test('view all activity link navigates to activity tab', () => {
    render(<UserProfile />);
    
    // Click view all link in recent activity
    const viewAllButton = screen.getByText(/View All/i);
    fireEvent.click(viewAllButton);
    
    // Should switch to activity tab
    const activityTab = screen.getByRole('button', { name: /📊 Activity/i });
    expect(activityTab).toHaveClass('text-amber-400');
  });
});

// ==================== DATA VALIDATION TESTS ====================

describe('UserProfile - Data Validation', () => {
  test('handles missing optional fields gracefully', () => {
    render(<UserProfile />);
    // Should render without errors even if some optional fields are missing
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  test('formats dates correctly', () => {
    render(<UserProfile />);
    expect(screen.getAllByText(/Joined/i).length).toBeGreaterThan(0);
    // Date should be formatted as "Month Year"
    expect(screen.getByText(/January \d{4}|February \d{4}|March \d{4}/i)).toBeInTheDocument();
  });

  test('displays activity timestamps in relative format', () => {
    render(<UserProfile />);
    const timestamps = screen.getAllByText(/\d+[mhd] ago|just now/i);
    expect(timestamps.length).toBeGreaterThan(0);
  });

  test('displays badge rarity with proper colors', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /🏆 Badges/i }));
    
    const legendaryBadge = screen.getByText(/Legendary/i);
    expect(legendaryBadge.className).toMatch(/bg-yellow|text-yellow/);
  });
});

// ==================== ERROR HANDLING TESTS ====================

describe('UserProfile - Error Handling', () => {
  test('prevents saving invalid profile data', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    // Set invalid data
    const usernameInput = screen.getByLabelText(/Username \*/i);
    fireEvent.change(usernameInput, { target: { value: '' } });
    
    // Try to save
    fireEvent.click(screen.getByRole('button', { name: /Save Profile/i }));
    
    // Should still be in edit mode (save failed)
    expect(screen.getByRole('button', { name: /Save Profile/i })).toBeInTheDocument();
    expect(screen.getByText(/Username is required/i)).toBeInTheDocument();
  });

  test('handles multiple validation errors', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    // Create multiple errors
    const usernameInput = screen.getByLabelText(/Username \*/i);
    const emailInput = screen.getByLabelText(/Email \*/i);
    
    fireEvent.change(usernameInput, { target: { value: '' } });
    fireEvent.change(emailInput, { target: { value: 'invalid' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Save Profile/i }));
    
    // Should show both errors
    expect(screen.getByText(/Username is required/i)).toBeInTheDocument();
    expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
  });
});
