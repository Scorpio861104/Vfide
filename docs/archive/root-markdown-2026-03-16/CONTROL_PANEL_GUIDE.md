# Owner/DAO Control Panel Frontend

## Overview

The Owner/DAO Control Panel is a comprehensive web interface for managing the VFIDE protocol. It provides unified access to all administrative functions through an intuitive, single-page application.

## Features

### 1. System Overview Dashboard
- Real-time system status monitoring
- Health indicators for all major components
- Quick action buttons for common tasks
- Recent activity feed

### 2. Howey-Safe Mode Management
- **Batch Controls**: Enable/disable all contracts at once
- **Individual Controls**: Manage each contract separately
- **Visual Status**: Clear indicators showing safe/unsafe status
- **Compliance Info**: Built-in documentation about Howey Test

Contracts Managed:
- DutyDistributor (Governance rewards)
- CouncilSalary (Council payments)
- CouncilManager (Council management)
- PromotionalTreasury (Promotional rewards)
- LiquidityIncentives (LP staking rewards)

### 3. Auto-Swap Configuration
- Configure DEX router for VFIDE → stablecoin swaps
- Set preferred stablecoin (USDC, USDT, DAI)
- Adjust slippage tolerance (1-5%)
- Quick USDC setup button
- Enable/disable toggle

### 4. Token Management
- Module configuration (VaultHub, SecurityHub, Ledger, Router)
- Treasury and Sanctum sinks
- Whitelist/Blacklist management
- Anti-whale settings
- Vault-only mode
- Policy locking
- Circuit breaker

### 5. Fee Management
- Fee curve configuration (min/max BPS)
- Sustainability controls
- Adaptive fee settings
- Volume-based multipliers

### 6. Ecosystem Management
- Manager permissions
- Pool allocations (Council, Merchant, Headhunter)
- Operations wallet configuration

### 7. Emergency Controls
- **Pause All**: Emergency stop for entire protocol
- **Resume All**: Resume normal operations
- **Circuit Breaker**: Token-level emergency stop
- **Fund Recovery**: Rescue stuck tokens

### 8. Quick Production Setup
- **Safe Defaults**: One-click setup with Howey-safe ON, auto-swap OFF
- **With Auto-Swap**: Full-featured setup with stablecoin payments enabled

### 9. Transaction History
- View recent administrative actions
- Transaction status tracking
- Detailed parameters for each action

## Architecture

```
/app/control-panel/
├── page.tsx                          # Main control panel page
├── config/
│   └── contracts.ts                  # Contract addresses and ABIs
└── components/
    ├── ConnectWalletPrompt.tsx       # Wallet connection UI
    ├── SystemStatusPanel.tsx         # System overview dashboard
    ├── HoweySafeModePanel.tsx        # Howey-safe mode controls
    ├── AutoSwapPanel.tsx             # Auto-swap configuration
    ├── TokenManagementPanel.tsx      # Token settings
    ├── FeeManagementPanel.tsx        # Fee configuration
    ├── EcosystemPanel.tsx            # Ecosystem settings
    ├── EmergencyPanel.tsx            # Emergency controls
    ├── ProductionSetupPanel.tsx      # Quick setup
    └── TransactionHistory.tsx        # Transaction log
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **React**: v19
- **Web3**: wagmi + viem
- **Wallet**: RainbowKit
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Animations**: Framer Motion

## Setup

### 1. Configuration

Edit `/app/control-panel/config/contracts.ts`:

```typescript
// Replace with your deployed OwnerControlPanel address
export const OWNER_CONTROL_PANEL_ADDRESS = '0xYourContractAddress';
```

### 2. Access

Navigate to: `https://your-domain.com/control-panel`

### 3. Connect Wallet

- Click "Connect Wallet"
- Use the owner/multisig wallet address
- Grant permissions as needed

## Usage Examples

### Example 1: Initial Production Setup

1. Navigate to **Quick Setup** tab
2. Enter DEX router address (e.g., SyncSwap router)
3. Enter USDC token address
4. Click **"Setup with Auto-Swap"**
5. Confirm transaction
6. Verify in **System Overview**

### Example 2: Enable All Howey-Safe Mode

1. Navigate to **Howey-Safe Mode** tab
2. Click **"Enable All (Recommended)"**
3. Confirm transaction
4. Verify all contracts show "SAFE ✓"

### Example 3: Configure Auto-Swap

1. Navigate to **Auto-Swap** tab
2. Enter DEX router address
3. Enter stablecoin address
4. Set slippage tolerance (e.g., 100 = 1%)
5. Toggle **"Enable Auto-Swap"**
6. Confirm transaction

### Example 4: Emergency Pause

1. Navigate to **Emergency** tab
2. Click **"Pause All Systems"**
3. Confirm transaction (⚠️ use with caution!)
4. System enters maintenance mode

## Security

### Access Control

- ✅ Owner-only functions (multisig recommended)
- ✅ Wallet connection required
- ✅ Transaction confirmation for all actions
- ✅ Clear warnings for dangerous operations

### Best Practices

1. **Use Multisig**: Always use a multisig wallet as owner
2. **Test First**: Test on testnet before mainnet
3. **Verify Transactions**: Review all transaction parameters
4. **Enable Safe Mode**: Keep Howey-safe mode ON for compliance
5. **Monitor Status**: Regularly check system status
6. **Document Changes**: Keep records of all configuration changes

### Dangerous Operations

⚠️ **Use Extreme Caution**:
- Disabling Howey-safe mode (legal risk!)
- Emergency pause (stops protocol)
- Circuit breaker (stops transfers)
- Policy locking (ONE-WAY, irreversible!)

## Troubleshooting

### Wallet Not Connected
**Problem**: Page shows "Connect Wallet" prompt  
**Solution**: Click connect button and select your wallet

### Transaction Fails
**Problem**: Transaction reverts or fails  
**Solution**:
- Check you're using the owner address
- Verify sufficient gas
- Check contract is deployed
- Review transaction parameters

### Status Not Updating
**Problem**: Status shows stale data  
**Solution**:
- Refresh page
- Check network connection
- Verify contract address is correct

### Wrong Network
**Problem**: Wallet connected to wrong chain  
**Solution**: Switch to correct network in wallet

## Development

### Adding New Features

1. **Create Component**: Add new panel component in `/components/`
2. **Add to Navigation**: Update tabs array in `page.tsx`
3. **Add Contract Function**: Update ABI in `config/contracts.ts`
4. **Implement Logic**: Use wagmi hooks for contract interaction

### Example: Adding New Panel

```typescript
// 1. Create component
export function NewFeaturePanel() {
  const { writeContractAsync } = useWriteContract();
  
  const handleAction = async () => {
    await writeContractAsync({
      address: OWNER_CONTROL_PANEL_ADDRESS,
      abi: OWNER_CONTROL_PANEL_ABI,
      functionName: 'newFunction',
      args: [param1, param2],
    });
  };
  
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
      {/* Your UI here */}
    </div>
  );
}

// 2. Add to page.tsx tabs
{ id: 'newfeature', label: 'New Feature', icon: '🎯' }

// 3. Add to content section
{activeTab === 'newfeature' && <NewFeaturePanel />}
```

## Roadmap

### Phase 1: Core Implementation ✅
- [x] Basic UI structure
- [x] Wallet connection
- [x] System status dashboard
- [x] Howey-safe mode controls
- [x] Component stubs

### Phase 2: Full Implementation 🚧
- [ ] Complete Auto-Swap panel
- [ ] Complete Token Management panel
- [ ] Complete Fee Management panel
- [ ] Complete Ecosystem panel
- [ ] Complete Emergency panel
- [ ] Complete Production Setup panel

### Phase 3: Enhanced Features 📋
- [ ] Transaction history with blockchain data
- [ ] Real-time event monitoring
- [ ] Batch operations
- [ ] Configuration presets
- [ ] Export/import settings
- [ ] Multi-language support

### Phase 4: Advanced Features 📋
- [ ] Analytics dashboard
- [ ] Automated monitoring/alerts
- [ ] Role-based access control
- [ ] Audit trail
- [ ] Mobile app
- [ ] API integration

## Testing

### Manual Testing

1. **Connect Wallet**: Verify connection flow
2. **View Status**: Check all status panels load
3. **Toggle Settings**: Test enable/disable functions
4. **Confirm Transactions**: Verify metamask prompts appear
5. **Check Updates**: Verify status updates after transactions

### Automated Testing

```bash
# Run component tests
npm test app/control-panel

# Run E2E tests
npm run test:e2e control-panel
```

## Support

For issues or questions:
- GitHub: [Open an issue](https://github.com/YourRepo/issues)
- Discord: Join our server
- Documentation: [Full docs](https://docs.vfide.io)

## License

MIT License - see LICENSE file for details

---

**Version**: 1.0.0  
**Last Updated**: January 29, 2026  
**Status**: Beta (Core features implemented, full implementation in progress)
