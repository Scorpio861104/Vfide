# 🚀 Quick Start: Install & Run VFIDE

## Step 1: Install Dependencies

```bash
cd /workspaces/Vfide/frontend
npm install
```

This will install the new Web3 packages we added:
- `wagmi` - React hooks for Ethereum
- `viem` - Ethereum library
- `@tanstack/react-query` - Data fetching
- `@rainbow-me/rainbowkit` - Wallet UI

## Step 2: Get WalletConnect Project ID

1. Go to https://cloud.walletconnect.com/
2. Create free account
3. Create new project
4. Copy your Project ID

## Step 3: Add Environment Variables

Create `.env.local` in `/frontend/`:

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

## Step 4: Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Step 5: Try It Out!

### **Test Demo Mode:**
1. Click "🎮 Try Demo Mode" button (bottom right)
2. Play through 4-step tutorial
3. See confetti celebration!

### **Test Beginner Wizard:**
1. Click "🎓 New Here?" in navbar
2. Follow 5-step wizard
3. Install MetaMask if you don't have it

### **Test Wallet Connection:**
1. Click "Connect Wallet" in navbar
2. Choose MetaMask or Coinbase Wallet
3. Approve connection
4. See your address in navbar!

---

## 🎯 What You'll See

### **Homepage:**
- Particle network background ✨
- Floating VFIDE logo with glow
- Animated counters
- 3D holographic cards
- Typewriter cycling text

### **New UI Elements:**
- "Connect Wallet" button (top right)
- "🎓 New Here?" button (navbar)
- "🎮 Try Demo Mode" button (bottom right)

### **Interactive Features:**
- 5-step beginner wizard
- 4-step demo mode tutorial
- Guardian setup wizard (coming soon)

---

## 🔧 If Something Breaks

### **Common Issues:**

**"Module not found: Can't resolve 'wagmi'"**
```bash
npm install wagmi viem@2.x @tanstack/react-query @rainbow-me/rainbowkit
```

**"WalletConnect project ID not found"**
- Add `.env.local` file with your project ID
- Restart dev server

**"React Query hydration error"**
- This is normal on first load
- Refresh page

**"BeginnerWizard not showing"**
- Make sure you're NOT already connected
- It only shows for new users

---

## 📱 Test on Mobile

### **Method 1: Local Network**
```bash
npm run dev -- -H 0.0.0.0
```
Then visit `http://your-ip:3000` on phone

### **Method 2: Ngrok**
```bash
npx ngrok http 3000
```
Use the https URL on phone

---

## 🎨 Customization

### **Change Theme Colors:**
Edit `/frontend/lib/wagmi.ts`:
```ts
theme={darkTheme({
  accentColor: '#00F0FF',  // Change this!
  accentColorForeground: '#1A1A1D',
  borderRadius: 'medium',
})}
```

### **Change Wizard Steps:**
Edit `/frontend/components/BeginnerWizard.tsx`:
```ts
const steps: Step[] = [
  { /* Add your custom steps here */ }
];
```

### **Change Demo Scenarios:**
Edit `/frontend/components/DemoMode.tsx`:
```ts
const steps: DemoStep[] = [
  { /* Customize demo flow */ }
];
```

---

## 🚀 Deploy to Production

### **Vercel (Recommended):**
```bash
npm install -g vercel
vercel
```

### **Netlify:**
```bash
npm run build
netlify deploy --dir=.next
```

### **Environment Variables:**
Don't forget to add `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in your hosting platform!

---

## 📚 Documentation

- **Full Integration Guide:** `3RD-GRADE-INTEGRATION-COMPLETE.md`
- **System Audit:** `COMPLETE-SYSTEM-AUDIT.md`
- **Summary:** `INTEGRATION-SUMMARY.md`
- **Visual Guide:** `DUNGEON-LEVEL-FRONTEND.md`

---

## 🎯 Next Steps

1. ✅ Install packages
2. ✅ Run dev server
3. ✅ Test demo mode
4. ✅ Test wallet connection
5. ⏳ Add contract addresses (see `useSimpleVault.ts`)
6. ⏳ Deploy to testnet
7. ⏳ User testing with real kids
8. ⏳ Production launch!

---

**Need help?** Check the FAQ page or create an issue on GitHub.

🎉 **Have fun building the future of payments!**
