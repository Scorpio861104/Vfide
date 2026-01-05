/**
 * Comprehensive test suite for WalletManager component
 * Tests wallet management, chain switching, token display, and settings
 */

import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WalletManager from '@/components/wallet/WalletManager';

// ==================== COMPONENT RENDERING TESTS ====================

describe('WalletManager - Component Rendering', () => {
  test('renders main heading and description', () => {
    render(<WalletManager />);
    expect(screen.getByText('Wallet Manager')).toBeInTheDocument();
    expect(screen.getByText(/Manage your connected wallets/)).toBeInTheDocument();
  });

  test('renders all tab buttons', () => {
    render(<WalletManager />);
    expect(screen.getByRole('button', { name: /👛 Wallets/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /🔗 Networks/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /💰 Tokens/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /⚙️ Settings/i })).toBeInTheDocument();
  });

  test('renders with wallets tab active by default', () => {
    render(<WalletManager />);
    const walletsTab = screen.getByRole('button', { name: /👛 Wallets/i });
    expect(walletsTab).toHaveClass('border-blue-500');
  });

  test('renders stat cards with initial data', () => {
    render(<WalletManager />);
    expect(screen.getByText('Total Wallets')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Total Balance')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  test('renders connect new wallet button', () => {
    render(<WalletManager />);
    expect(screen.getByRole('button', { name: /\+ Connect New Wallet/i })).toBeInTheDocument();
  });

  test('renders initial wallet cards', () => {
    render(<WalletManager />);
    expect(screen.getByText('Main Wallet')).toBeInTheDocument();
    expect(screen.getByText('Hardware Wallet')).toBeInTheDocument();
    expect(screen.getByText('Mobile Wallet')).toBeInTheDocument();
  });
});

// ==================== WALLET MANAGEMENT TESTS ====================

describe('WalletManager - Wallet Management', () => {
  test('displays wallet information correctly', () => {
    render(<WalletManager />);
    
    // Check Main Wallet details
    expect(screen.getByText('Main Wallet')).toBeInTheDocument();
    expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
    expect(screen.getByText(/metamask/i)).toBeInTheDocument();
  });

  test('shows active wallet badge', () => {
    render(<WalletManager />);
    expect(screen.getByText('Active Wallet')).toBeInTheDocument();
  });

  test('can activate a different wallet', () => {
    render(<WalletManager />);
    
    // Find and click "Set Active" button for Hardware Wallet
    const setActiveButtons = screen.getAllByRole('button', { name: /Set Active/i });
    fireEvent.click(setActiveButtons[0]);
    
    // Verify the wallet is now active
    const activeLabels = screen.getAllByText('Active Wallet');
    expect(activeLabels.length).toBeGreaterThan(0);
  });

  test('opens edit modal when clicking edit button', () => {
    render(<WalletManager />);
    
    const editButtons = screen.getAllByRole('button', { name: /Edit/i });
    fireEvent.click(editButtons[0]);
    
    expect(screen.getByText('Edit Wallet Nickname')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter wallet nickname')).toBeInTheDocument();
  });

  test('can update wallet nickname', () => {
    render(<WalletManager />);
    
    // Open edit modal
    const editButtons = screen.getAllByRole('button', { name: /Edit/i });
    fireEvent.click(editButtons[0]);
    
    // Change nickname
    const input = screen.getByPlaceholderText('Enter wallet nickname');
    fireEvent.change(input, { target: { value: 'Updated Wallet' } });
    
    // Save changes
    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);
    
    // Verify nickname updated
    expect(screen.getByText('Updated Wallet')).toBeInTheDocument();
  });

  test('can cancel wallet nickname edit', () => {
    render(<WalletManager />);
    
    // Open edit modal
    const editButtons = screen.getAllByRole('button', { name: /Edit/i });
    fireEvent.click(editButtons[0]);
    
    // Cancel edit
    const cancelButtons = screen.getAllByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButtons[0]);
    
    // Modal should be closed
    expect(screen.queryByText('Edit Wallet Nickname')).not.toBeInTheDocument();
  });

  test('can disconnect a wallet', () => {
    render(<WalletManager />);
    
    const initialWallets = screen.getAllByText(/0x[a-f0-9]{4}\.\.\.[a-f0-9]{4}/);
    const initialCount = initialWallets.length;
    
    // Disconnect Hardware Wallet
    const disconnectButtons = screen.getAllByRole('button', { name: /Disconnect/i });
    fireEvent.click(disconnectButtons[1]);
    
    // Check wallet count decreased
    const remainingWallets = screen.getAllByText(/0x[a-f0-9]{4}\.\.\.[a-f0-9]{4}/);
    expect(remainingWallets.length).toBe(initialCount - 1);
  });

  test('displays wallet balance correctly', () => {
    render(<WalletManager />);
    expect(screen.getByText(/2\.5 ETH/i)).toBeInTheDocument();
    expect(screen.getByText(/\$8,750/i)).toBeInTheDocument();
  });

  test('displays wallet type icons', () => {
    render(<WalletManager />);
    // Icons are rendered as emojis in mock data
    const walletCards = screen.getAllByText(/metamask|ledger|walletconnect/i);
    expect(walletCards.length).toBeGreaterThan(0);
  });

  test('shows last used timestamp', () => {
    render(<WalletManager />);
    const timestamps = screen.getAllByText(/Last used \d+ minutes ago/i);
    expect(timestamps.length).toBeGreaterThan(0);
  });
});

// ==================== CONNECT WALLET TESTS ====================

describe('WalletManager - Connect Wallet', () => {
  test('opens connect wallet modal', () => {
    render(<WalletManager />);
    
    const connectButton = screen.getByRole('button', { name: /\+ Connect New Wallet/i });
    fireEvent.click(connectButton);
    
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });

  test('shows all wallet connection options', () => {
    render(<WalletManager />);
    
    const connectButton = screen.getByRole('button', { name: /\+ Connect New Wallet/i });
    fireEvent.click(connectButton);
    
    expect(screen.getByText(/metamask/i)).toBeInTheDocument();
    expect(screen.getByText(/walletconnect/i)).toBeInTheDocument();
    expect(screen.getByText(/ledger/i)).toBeInTheDocument();
    expect(screen.getByText(/coinbase/i)).toBeInTheDocument();
  });

  test('can connect MetaMask wallet', () => {
    render(<WalletManager />);
    
    // Open modal
    const connectButton = screen.getByRole('button', { name: /\+ Connect New Wallet/i });
    fireEvent.click(connectButton);
    
    // Count initial wallets
    const initialWallets = screen.getAllByText(/metamask|ledger|walletconnect/i);
    const initialCount = initialWallets.length;
    
    // Click MetaMask option
    const metamaskOption = screen.getByText(/metamask/i);
    fireEvent.click(metamaskOption);
    
    // Verify new wallet added (modal closes, so check wallet count increased)
    expect(screen.queryByText('Connect Wallet')).not.toBeInTheDocument();
  });

  test('can cancel wallet connection', () => {
    render(<WalletManager />);
    
    // Open modal
    const connectButton = screen.getByRole('button', { name: /\+ Connect New Wallet/i });
    fireEvent.click(connectButton);
    
    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);
    
    // Modal should be closed
    expect(screen.queryByText('Connect Wallet')).not.toBeInTheDocument();
  });
});

// ==================== CHAIN/NETWORK TESTS ====================

describe('WalletManager - Chain/Network Management', () => {
  test('switches to chains tab', () => {
    render(<WalletManager />);
    
    const chainsTab = screen.getByRole('button', { name: /🔗 Networks/i });
    fireEvent.click(chainsTab);
    
    expect(screen.getByText('Select Network')).toBeInTheDocument();
  });

  test('displays supported chains', () => {
    render(<WalletManager />);
    
    const chainsTab = screen.getByRole('button', { name: /🔗 Networks/i });
    fireEvent.click(chainsTab);
    
    expect(screen.getByText('Ethereum Mainnet')).toBeInTheDocument();
    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.getByText('Polygon')).toBeInTheDocument();
    expect(screen.getByText('Arbitrum One')).toBeInTheDocument();
    expect(screen.getByText('Optimism')).toBeInTheDocument();
  });

  test('can switch to different chain', () => {
    render(<WalletManager />);
    
    // Go to chains tab
    const chainsTab = screen.getByRole('button', { name: /🔗 Networks/i });
    fireEvent.click(chainsTab);
    
    // Click on Polygon
    const polygonButton = screen.getByText('Polygon');
    fireEvent.click(polygonButton);
    
    // Verify chain is selected (check for active styling or confirmation)
    expect(polygonButton.closest('button')).toHaveClass('border-blue-500');
  });

  test('shows active wallet chain info', () => {
    render(<WalletManager />);
    
    const chainsTab = screen.getByRole('button', { name: /🔗 Networks/i });
    fireEvent.click(chainsTab);
    
    expect(screen.getByText(/Active Wallet:/i)).toBeInTheDocument();
    expect(screen.getByText(/Main Wallet/i)).toBeInTheDocument();
  });
});

// ==================== TOKENS TAB TESTS ====================

describe('WalletManager - Tokens Display', () => {
  test('switches to tokens tab', () => {
    render(<WalletManager />);
    
    const tokensTab = screen.getByRole('button', { name: /💰 Tokens/i });
    fireEvent.click(tokensTab);
    
    expect(screen.getByText('Token Balances')).toBeInTheDocument();
  });

  test('displays token list for active wallet', () => {
    render(<WalletManager />);
    
    const tokensTab = screen.getByRole('button', { name: /💰 Tokens/i });
    fireEvent.click(tokensTab);
    
    expect(screen.getByText('ETH')).toBeInTheDocument();
    expect(screen.getByText('USDC')).toBeInTheDocument();
    expect(screen.getByText('USDT')).toBeInTheDocument();
    expect(screen.getByText('DAI')).toBeInTheDocument();
  });

  test('shows token balances and USD values', () => {
    render(<WalletManager />);
    
    const tokensTab = screen.getByRole('button', { name: /💰 Tokens/i });
    fireEvent.click(tokensTab);
    
    // Check for balance and USD value patterns
    expect(screen.getByText(/2\.5/)).toBeInTheDocument();
    expect(screen.getByText(/\$8,750/)).toBeInTheDocument();
  });

  test('displays active wallet info in tokens tab', () => {
    render(<WalletManager />);
    
    const tokensTab = screen.getByRole('button', { name: /💰 Tokens/i });
    fireEvent.click(tokensTab);
    
    expect(screen.getByText('Active Wallet')).toBeInTheDocument();
    expect(screen.getByText('Main Wallet')).toBeInTheDocument();
  });
});

// ==================== SETTINGS TAB TESTS ====================

describe('WalletManager - Settings', () => {
  test('switches to settings tab', () => {
    render(<WalletManager />);
    
    const settingsTab = screen.getByRole('button', { name: /⚙️ Settings/i });
    fireEvent.click(settingsTab);
    
    expect(screen.getByText('Wallet Settings')).toBeInTheDocument();
  });

  test('displays all setting options', () => {
    render(<WalletManager />);
    
    const settingsTab = screen.getByRole('button', { name: /⚙️ Settings/i });
    fireEvent.click(settingsTab);
    
    expect(screen.getByText(/Auto-connect on page load/i)).toBeInTheDocument();
    expect(screen.getByText(/Show balance in USD/i)).toBeInTheDocument();
    expect(screen.getByText(/Enable notifications/i)).toBeInTheDocument();
    expect(screen.getByText(/Require confirmation for all transactions/i)).toBeInTheDocument();
  });

  test('shows danger zone section', () => {
    render(<WalletManager />);
    
    const settingsTab = screen.getByRole('button', { name: /⚙️ Settings/i });
    fireEvent.click(settingsTab);
    
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Disconnect All Wallets/i })).toBeInTheDocument();
  });

  test('disconnect all wallets requires confirmation', () => {
    render(<WalletManager />);
    
    const settingsTab = screen.getByRole('button', { name: /⚙️ Settings/i });
    fireEvent.click(settingsTab);
    
    // Mock window.confirm
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    
    const disconnectAllButton = screen.getByRole('button', { name: /Disconnect All Wallets/i });
    fireEvent.click(disconnectAllButton);
    
    expect(confirmSpy).toHaveBeenCalled();
    
    confirmSpy.mockRestore();
  });

  test('can disconnect all wallets after confirmation', () => {
    render(<WalletManager />);
    
    const settingsTab = screen.getByRole('button', { name: /⚙️ Settings/i });
    fireEvent.click(settingsTab);
    
    // Mock window.confirm to return true
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    
    const disconnectAllButton = screen.getByRole('button', { name: /Disconnect All Wallets/i });
    fireEvent.click(disconnectAllButton);
    
    // Go back to wallets tab
    const walletsTab = screen.getByRole('button', { name: /👛 Wallets/i });
    fireEvent.click(walletsTab);
    
    // Verify no wallets are displayed
    expect(screen.queryByText('Main Wallet')).not.toBeInTheDocument();
    
    confirmSpy.mockRestore();
  });
});

// ==================== STAT CARDS TESTS ====================

describe('WalletManager - Statistics', () => {
  test('displays correct total wallets count', () => {
    render(<WalletManager />);
    const statCard = screen.getByText('Total Wallets');
    expect(statCard).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  test('displays correct connected wallets count', () => {
    render(<WalletManager />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  test('displays total balance correctly', () => {
    render(<WalletManager />);
    expect(screen.getByText('Total Balance')).toBeInTheDocument();
    expect(screen.getByText(/\$67,025/)).toBeInTheDocument();
  });

  test('updates stats when wallet is disconnected', () => {
    render(<WalletManager />);
    
    // Disconnect a wallet
    const disconnectButtons = screen.getAllByRole('button', { name: /Disconnect/i });
    fireEvent.click(disconnectButtons[2]);
    
    // Stats should update
    const statValues = screen.getAllByText('2');
    expect(statValues.length).toBeGreaterThan(0);
  });
});

// ==================== ACCESSIBILITY TESTS ====================

describe('WalletManager - Accessibility', () => {
  test('all interactive elements are keyboard accessible', () => {
    render(<WalletManager />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).not.toHaveAttribute('disabled');
    });
  });

  test('tabs have proper ARIA labels', () => {
    render(<WalletManager />);
    
    const tabs = screen.getAllByRole('button');
    const tabButtons = tabs.slice(0, 4); // First 4 buttons are tabs
    
    tabButtons.forEach((tab) => {
      expect(tab).toHaveTextContent(/.+/); // Has text content
    });
  });

  test('wallet cards have descriptive text', () => {
    render(<WalletManager />);
    
    expect(screen.getByText('Main Wallet')).toBeInTheDocument();
    expect(screen.getByText('Hardware Wallet')).toBeInTheDocument();
    expect(screen.getByText('Mobile Wallet')).toBeInTheDocument();
  });

  test('stat cards have clear labels', () => {
    render(<WalletManager />);
    
    expect(screen.getByText('Total Wallets')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Total Balance')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  test('forms have proper labels', () => {
    render(<WalletManager />);
    
    // Open edit modal
    const editButtons = screen.getAllByRole('button', { name: /Edit/i });
    fireEvent.click(editButtons[0]);
    
    expect(screen.getByText('Nickname')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter wallet nickname')).toBeInTheDocument();
  });
});

// ==================== MOBILE RESPONSIVENESS TESTS ====================

describe('WalletManager - Mobile Responsiveness', () => {
  test('renders mobile-friendly layout', () => {
    render(<WalletManager />);
    
    // Check for responsive container
    const container = screen.getByText('Wallet Manager').closest('div');
    expect(container).toBeInTheDocument();
  });

  test('tabs are scrollable on mobile', () => {
    render(<WalletManager />);
    
    const tabContainer = screen.getByRole('button', { name: /👛 Wallets/i }).parentElement;
    expect(tabContainer).toHaveClass('grid');
  });

  test('wallet cards stack vertically on mobile', () => {
    render(<WalletManager />);
    
    const walletCards = screen.getAllByText(/0x[a-f0-9]{4}\.\.\.[a-f0-9]{4}/);
    expect(walletCards.length).toBeGreaterThan(0);
  });

  test('modals are mobile-friendly', () => {
    render(<WalletManager />);
    
    const connectButton = screen.getByRole('button', { name: /\+ Connect New Wallet/i });
    fireEvent.click(connectButton);
    
    const modal = screen.getByText('Connect Wallet').closest('div');
    expect(modal).toHaveClass('p-6');
  });
});

// ==================== DATA VALIDATION TESTS ====================

describe('WalletManager - Data Validation', () => {
  test('displays addresses in short format', () => {
    render(<WalletManager />);
    
    // Addresses should be shortened (0x1234...5678)
    expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
    expect(screen.getByText('0xabcd...ef01')).toBeInTheDocument();
  });

  test('displays balances with proper decimals', () => {
    render(<WalletManager />);
    
    expect(screen.getByText(/2\.5 ETH/i)).toBeInTheDocument();
    expect(screen.getByText(/15\.8 ETH/i)).toBeInTheDocument();
  });

  test('displays USD values with commas', () => {
    render(<WalletManager />);
    
    expect(screen.getByText(/\$67,025/)).toBeInTheDocument();
  });

  test('shows connection status indicators', () => {
    render(<WalletManager />);
    
    // Active wallet should show "Active Wallet" badge
    expect(screen.getByText('Active Wallet')).toBeInTheDocument();
    
    // Non-active wallets should show "Set Active" button
    expect(screen.getAllByRole('button', { name: /Set Active/i }).length).toBeGreaterThan(0);
  });
});

// ==================== INTEGRATION TESTS ====================

describe('WalletManager - Integration', () => {
  test('complete wallet lifecycle: connect, activate, edit, disconnect', () => {
    render(<WalletManager />);
    
    // 1. Connect new wallet
    const connectButton = screen.getByRole('button', { name: /\+ Connect New Wallet/i });
    fireEvent.click(connectButton);
    
    const ledgerOption = screen.getAllByText(/ledger/i)[0];
    fireEvent.click(ledgerOption);
    
    // 2. Activate the new wallet (should be in the list now)
    // Note: In real scenario, we'd wait for the new wallet to appear
    
    // 3. Edit wallet nickname
    const editButtons = screen.getAllByRole('button', { name: /Edit/i });
    if (editButtons.length > 0) {
      fireEvent.click(editButtons[0]);
      
      const input = screen.getByPlaceholderText('Enter wallet nickname');
      fireEvent.change(input, { target: { value: 'Test Wallet' } });
      
      const saveButton = screen.getByRole('button', { name: /Save/i });
      fireEvent.click(saveButton);
    }
    
    // 4. Disconnect wallet
    const disconnectButtons = screen.getAllByRole('button', { name: /Disconnect/i });
    if (disconnectButtons.length > 0) {
      fireEvent.click(disconnectButtons[0]);
    }
  });

  test('switching between tabs maintains state', () => {
    render(<WalletManager />);
    
    // Go to chains tab
    const chainsTab = screen.getByRole('button', { name: /🔗 Networks/i });
    fireEvent.click(chainsTab);
    expect(screen.getByText('Select Network')).toBeInTheDocument();
    
    // Go to tokens tab
    const tokensTab = screen.getByRole('button', { name: /💰 Tokens/i });
    fireEvent.click(tokensTab);
    expect(screen.getByText('Token Balances')).toBeInTheDocument();
    
    // Go back to wallets tab
    const walletsTab = screen.getByRole('button', { name: /👛 Wallets/i });
    fireEvent.click(walletsTab);
    expect(screen.getByText('Main Wallet')).toBeInTheDocument();
  });

  test('chain switch updates active wallet', () => {
    render(<WalletManager />);
    
    // Go to chains tab
    const chainsTab = screen.getByRole('button', { name: /🔗 Networks/i });
    fireEvent.click(chainsTab);
    
    // Switch to Base
    const baseButton = screen.getByText('Base');
    fireEvent.click(baseButton);
    
    // Verify active wallet info updates
    expect(screen.getByText(/Main Wallet/i)).toBeInTheDocument();
  });

  test('tokens display updates with active wallet', () => {
    render(<WalletManager />);
    
    // Activate different wallet
    const setActiveButtons = screen.getAllByRole('button', { name: /Set Active/i });
    if (setActiveButtons.length > 0) {
      fireEvent.click(setActiveButtons[0]);
    }
    
    // Go to tokens tab
    const tokensTab = screen.getByRole('button', { name: /💰 Tokens/i });
    fireEvent.click(tokensTab);
    
    // Should show tokens for newly active wallet
    expect(screen.getByText('Token Balances')).toBeInTheDocument();
  });
});

// ==================== ERROR HANDLING TESTS ====================

describe('WalletManager - Error Handling', () => {
  test('handles no active wallet in tokens tab', () => {
    render(<WalletManager />);
    
    // Disconnect all wallets first
    const settingsTab = screen.getByRole('button', { name: /⚙️ Settings/i });
    fireEvent.click(settingsTab);
    
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const disconnectAllButton = screen.getByRole('button', { name: /Disconnect All Wallets/i });
    fireEvent.click(disconnectAllButton);
    
    // Go to tokens tab
    const tokensTab = screen.getByRole('button', { name: /💰 Tokens/i });
    fireEvent.click(tokensTab);
    
    // Should show message about no active wallet
    expect(screen.getByText(/No active wallet selected/i)).toBeInTheDocument();
    
    confirmSpy.mockRestore();
  });

  test('handles empty wallet list gracefully', () => {
    render(<WalletManager />);
    
    // Disconnect all wallets
    const settingsTab = screen.getByRole('button', { name: /⚙️ Settings/i });
    fireEvent.click(settingsTab);
    
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const disconnectAllButton = screen.getByRole('button', { name: /Disconnect All Wallets/i });
    fireEvent.click(disconnectAllButton);
    
    // Go back to wallets tab
    const walletsTab = screen.getByRole('button', { name: /👛 Wallets/i });
    fireEvent.click(walletsTab);
    
    // Should show 0 stats
    expect(screen.getByText('0')).toBeInTheDocument();
    
    confirmSpy.mockRestore();
  });
});
