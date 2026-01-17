# Wallet Connection Setup Guide

## Issue: Only Coinbase Wallet Works

If you're experiencing an issue where only Coinbase Wallet is clickable/functional and MetaMask or other wallets don't respond, the most common cause is a missing or invalid **WalletConnect Project ID**.

## Why is a WalletConnect Project ID Required?

RainbowKit v2 requires a valid WalletConnect Project ID for proper wallet initialization, especially for:
- MetaMask
- Rainbow Wallet  
- Mobile wallet connections
- Browser extension wallets

Without a valid project ID, these wallets may appear in the modal but won't function when clicked.

## How to Fix

### Step 1: Get a Free WalletConnect Project ID

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Sign up or log in
3. Create a new project
4. Copy your Project ID

### Step 2: Add to Environment Variables

Create or update your `.env` or `.env.local` file in the project root:

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

### Step 3: Restart Your Development Server

```bash
npm run dev
```

## Verification

After adding a valid Project ID, all wallet options should work:
- ✅ MetaMask
- ✅ Coinbase Wallet
- ✅ Browser Wallet (injected wallets)
- ✅ WalletConnect (mobile)

## Development/Testing Without Project ID

The application will work without a Project ID for basic testing, but with limited functionality:
- ⚠️ MetaMask may not connect properly
- ⚠️ Mobile wallets won't work
- ⚠️ Some browser extension wallets may fail
- ✅ Coinbase Wallet may partially work (has its own SDK)

You'll see a warning in the browser console:
```
[VFIDE Wallet Config] No WalletConnect Project ID detected.
Wallet connections may not work properly, especially for MetaMask and mobile wallets.
```

## Production Deployment

**Important:** Always set a valid WalletConnect Project ID in production. Add it to your hosting platform's environment variables:

- **Vercel:** Settings → Environment Variables
- **Netlify:** Site settings → Environment variables
- **Railway:** Variables tab
- **Docker:** Add to docker-compose.yml or .env file

## References

- [WalletConnect Cloud](https://cloud.walletconnect.com/)
- [RainbowKit Documentation](https://rainbowkit.com/)
- [RainbowKit Custom Wallet List](https://rainbowkit.com/docs/custom-wallet-list)

## Related Issues

- [RainbowKit #1882](https://github.com/rainbow-me/rainbowkit/discussions/1882) - Cannot connect to wallet on mobile
- [RainbowKit #2074](https://github.com/rainbow-me/rainbowkit/issues/2074) - Not redirecting to MetaMask
- [Stack Overflow](https://stackoverflow.com/questions/76051023/rainbow-kit-connect-wallet-not-working-properly) - Connect wallet not working properly
