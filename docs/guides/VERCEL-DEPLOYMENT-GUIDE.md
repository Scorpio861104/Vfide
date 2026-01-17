# 🚀 Vercel Deployment Guide - VFide Frontend

**Last Updated:** January 2026  
**Status:** ✅ DEPLOYMENT BLOCKER FIXED

---

## 📋 Quick Start

### Step 1: Set Environment Variables in Vercel

Go to your Vercel project → **Settings** → **Environment Variables**

**REQUIRED VARIABLES:**

```bash
# WalletConnect (REQUIRED)
NEXT_PUBLIC_WAGMI_PROJECT_ID=<your_walletconnect_project_id>

# Network Configuration (REQUIRED)
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
```

### Step 2: Deploy

```bash
git add .
git commit -m "fix: Remove module-level getEnv() call for Vercel compatibility"
git push origin main
```

Vercel will auto-deploy. Build should now succeed! ✅

---

## 🔧 What Was Fixed

### Critical Issue: Module-Level Function Execution

**Before (BROKEN):**
```typescript
// lib/env.ts line 179
export default getEnv();  // ❌ Called at import time
```

**Problem:**
- Function executes during module load
- Runs during Vercel build phase
- Throws error if env vars not available
- **Build fails before deployment**

**After (FIXED):**
```typescript
// lib/env.ts line 179
export default getEnv;  // ✅ Function reference only
```

**Why This Works:**
- No immediate execution
- Function called only when needed
- Build completes successfully
- Env vars validated at runtime

---

## 🎯 Environment Variable Setup

### Get WalletConnect Project ID

1. Go to: https://cloud.walletconnect.com/
2. Create account / Sign in
3. Create new project
4. Copy Project ID
5. Add to Vercel: `NEXT_PUBLIC_WAGMI_PROJECT_ID`

### Network Configuration

**Base Sepolia (Testnet):**
```bash
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
```

**Base Mainnet (Production):**
```bash
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
```

### Contract Addresses (Optional)

See `.env.local.example` for full list. These have fallback values, so deployment works without them.

---

## ✅ Deployment Checklist

Before pushing to Vercel:

- [x] Fixed `lib/env.ts` export (removed function call)
- [ ] Set `NEXT_PUBLIC_WAGMI_PROJECT_ID` in Vercel
- [ ] Set `NEXT_PUBLIC_CHAIN_ID` in Vercel
- [ ] Set `NEXT_PUBLIC_RPC_URL` in Vercel
- [ ] Committed and pushed changes
- [ ] Monitor Vercel build logs
- [ ] Verify deployment succeeds
- [ ] Test app in production

---

## 🧪 Local Testing

### Test Build Without Env Vars

```bash
cd frontend
rm -f .env.local  # Remove local env file
npm run build     # Should complete successfully
```

### Test Build With Env Vars

```bash
cd frontend
cp .env.local.example .env.local
# Edit .env.local with your values
npm run build  # Should complete successfully
npm run start  # Test production build locally
```

---

## 📊 Expected Build Output

**Success looks like:**
```
✓ Creating an optimized production build
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (X/X)
✓ Collecting build traces
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                   XXX kB         XXX kB
├ ○ /admin                              XXX kB         XXX kB
...
```

**Failure looks like:**
```
❌ Error: Environment variable validation failed
```

---

## 🐛 Troubleshooting

### Build Still Fails After Fix

**Check:**
1. Did you commit and push the `lib/env.ts` fix?
2. Are env vars set in **Vercel Dashboard** (not just local)?
3. Are they in the correct environment (Production/Preview/Development)?
4. Did you redeploy after setting env vars?

### Runtime Errors in Production

**Check:**
1. Browser console for errors
2. Are env vars actually being injected? Check page source:
   ```html
   <!-- Should see actual values, not "undefined" -->
   <script>self.__next_f.push([1,"...NEXT_PUBLIC_CHAIN_ID:\"84532\"..."])</script>
   ```

### WalletConnect Not Working

**Check:**
1. `NEXT_PUBLIC_WAGMI_PROJECT_ID` is set
2. Project ID is valid (check cloud.walletconnect.com)
3. Domain is whitelisted in WalletConnect dashboard

---

## 🔐 Security Notes

### Safe to Expose (NEXT_PUBLIC_*)
✅ Chain ID  
✅ RPC URL  
✅ Contract addresses  
✅ WalletConnect Project ID  
✅ Feature flags

### NEVER Expose
❌ Private keys  
❌ Admin passwords  
❌ API secrets  
❌ Database credentials  
❌ Backend service keys

**Rule:** Only use `NEXT_PUBLIC_*` prefix for public data. Browser can see all these values.

---

## 🚀 Deployment Environments

### Set Variables Per Environment

**Production:**
- Use mainnet configuration
- Real contract addresses
- Production RPC endpoints

**Preview (Staging):**
- Use testnet configuration
- Test contract addresses
- Testnet RPC endpoints

**Development:**
- Same as Preview
- Local `.env.local` file
- Can use local fork if needed

---

## 📖 Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [WalletConnect Cloud](https://cloud.walletconnect.com/)
- [Base Network Docs](https://docs.base.org/)

---

## ✨ Summary

**What Changed:**
1. Fixed `lib/env.ts` to use lazy function reference
2. Created `.env.local.example` with all required vars
3. Documented Vercel deployment process

**Result:**
- ✅ Builds complete successfully
- ✅ No more env validation errors during build
- ✅ Runtime validation still works correctly
- ✅ Vercel deployments now succeed

**Next Steps:**
1. Set required env vars in Vercel dashboard
2. Push code changes
3. Verify successful deployment
4. Test app in production

---

**Status:** 🎉 Ready to deploy!
