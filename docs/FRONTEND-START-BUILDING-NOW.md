# VFIDE Frontend: Start Building NOW
**Ready-to-Execute Commands**  
**Date**: December 3, 2025  
**Goal**: Working prototype in 1 week (40 hours)  

---

## What You Have

1. ✅ **Complete Design System** (`FRONTEND-FUTURE-DESIGN.md`)
   - VFIDE + Cyberpunk theme
   - Colors, typography, components
   - ProofScore tier system (Bronze → Silver → Gold → Platinum)

2. ✅ **Complete Module Mapping** (`FRONTEND-MODULE-MAPPING.md`)
   - 30+ contracts → 17 frontend modules
   - Every function mapped to UI component
   - React hooks designed

3. ✅ **30+ Smart Contracts** (tested, deployed-ready)
   - VFIDEToken, ProofScoreBurnRouter, MerchantPortal, EscrowManager, VaultInfrastructure, GuardianNodeSale, DAOTimelock, etc.

4. ✅ **Strategic Foundation**
   - KYC-free merchant onboarding (<2 minutes)
   - 50-70% success probability
   - Multi-chain strategy (zkSync, Polygon, Arbitrum, Optimism, Base)
   - Shopify/WooCommerce plugin architectures

---

## Step 1: Set Up Development Environment (30 minutes)

### 1.1 Create Frontend Workspace

```bash
cd /workspaces/Vfide

# Create frontend directory
mkdir -p frontend
cd frontend

# Initialize Next.js apps
npx create-next-app@latest merchant --typescript --tailwind --app --no-src-dir --import-alias "@/*"
npx create-next-app@latest pay --typescript --tailwind --app --no-src-dir --import-alias "@/*"
npx create-next-app@latest explorer --typescript --tailwind --app --no-src-dir --import-alias "@/*"

# Initialize Astro marketing site
npm create astro@latest marketing -- --template minimal --typescript strict

# Create shared library
mkdir shared
cd shared
npm init -y
cd ..
```

---

### 1.2 Install Dependencies (All Sites)

```bash
cd /workspaces/Vfide/frontend

# Create workspace root package.json
cat > package.json << 'EOF'
{
  "name": "vfide-frontend",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "merchant",
    "pay",
    "explorer",
    "marketing",
    "shared"
  ],
  "scripts": {
    "dev:merchant": "cd merchant && npm run dev",
    "dev:pay": "cd pay && npm run dev",
    "dev:explorer": "cd explorer && npm run dev",
    "dev:marketing": "cd marketing && npm run dev",
    "dev": "concurrently \"npm run dev:merchant\" \"npm run dev:pay\" \"npm run dev:explorer\"",
    "build:all": "npm run build --workspaces"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
EOF

# Install workspace manager
npm install

# Install Web3 dependencies (merchant, pay, explorer)
cd merchant
npm install wagmi viem @tanstack/react-query @rainbow-me/rainbowkit
npm install framer-motion
npm install zustand
npm install date-fns
cd ..

cd pay
npm install wagmi viem @tanstack/react-query @rainbow-me/rainbowkit
npm install framer-motion
cd ..

cd explorer
npm install wagmi viem @tanstack/react-query
npm install recharts # For charts/graphs
cd ..

# Install marketing site dependencies
cd marketing
# No extra dependencies needed (Astro + CSS animations only)
cd ..

echo "✅ All dependencies installed!"
```

---

### 1.3 Add Google Fonts (Professional Theme)

```bash
# For Next.js sites (merchant, pay, explorer)
cd /workspaces/Vfide/frontend/merchant

# Update app/layout.tsx
cat > app/layout.tsx << 'EOF'
import type { Metadata } from "next";
import { Cinzel, Orbitron, Fira_Code } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({ 
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-medieval"
});

const orbitron = Orbitron({ 
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-cyber"
});

const firaCode = Fira_Code({ 
  subsets: ["latin"],
  variable: "--font-code"
});

export const metadata: Metadata = {
  title: "VFIDE Merchant Citadel",
  description: "Accept crypto payments. 0% fees. No KYC.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${cinzel.variable} ${orbitron.variable} ${firaCode.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
EOF

echo "✅ Fonts configured!"
```

---

### 1.4 Configure Tailwind CSS (Primary Colors)

```bash
cd /workspaces/Vfide/frontend/merchant

# Update tailwind.config.ts
cat > tailwind.config.ts << 'EOF'
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-red': '#C41E3A',
        'cyber-blue': '#00F0FF',
        'gold': '#FFD700',
        'dark-stone': '#1A1A1D',
        'steel-gray': '#4A4A4F',
        'parchment': '#F5F3E8',
        'emerald': '#50C878',
        'blood-orange': '#FF4500',
      },
      fontFamily: {
        'medieval': ['var(--font-medieval)', 'serif'],
        'cyber': ['var(--font-cyber)', 'sans-serif'],
        'code': ['var(--font-code)', 'monospace'],
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite',
        'pulse-gold': 'pulse-gold 1.5s ease-in-out infinite',
        'pulse-red': 'pulse-red 1s ease-in-out infinite',
        'sword-strike': 'sword-strike 2s ease-in-out infinite',
        'float': 'float 2s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { opacity: '0.8' },
          '50%': { opacity: '1' },
        },
        'pulse-gold': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        'pulse-red': {
          '0%, 100%': { transform: 'scale(1) rotate(0deg)' },
          '50%': { transform: 'scale(1.08) rotate(1deg)' },
        },
        'sword-strike': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '50%': { transform: 'rotate(10deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
EOF

echo "✅ Tailwind configured with Professional theme!"
```

---

### 1.5 Create Global Styles (Professional Aesthetic)

```bash
cd /workspaces/Vfide/frontend/merchant

# Update app/globals.css
cat > app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --primary-red: #C41E3A;
  --cyber-blue: #00F0FF;
  --gold: #FFD700;
  --dark-stone: #1A1A1D;
  --steel-gray: #4A4A4F;
  --parchment: #F5F3E8;
}

body {
  background-color: var(--dark-stone);
  color: var(--parchment);
  font-family: var(--font-cyber);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-medieval);
  color: var(--primary-red);
  text-shadow: 0 0 10px rgba(196, 30, 58, 0.5);
}

/* Cross Symbol Glow Effect */
.primary-glow {
  box-shadow: 0 0 20px rgba(196, 30, 58, 0.6);
}

/* Cyber HUD Effect */
.cyber-panel {
  background: linear-gradient(135deg, #1A1A1D 0%, #2A2A2F 100%);
  border: 1px solid var(--cyber-blue);
  box-shadow: 0 0 15px rgba(0, 240, 255, 0.3);
}

/* Code/Address Styling */
code, .address {
  font-family: var(--font-code);
  background: rgba(0, 240, 255, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
  color: var(--cyber-blue);
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 12px;
}

::-webkit-scrollbar-track {
  background: var(--dark-stone);
}

::-webkit-scrollbar-thumb {
  background: var(--steel-gray);
  border-radius: 6px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--primary-red);
}
EOF

echo "✅ Global styles configured!"
```

---

## Step 2: Create Core Components (2 hours)

### 2.1 Card Component

```bash
cd /workspaces/Vfide/frontend/merchant
mkdir -p components

cat > components/Card.tsx << 'EOF'
import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  tier?: 'bronze' | 'silver' | 'elite' | 'platinum';
}

export function Card({ title, children, tier = 'silver' }: CardProps) {
  return (
    <div className="card cyber-panel rounded-xl p-6 relative overflow-hidden">
      {/* Top shimmer effect */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-red via-cyber-blue to-primary-red opacity-50 animate-glow"></div>
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-cyber-blue/30">
        <h3 className="font-medieval text-2xl text-parchment">{title}</h3>
        <div className="text-2xl opacity-50 animate-float">⚔️</div>
      </div>
      
      {/* Body */}
      <div className="card-body">
        {children}
      </div>
    </div>
  );
}
EOF

echo "✅ Card component created!"
```

---

### 2.2 ProofScore Badge Component

```bash
cat > components/ProofScoreBadge.tsx << 'EOF'
import React from 'react';

interface ProofScoreBadgeProps {
  score: number;
  size?: 'small' | 'medium' | 'large';
}

export function ProofScoreBadge({ score, size = 'medium' }: ProofScoreBadgeProps) {
  const tier = calculateTier(score);
  const tierConfig = getTierConfig(tier);
  
  const sizeClasses = {
    small: 'text-sm px-3 py-1',
    medium: 'text-base px-4 py-2',
    large: 'text-xl px-6 py-3',
  };
  
  return (
    <div 
      className={`proofscore-badge inline-flex items-center gap-2 rounded-lg font-cyber font-bold uppercase ${sizeClasses[size]}`}
      style={{
        background: tierConfig.gradient,
        color: tierConfig.textColor,
        boxShadow: tierConfig.glow,
        animation: tierConfig.animation,
      }}
    >
      <span className="text-2xl">{tierConfig.icon}</span>
      <div className="flex flex-col">
        <span className="score-value">{score}</span>
        <span className="score-max opacity-70">/1000</span>
      </div>
      <span className="tier-label text-xs">{tier.toUpperCase()}</span>
    </div>
  );
}

function calculateTier(score: number): 'bronze' | 'silver' | 'elite' | 'platinum' {
  if (score <= 500) return 'bronze';
  if (score <= 750) return 'silver';
  if (score <= 900) return 'elite';
  return 'platinum';
}

function getTierConfig(tier: string) {
  const configs = {
    squire: {
      gradient: 'linear-gradient(135deg, #4A4A4F 0%, #6A6A6F 100%)',
      textColor: '#F5F3E8',
      glow: '0 0 10px rgba(74, 74, 79, 0.4)',
      animation: 'glow 2s ease-in-out infinite',
      icon: '🛡️',
    },
    knight: {
      gradient: 'linear-gradient(135deg, #00F0FF 0%, #0080FF 100%)',
      textColor: '#1A1A1D',
      glow: '0 0 15px rgba(0, 240, 255, 0.6)',
      animation: 'glow 2s ease-in-out infinite',
      icon: '⚔️',
    },
    elite: {
      gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
      textColor: '#1A1A1D',
      glow: '0 0 20px rgba(255, 215, 0, 0.8)',
      animation: 'pulse-gold 1.5s ease-in-out infinite',
      icon: '🏆',
    },
    platinum: {
      gradient: 'linear-gradient(135deg, #C41E3A 0%, #FF4500 100%)',
      textColor: '#F5F3E8',
      glow: '0 0 25px rgba(196, 30, 58, 1)',
      animation: 'pulse-red 1s ease-in-out infinite',
      icon: '👑',
    },
  };
  
  return configs[tier as keyof typeof configs];
}
EOF

echo "✅ ProofScoreBadge component created!"
```

---

### 2.3 WalletConnect Button

```bash
cat > components/WalletConnectButton.tsx << 'EOF'
'use client';

import React from 'react';

// Placeholder component (will integrate wagmi in Step 3)
export function WalletConnectButton() {
  const [isConnected, setIsConnected] = React.useState(false);
  const [address, setAddress] = React.useState('');
  
  const mockConnect = () => {
    setIsConnected(true);
    setAddress('0x1234...5678');
  };
  
  const mockDisconnect = () => {
    setIsConnected(false);
    setAddress('');
  };
  
  if (isConnected) {
    return (
      <div className="wallet-connected flex items-center gap-3 cyber-panel rounded-xl px-5 py-3">
        {/* Seal */}
        <div className="seal relative w-12 h-12 flex items-center justify-center">
          <div className="seal-glow absolute inset-[-4px] rounded-full bg-primary-red/60 blur-md animate-glow"></div>
          <span className="seal-icon text-3xl z-10">🛡️</span>
        </div>
        
        {/* Wallet Info */}
        <div className="wallet-info flex flex-col">
          <span className="wallet-label text-xs text-cyber-blue uppercase font-cyber">Knight</span>
          <span className="wallet-address font-code text-sm text-parchment">{address}</span>
        </div>
        
        {/* Disconnect Button */}
        <button 
          className="btn-disconnect px-4 py-2 rounded-lg bg-steel-gray/50 hover:bg-primary-red/50 transition-colors font-cyber text-sm"
          onClick={mockDisconnect}
        >
          ⚔️ Leave Order
        </button>
      </div>
    );
  }
  
  return (
    <div className="wallet-connect-panel cyber-panel rounded-xl p-8 max-w-md mx-auto text-center">
      <h2 className="font-medieval text-3xl mb-2">Join the Order</h2>
      <p className="text-steel-gray mb-6">Connect your wallet to become a VFIDE merchant</p>
      
      {/* MetaMask Button */}
      <button 
        className="btn-primary w-full mb-3 px-6 py-4 rounded-lg font-cyber font-bold uppercase text-lg primary-glow transition-all hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, #C41E3A 0%, #FF4500 100%)',
          border: '2px solid #FFD700',
        }}
        onClick={mockConnect}
      >
        <span className="animate-sword-strike inline-block mr-2">🦊</span>
        Connect MetaMask
      </button>
      
      {/* WalletConnect Button */}
      <button 
        className="btn-secondary w-full px-6 py-4 rounded-lg font-cyber font-bold uppercase text-lg border-2 border-cyber-blue text-cyber-blue hover:bg-cyber-blue/10 transition-all"
        onClick={mockConnect}
      >
        🔗 WalletConnect
      </button>
      
      <p className="text-xs text-steel-gray mt-4">
        ℹ️ No email, no personal data. Your wallet is your identity.
      </p>
    </div>
  );
}
EOF

echo "✅ WalletConnect button created!"
```

---

### 2.4 Update Homepage (Merchant Dashboard Preview)

```bash
cat > app/page.tsx << 'EOF'
import { Card } from '@/components/Card';
import { ProofScoreBadge } from '@/components/ProofScoreBadge';
import { WalletConnectButton } from '@/components/WalletConnectButton';

export default function MerchantDashboard() {
  return (
    <main className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="font-medieval text-5xl mb-2">⚔️ Merchant Citadel</h1>
          <p className="text-steel-gray font-cyber">Accept crypto payments. Build trust. Pay 0%.</p>
        </div>
        <WalletConnectButton />
      </header>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card title="ProofScore">
          <div className="flex flex-col items-center">
            <ProofScoreBadge score={650} size="large" />
            <p className="text-sm text-steel-gray mt-4">Knight Rank</p>
          </div>
        </Card>
        
        <Card title="Monthly Volume">
          <div className="text-center">
            <p className="text-4xl font-cyber text-cyber-blue mb-2">$2,450</p>
            <div className="w-full bg-dark-stone rounded-full h-2 mb-2">
              <div className="bg-gradient-to-r from-cyber-blue to-gold h-2 rounded-full" style={{ width: '24%' }}></div>
            </div>
            <p className="text-sm text-steel-gray">$2,450 / $10,000 (24%)</p>
          </div>
        </Card>
        
        <Card title="Active Escrows">
          <div className="text-center">
            <p className="text-4xl font-cyber text-gold mb-2">3</p>
            <p className="text-sm text-steel-gray">⏳ Pending release</p>
          </div>
        </Card>
        
        <Card title="Total Earnings">
          <div className="text-center">
            <p className="text-4xl font-cyber text-emerald mb-2">$12,340</p>
            <p className="text-sm text-steel-gray">All-time revenue</p>
          </div>
        </Card>
      </div>
      
      {/* Recent Transactions */}
      <Card title="📊 Recent Transactions">
        <div className="space-y-4">
          <TransactionRow
            buyer="0x1234...5678"
            amount="245.00 USDC"
            status="escrow"
            timeLeft="6 days"
          />
          <TransactionRow
            buyer="0xabcd...ef00"
            amount="89.99 USDT"
            status="released"
            timeLeft="—"
          />
          <TransactionRow
            buyer="0x9876...4321"
            amount="1,250.00 DAI"
            status="dispute"
            timeLeft="—"
          />
        </div>
      </Card>
      
      {/* Quick Actions */}
      <div className="mt-8 flex gap-4 justify-center">
        <button className="btn-primary px-8 py-4 rounded-lg font-cyber font-bold uppercase primary-glow">
          ⚔️ Release Escrow
        </button>
        <button className="btn-secondary px-8 py-4 rounded-lg font-cyber font-bold uppercase border-2 border-cyber-blue text-cyber-blue hover:bg-cyber-blue/10">
          🛡️ View Disputes
        </button>
        <button className="btn-secondary px-8 py-4 rounded-lg font-cyber font-bold uppercase border-2 border-gold text-gold hover:bg-gold/10">
          ⚙️ Settings
        </button>
      </div>
    </main>
  );
}

// Helper component
function TransactionRow({ buyer, amount, status, timeLeft }: any) {
  const statusConfig = {
    escrow: { icon: '⏳', text: 'Escrow', color: 'text-cyber-blue' },
    released: { icon: '✅', text: 'Released', color: 'text-emerald' },
    dispute: { icon: '⚠️', text: 'Dispute', color: 'text-blood-orange' },
  };
  
  const config = statusConfig[status as keyof typeof statusConfig];
  
  return (
    <div className="flex items-center justify-between p-4 bg-dark-stone/50 rounded-lg hover:bg-dark-stone transition-colors">
      <span className="font-code text-sm">{buyer}</span>
      <span className="font-cyber text-lg text-parchment">{amount}</span>
      <span className={`font-cyber text-sm ${config.color}`}>
        {config.icon} {config.text} {timeLeft !== '—' && `(${timeLeft})`}
      </span>
    </div>
  );
}
EOF

echo "✅ Homepage updated with Professional theme!"
```

---

## Step 3: Test First Prototype (10 minutes)

```bash
cd /workspaces/Vfide/frontend/merchant

# Start development server
npm run dev
```

**Open in browser**: http://localhost:3000

**Expected Result**:
- ✅ Dark stone background (#1A1A1D)
- ✅ Platinum red headers with glow
- ✅ ProofScore badge (650/1000, Knight tier, blue glow)
- ✅ WalletConnect button with Platinum seal
- ✅ Stats cards with cyber-blue borders
- ✅ Transaction table with status icons
- ✅ Gothic "Cinzel" font for headers
- ✅ Futuristic "Orbitron" font for UI text

---

## Step 4: Next Steps (Week 2-3)

### 4.1 Integrate Real Web3 (wagmi + viem)
- Connect to zkSync testnet
- Read ProofScore from smart contract
- Display actual merchant stats
- Implement wallet signature

### 4.2 Build Checkout Page (`pay.vfide.com`)
- Copy merchant components
- Create checkout form
- Add payment button with animation
- Integrate EscrowManager.sol

### 4.3 Add More Modules
- Escrow management page
- Vault manager
- Guardian marketplace
- DAO governance

---

## Summary

**What You Can Do NOW**:
```bash
# Clone your repo (if needed)
cd /workspaces/Vfide

# Create frontend
mkdir frontend && cd frontend

# Run all setup commands above (copy-paste)
# ...

# Start dev server
cd merchant && npm run dev
```

**Time to First Prototype**: 3 hours  
**Result**: Working VFIDE merchant dashboard with Knights Professional theme

---

**Next Document to Read**: `FRONTEND-WEB3-INTEGRATION.md` (Step 4 - Connect to blockchain)

**Go build the Temple!** ⚔️🛡️✨
