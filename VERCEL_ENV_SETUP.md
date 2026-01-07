# Vercel Environment Variables Setup

## Critical: WalletConnect Project ID

Your app needs a **WalletConnect Project ID** to enable wallet connections. Without this, wallets won't connect properly.

### Quick Setup (5 minutes):

1. **Get WalletConnect Project ID:**
   - Go to: https://cloud.walletconnect.com/
   - Sign in with GitHub (free)
   - Click "Create Project"
   - Name it: `VFIDE`
   - Copy the **Project ID**

2. **Add to Vercel:**
   ```bash
   # Using Vercel CLI (recommended):
   vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
   # Paste your project ID when prompted
   # Select: Production, Preview, Development (all three)
   ```

   **OR** via Vercel Dashboard:
   - Go to: https://vercel.com/vanta-ciphers-projects/vfide-frontend/settings/environment-variables
   - Add new variable:
     - **Key:** `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
     - **Value:** Your WalletConnect Project ID
     - **Environment:** All (Production, Preview, Development)

3. **Redeploy:**
   ```bash
   vercel deploy --prod
   ```
   OR trigger redeploy in Vercel dashboard

## Other Important Variables (Already Set)

These are already configured from the deployment script:

### Network Config:
- `NEXT_PUBLIC_DEFAULT_CHAIN_ID` = `300` (zkSync Era)
- Base Sepolia support is built-in

### Contract Addresses (Base Sepolia):
- `NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS`
- `NEXT_PUBLIC_VFIDE_PRESALE_ADDRESS`
- `NEXT_PUBLIC_VAULT_HUB_ADDRESS`
- `NEXT_PUBLIC_SEER_ADDRESS`
- `NEXT_PUBLIC_DAO_ADDRESS`
- And 10+ more contracts

## Current Status

✅ **Working without WalletConnect ID:**
- MetaMask direct injection works
- Coinbase Wallet works

❌ **Not working without WalletConnect ID:**
- WalletConnect QR code connections
- Mobile wallet deep linking
- Some wallet discovery features

## For Local Development

Create `frontend/.env.local`:
```bash
# Required
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Optional (defaults work fine for Base Sepolia testnet)
NEXT_PUBLIC_IS_TESTNET=true
```

## Verify Setup

After setting the WalletConnect ID and redeploying:
1. Open your site
2. Click "Connect Wallet"
3. Check if WalletConnect option appears
4. Test connecting with MetaMask mobile using QR code

## Need Help?

- WalletConnect docs: https://docs.walletconnect.com/
- Vercel env vars: https://vercel.com/docs/concepts/projects/environment-variables
- Check browser console for "WalletConnect" errors if issues persist
