# Frontend Testing Setup Guide

## 🖥️ For Deployer: Running the Frontend

### Step 1: Deploy Contracts First
```bash
cd /workspaces/Vfide
export PRIVATE_KEY=0x_your_key_
forge script script/Deploy.s.sol:DeployVfide \
  --fork-url https://ethereum-sepolia-rpc.publicnode.com \
  --broadcast -vvv
```

Save all the deployed addresses from the output!

---

### Step 2: Configure Frontend

```bash
cd /workspaces/Vfide/frontend

# Copy testnet config
cp .env.testnet.example .env.local

# Edit with your deployed addresses
nano .env.local
```

Fill in ALL the `0x_FILL_AFTER_DEPLOY_` values with real addresses.

---

### Step 3: Install & Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will be available at: **http://localhost:3000**

---

### Step 4: Share With Testers

**Option A: Local Network (Same WiFi)**
1. Find your computer's IP: `hostname -I`
2. Share: `http://YOUR_IP:3000`
3. Testers connect on same network

**Option B: Tunnel (Recommended for remote testers)**
```bash
# Install ngrok (one time)
npm install -g ngrok

# In another terminal, create tunnel
ngrok http 3000
```
Share the `https://xxxxx.ngrok.io` URL with testers.

**Option C: Deploy to Vercel (Permanent)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

---

## 👥 For Testers: Using the Frontend

### Step 1: Get the URL
Ask the Deployer for the frontend URL:
- Local: `http://192.168.x.x:3000`
- Tunnel: `https://xxxxx.ngrok.io`
- Deployed: `https://vfide-testnet.vercel.app`

**URL:** ________________________________

---

### Step 2: Connect Your Wallet

1. Open the frontend URL in browser
2. Click "Connect Wallet" (top right)
3. Select MetaMask
4. **Important:** Switch to Sepolia network in MetaMask
5. Approve the connection

---

### Step 3: Test By Page

Each page tests different features:

| Page | URL | What to Test |
|------|-----|--------------|
| **Home** | `/` | Overview, connect wallet |
| **Token Launch** | `/token-launch` | Buy presale tokens |
| **Vault** | `/vault` | Create vault, deposit/withdraw |
| **Merchant** | `/merchant` | Register as merchant |
| **Pay** | `/pay` | Make payments |
| **Dashboard** | `/dashboard` | View balances, score |
| **Governance** | `/governance` | DAO proposals |
| **Guardians** | `/guardians` | Security features |

---

## 🧪 Frontend Test Checklist

### Wallet Connection
☐ Connect MetaMask works  
☐ Shows correct network (Sepolia)  
☐ Shows wallet address  
☐ Disconnect works  

### Token Launch Page (`/token-launch`)
☐ Shows 3 tiers ($0.03, $0.05, $0.07)  
☐ Shows tier availability  
☐ Can select lock period  
☐ Buy with ETH works  
☐ Shows allocation after purchase  

### Vault Page (`/vault`)
☐ Create vault button works  
☐ Shows vault address after creation  
☐ Deposit tokens works  
☐ Shows vault balance  
☐ Withdraw works  

### Dashboard (`/dashboard`)
☐ Shows token balance  
☐ Shows ProofScore  
☐ Shows trust tier  
☐ Data updates after transactions  

### Merchant Page (`/merchant`)
☐ Register merchant works  
☐ Shows merchant status  
☐ Shows pending payments  

### Pay Page (`/pay`)
☐ Can enter merchant address  
☐ Can enter amount  
☐ Shows fee preview  
☐ Payment works  

### Guardians Page (`/guardians`)
☐ Shows guardian requirements  
☐ Register as guardian works  
☐ Shows stake info  

---

## 🐛 Frontend Bug Report

**Page:** ________________________________

**What You Clicked:** ________________________________

**What Happened:**


**What Should Have Happened:**


**Console Errors (F12 → Console):**
```


```

**Screenshot:** ☐ Attached

---

## ⚠️ Common Frontend Issues

### "Wrong Network"
→ Switch MetaMask to Sepolia

### "Transaction Failed"
→ Check you have Sepolia ETH for gas

### Page shows "0x0000..."
→ Deployer needs to update .env.local with real addresses

### "Cannot read property of undefined"
→ Contract may not be deployed, check with Deployer

### Wallet won't connect
→ Try refreshing page
→ Try disconnecting/reconnecting in MetaMask
→ Try clearing browser cache

---

## 📱 Mobile Testing

The frontend should work on mobile browsers:

1. Open URL on phone browser
2. MetaMask mobile app will open automatically
3. Approve connection
4. Test same features

☐ iOS Safari + MetaMask works  
☐ Android Chrome + MetaMask works  

---

## 🚀 Quick Start Summary

**Deployer:**
1. Deploy contracts
2. Copy addresses to `.env.local`
3. `npm run dev`
4. Share URL with testers

**Testers:**
1. Get URL from Deployer
2. Connect wallet (Sepolia network)
3. Test assigned pages
4. Report bugs with screenshots
