import { LessonContent } from "@/components/modals/LessonModal";

export const lessonContentData: Record<string, LessonContent> = {
  // ============ BEGINNER LESSONS ============
  "What is VFIDE?": {
    title: "What is VFIDE?",
    duration: "3 min",
    description: "VFIDE is a payment system like Venmo, but with crypto and no fees.",
    sections: [
      {
        heading: "The Problem with Traditional Payment Apps",
        content: "Apps like Venmo, PayPal, and Cash App charge businesses 2.9% + $0.30 per transaction. These fees add up quickly, cutting into merchant profits and ultimately raising prices for consumers.",
        points: [
          "Businesses pay billions annually in payment processing fees",
          "Consumers face higher prices to cover these costs",
          "International transfers are slow and expensive",
          "Your money can be frozen without explanation"
        ]
      },
      {
        heading: "How VFIDE is Different",
        content: "VFIDE uses blockchain technology to eliminate middlemen. Payments go directly from your non-custodial vault to the recipient's vault, with no company controlling your funds.",
        points: [
          "Zero payment processing fees for merchants",
          "Instant global transfers",
          "You control your funds - VFIDE cannot freeze or seize them",
          "Transparent on-chain transactions"
        ]
      },
      {
        heading: "Real-World Use Cases",
        content: "VFIDE works for everyday payments, business transactions, and international remittances. Think of it as crypto made simple enough for mainstream adoption."
      }
    ],
    keyTakeaways: [
      "VFIDE eliminates payment fees using blockchain technology",
      "Your funds stay in YOUR control, not a company's",
      "Instant global payments with no intermediaries",
      "Designed for mainstream users, not just crypto experts"
    ]
  },

  "Your First Wallet": {
    title: "Your First Wallet",
    duration: "5 min",
    description: "Set up MetaMask or Coinbase Wallet in 2 minutes.",
    sections: [
      {
        heading: "What is a Crypto Wallet?",
        content: "A crypto wallet is like a digital keyring that proves ownership of your funds. Unlike a bank account, YOU hold the keys - not a company.",
        points: [
          "Your wallet address is like an email address for money",
          "Your private key (seed phrase) is the password - NEVER share it",
          "Losing your seed phrase means losing access forever",
          "Multiple wallets can exist - desktop, mobile, hardware"
        ]
      },
      {
        heading: "Setting Up MetaMask (Recommended)",
        content: "MetaMask is the most popular crypto wallet, with over 30 million users worldwide.",
        points: [
          "Install the browser extension from metamask.io",
          "Create a new wallet and write down your 12-word seed phrase",
          "Store your seed phrase offline in a safe place (never digital)",
          "Set a strong password for the extension",
          "Test it by sending a small amount first"
        ]
      },
      {
        heading: "Alternative: Coinbase Wallet",
        content: "Coinbase Wallet is another trusted option, especially if you already use Coinbase exchange.",
        points: [
          "Download the mobile app or browser extension",
          "Create a wallet and securely back up your recovery phrase",
          "Coinbase Wallet is separate from Coinbase exchange - you control the keys",
          "Supports easy on-ramp from fiat to crypto"
        ]
      }
    ],
    keyTakeaways: [
      "Your wallet is your key to the blockchain - protect your seed phrase",
      "MetaMask and Coinbase Wallet are beginner-friendly options",
      "NEVER share your seed phrase with anyone, including VFIDE",
      "Write down your seed phrase on paper and store it safely"
    ]
  },

  "Understanding Your Vault": {
    title: "Understanding Your Vault",
    duration: "4 min",
    description: "Wallet = key, Vault = safe. Auto-created on first token deposit.",
    sections: [
      {
        heading: "Wallet vs Vault: What's the Difference?",
        content: "Your wallet is like a key that proves you're you. Your vault is like a smart safe that holds your VFIDE tokens with extra security features.",
        points: [
          "Wallet: Your personal key (you control it)",
          "Vault: Your secure storage (smart contract with rules)",
          "Vaults are non-custodial - only YOU can access your funds",
          "Vaults add security features that wallets don't have"
        ]
      },
      {
        heading: "How Your Vault is Created",
        content: "You don't need to manually create a vault. When someone sends you VFIDE tokens for the first time, your vault is automatically deployed on-chain.",
        points: [
          "First deposit triggers automatic vault creation",
          "Your wallet address = your vault owner",
          "One vault per wallet address",
          "Vault creation is paid by the protocol, not you"
        ]
      },
      {
        heading: "Vault Security Features",
        content: "VFIDE vaults include advanced security that traditional wallets lack.",
        points: [
          "Freeze function: Lock your vault if your wallet is compromised",
          "Guardian recovery: Trusted contacts can help recover access",
          "Abnormal transaction detection: Large transfers require confirmation",
          "Emergency controls: Platform-wide protection in extreme scenarios"
        ]
      }
    ],
    keyTakeaways: [
      "Your wallet is the key, your vault is the safe holding your tokens",
      "Vaults auto-deploy on first deposit - no setup needed",
      "Vaults are non-custodial - VFIDE cannot access your funds",
      "Advanced security features protect against theft and loss"
    ]
  },

  "Making Your First Payment": {
    title: "Making Your First Payment",
    duration: "3 min",
    description: "Click payment link, approve in wallet, done!",
    sections: [
      {
        heading: "How VFIDE Payments Work",
        content: "VFIDE payments are as simple as clicking a link. No complex addresses, no manual gas fee calculations - just click and confirm.",
        points: [
          "Merchants create payment links with preset amounts",
          "You click the link and connect your wallet",
          "Review the payment details (amount, recipient, purpose)",
          "Approve in your wallet - done!"
        ]
      },
      {
        heading: "Step-by-Step Payment Flow",
        content: "Here's exactly what happens when you make a payment:",
        points: [
          "1. Click the merchant's payment link or QR code",
          "2. Connect your wallet (MetaMask popup appears)",
          "3. Review payment details on VFIDE interface",
          "4. Click 'Pay Now' button",
          "5. Approve the transaction in your wallet",
          "6. Wait 3-5 seconds for blockchain confirmation",
          "7. Payment complete - merchant receives funds instantly"
        ]
      },
      {
        heading: "What About Gas Fees?",
        content: "Gas fees are small network fees paid to blockchain validators. On Layer 2 networks like Base, gas fees are typically $0.01-$0.10.",
        points: [
          "Gas fees go to network validators, not VFIDE",
          "Fees are automatically calculated and shown before confirmation",
          "Layer 2 networks have 100x lower fees than Ethereum mainnet",
          "You pay gas in ETH, which your wallet must hold"
        ]
      }
    ],
    keyTakeaways: [
      "VFIDE payments are as easy as clicking a link and confirming",
      "No payment processing fees - only tiny blockchain gas fees",
      "Transactions confirm in seconds, not days",
      "Always review payment details before confirming"
    ]
  },

  "ProofScore Explained": {
    title: "ProofScore Explained",
    duration: "5 min",
    description: "Trust earned through actions, not wealth.",
    sections: [
      {
        heading: "What is ProofScore?",
        content: "ProofScore is VFIDE's reputation system. Unlike credit scores that favor the wealthy, ProofScore measures trustworthy behavior and ecosystem participation.",
        points: [
          "Score ranges from 0 to 10,000 points (displayed as 0-100%)",
          "Higher scores unlock benefits and privileges",
          "Score is calculated on-chain and transparent",
          "Cannot be bought - only earned through actions"
        ]
      },
      {
        heading: "How to Earn ProofScore",
        content: "ProofScore rewards positive actions that benefit the VFIDE ecosystem.",
        points: [
          "Making payments: Consistent usage builds trust",
          "Receiving payments: Others trusting you increases score",
          "Voting in governance: Active participation matters",
          "Setting up guardians: Security-conscious users are rewarded",
          "Earning badges: Achievements contribute to your score",
          "Avoiding disputes: Clean record maintains high score"
        ]
      },
      {
        heading: "ProofScore Tiers & Benefits",
        content: "Your score determines your tier, which unlocks specific benefits:",
        points: [
          "Quarantined (0-9%): Suspected fraud, most actions blocked",
          "Restricted (10-39%): Maximum fees, limited functionality",
          "Monitored (40-53%): Elevated fees, reduced privileges",
          "Standard (54-79%): Normal fees, governance eligible",
          "Elite (80-100%): Lowest fees, full privileges, council eligibility"
        ]
      },
      {
        heading: "Why ProofScore Matters",
        content: "ProofScore creates a meritocracy where trust is earned, not bought. This protects the ecosystem from bad actors while rewarding good behavior. Your score directly affects your transaction fees - higher trust means lower costs."
      }
    ],
    keyTakeaways: [
      "ProofScore measures trust through actions, not wealth (0-100% scale)",
      "Earn points by using VFIDE, voting, and securing your account",
      "Higher scores unlock lower fees and greater privileges",
      "Your score is transparent and verifiable on-chain"
    ]
  },

  // ============ INTERMEDIATE LESSONS ============
  "Setting Up Guardians": {
    title: "Setting Up Guardians",
    duration: "7 min",
    description: "Add trusted guardians for wallet recovery.",
    sections: [
      {
        heading: "The Wallet Recovery Problem",
        content: "Lost your seed phrase? With traditional crypto wallets, your funds are gone forever. VFIDE's Guardian system solves this through social recovery.",
        points: [
          "Most crypto users fear losing their seed phrase",
          "Billions in crypto are lost annually due to lost keys",
          "Social recovery provides a safety net without compromising security",
          "VFIDE vaults support M-of-N guardian recovery"
        ]
      },
      {
        heading: "How Guardian Recovery Works",
        content: "You choose trusted contacts (friends, family, hardware wallets) as guardians. If you lose access, a threshold of guardians can help you recover.",
        points: [
          "You set the threshold (e.g., 2-of-3 guardians must approve)",
          "Guardians can be other wallets, hardware devices, or multisigs",
          "Recovery requires time delays to prevent attacks",
          "You can change guardians anytime you have access"
        ]
      },
      {
        heading: "Setting Up Your Guardians",
        content: "Navigate to Vault Settings and follow these steps:",
        points: [
          "1. Click 'Add Guardian' in your vault dashboard",
          "2. Enter guardian wallet addresses (ask them to send you their address)",
          "3. Set your threshold (recommended: 2-of-3 or 3-of-5)",
          "4. Guardians receive notification to accept their role",
          "5. Test the process with a small recovery simulation"
        ]
      },
      {
        heading: "Choosing Good Guardians",
        content: "Guardian selection is critical. Choose wisely:",
        points: [
          "Pick people you trust who won't collude against you",
          "Use a mix: family, friends, or hardware wallets",
          "Don't tell guardians who the other guardians are (prevents collusion)",
          "Update guardians if relationships change",
          "Consider geographic distribution for disaster resilience"
        ]
      }
    ],
    keyTakeaways: [
      "Guardians provide a safety net if you lose wallet access",
      "Choose trusted contacts and set a secure threshold",
      "Recovery includes time delays to prevent guardian attacks",
      "Guardians are a key advantage over traditional crypto wallets"
    ]
  },

  "Merchant Setup": {
    title: "Merchant Setup",
    duration: "10 min",
    description: "Accept crypto payments with no processor fees.",
    sections: [
      {
        heading: "Why Accept VFIDE Payments?",
        content: "Traditional payment processors charge 2.9% + $0.30 per transaction. For a business doing $100k/year, that's $3,000 in fees. VFIDE charges zero.",
        points: [
          "Zero payment processing fees",
          "Instant settlement - no waiting 2-3 days",
          "No chargebacks or fraud risk",
          "Global payments without currency conversion fees",
          "Customers earn rebates, incentivizing adoption"
        ]
      },
      {
        heading: "Setting Up Your Merchant Account",
        content: "The merchant portal makes it easy to start accepting VFIDE payments:",
        points: [
          "1. Go to /merchant and connect your wallet",
          "2. Fill out your business profile (name, description, logo)",
          "3. Set your default currency preference (VFIDE, USDC, etc.)",
          "4. Generate your merchant ID and API keys",
          "5. Create your first payment link or QR code"
        ]
      },
      {
        heading: "Payment Options",
        content: "VFIDE offers multiple ways to accept payments:",
        points: [
          "Payment Links: Send via text, email, or social media",
          "QR Codes: Print for in-store point-of-sale",
          "Widget Embed: Add payment button to your website",
          "API Integration: Build custom checkout flows",
          "Subscription Billing: Recurring payments for services"
        ]
      },
      {
        heading: "Accounting & Compliance",
        content: "All transactions are recorded on-chain, making accounting transparent:",
        points: [
          "Export transaction history as CSV",
          "Integrate with QuickBooks or Xero via accounting connectors",
          "Tax reporting tools for crypto income",
          "Automatic price conversion at time of sale for tax purposes"
        ]
      }
    ],
    keyTakeaways: [
      "Merchants save thousands annually by eliminating processing fees",
      "Setup takes less than 10 minutes with no approval process",
      "Multiple payment methods: links, QR codes, widgets, API",
      "On-chain transparency simplifies accounting and compliance"
    ]
  },

  "Governance & Voting": {
    title: "Governance & Voting",
    duration: "8 min",
    description: "Shape the future of VFIDE through proposals.",
    sections: [
      {
        heading: "What is DAO Governance?",
        content: "VFIDE is governed by its users through a Decentralized Autonomous Organization (DAO). Token holders and ProofScore earners vote on protocol changes, treasury allocation, and strategic decisions.",
        points: [
          "DAO stands for Decentralized Autonomous Organization",
          "Voting power comes from token holdings AND ProofScore",
          "Proposals are executed on-chain via smart contracts",
          "No central authority can unilaterally change the protocol"
        ]
      },
      {
        heading: "How Voting Power is Calculated",
        content: "VFIDE uses a hybrid voting system that balances wealth and reputation:",
        points: [
          "50% of voting power from token holdings",
          "50% of voting power from ProofScore reputation",
          "This prevents whales from dominating governance",
          "New users with high ProofScore have meaningful influence",
          "Voting power is calculated at snapshot time (prevents buying votes)"
        ]
      },
      {
        heading: "Types of Proposals",
        content: "The DAO votes on several categories of decisions:",
        points: [
          "Protocol Upgrades: Smart contract changes, new features",
          "Treasury Allocation: How to spend DAO funds",
          "Parameter Changes: Fee adjustments, whale limits, thresholds",
          "Grant Funding: Supporting ecosystem development",
          "Emergency Actions: Rapid response to security threats"
        ]
      },
      {
        heading: "How to Participate",
        content: "Participating in governance is straightforward:",
        points: [
          "1. Browse active proposals on /governance",
          "2. Read proposal details, discussion, and arguments",
          "3. Vote For, Against, or Abstain",
          "4. Your vote is recorded on-chain",
          "5. If proposal passes, it executes automatically after timelock"
        ]
      },
      {
        heading: "Creating Your Own Proposal",
        content: "Users with Seer tier (400+ ProofScore) can create proposals:",
        points: [
          "Draft your proposal with clear title, description, and rationale",
          "Specify on-chain actions the proposal will execute",
          "Submit proposal (requires small deposit to prevent spam)",
          "Community discusses during voting period (typically 7 days)",
          "If approved, proposal enters timelock before execution"
        ]
      }
    ],
    keyTakeaways: [
      "VFIDE is community-governed through a DAO",
      "Voting power balances token holdings with ProofScore reputation",
      "Anyone with 400+ ProofScore can create proposals",
      "Governance ensures VFIDE evolves according to user needs"
    ]
  },

  // ============ ADVANCED LESSONS ============
  "Advanced ProofScore": {
    title: "Advanced ProofScore",
    duration: "10 min",
    description: "Maximize your reputation with strategic actions.",
    sections: [
      {
        heading: "ProofScore Algorithm Deep Dive",
        content: "ProofScore is calculated using a weighted formula that considers multiple factors. The score ranges from 0-10,000 (displayed as 0-100%).",
        points: [
          "Transaction Activity (40%): Successful payments, transfers, commerce",
          "Community Endorsements (30%): Badges and peer recognition",
          "Good Behavior (20%): No disputes, fraud, or suspicious activity",
          "Wallet Age (10%): Time since first transaction",
          "Base Score: Everyone starts at 5,000 (50%) - neutral position",
          "Capital held contributes 0% - trust is earned, not bought"
        ]
      },
      {
        heading: "Optimization Strategies",
        content: "Strategic users can maximize their ProofScore through intentional actions:",
        points: [
          "Make regular transactions, even if small amounts",
          "Set up all security features (guardians, vault)",
          "Vote on every governance proposal",
          "Earn badges through ecosystem participation",
          "Maintain clean record - avoid disputes and refunds",
          "Stay active - scores decay with inactivity",
          "Engage with the community for endorsements"
        ]
      },
      {
        heading: "Understanding Score Decay",
        content: "ProofScore slowly decays with inactivity to ensure scores reflect current behavior:",
        points: [
          "Score decays 1% per month of inactivity",
          "Decay stops at 50% of peak score",
          "Any transaction resets the decay timer",
          "Governance voting also prevents decay",
          "Decay ensures scores represent active, trusted users"
        ]
      },
      {
        heading: "Score Manipulation & Sybil Resistance",
        content: "VFIDE's algorithm is designed to resist gaming and Sybil account patterns:",
        points: [
          "Creating multiple wallets won't multiply score (network age + transaction costs)",
          "Circular transactions are detected and penalized",
          "ProofScore gain has diminishing returns at high values",
          "Community can report suspicious behavior for review",
          "Severe violations result in score resets"
        ]
      },
      {
        heading: "Benefits by Tier (Detailed)",
        content: "Each tier unlocks specific privileges:",
        points: [
          "Quarantined (0-9%): Suspected fraud, most actions blocked",
          "Restricted (10-39%): Maximum fees (5%), limited functionality",
          "Monitored (40-53%): Elevated fees (2.5-5%), reduced privileges",
          "Standard (54-79%): Normal fees (~2.5%), governance voting eligible",
          "Elite (80-100%): Minimum fees (0.25%), full privileges, council eligibility"
        ]
      }
    ],
    keyTakeaways: [
      "ProofScore uses a multi-factor algorithm balancing usage, security, and governance",
      "Optimize score through consistent activity, security setup, and voting",
      "Score decay ensures reputation reflects current behavior",
      "System resists gaming through Sybil attack countermeasures"
    ]
  },

  "Smart Contract Deep Dive": {
    title: "Smart Contract Deep Dive",
    duration: "15 min",
    description: "Understand the technical architecture.",
    sections: [
      {
        heading: "Contract Architecture Overview",
        content: "VFIDE consists of multiple interconnected smart contracts, each serving a specific purpose:",
        points: [
          "VFIDE Token (ERC20): The core payment token with custom transfer logic",
          "Vault Factory: Creates new vaults for users",
          "Vault Contract: User's non-custodial storage with security features",
          "ProofScore Registry: Calculates and stores reputation scores",
          "DAO Governance: Proposal and voting system",
          "Merchant Portal: Payment processing and rebates",
          "Guardian Recovery: Social recovery mechanism"
        ]
      },
      {
        heading: "Non-Custodial Vault Design",
        content: "Each vault is an individual smart contract owned by the user's wallet:",
        points: [
          "Vault ownership is immutable - only the user can control it",
          "Vaults hold tokens in escrow with conditional release logic",
          "Emergency freeze function controlled by vault owner",
          "Guardian recovery requires M-of-N approval + time delay",
          "Abnormal transaction detection triggers approval requirements",
          "Gas-optimized design minimizes transaction costs"
        ]
      },
      {
        heading: "Security Mechanisms",
        content: "VFIDE implements a 4-layer security architecture:",
        points: [
          "Layer 1 - Emergency Breaker: Platform-wide pause (DAO-controlled)",
          "Layer 2 - Guardian Lock: Protocol-level quarantine for threats",
          "Layer 3 - Vault Quarantine: Individual vault freezing",
          "Layer 4 - Global Risk: Circuit breaker for systemic threats",
          "Each layer requires escalating approval and timelock delays"
        ]
      },
      {
        heading: "Upgradeability & Governance",
        content: "VFIDE contracts use a transparent proxy pattern for upgrades:",
        points: [
          "Logic contracts are upgradeable via DAO vote",
          "Upgrades require 7-day timelock after approval",
          "Critical changes require supermajority (66% approval)",
          "Emergency upgrades bypass timelock but require guardian multi-sig",
          "All upgrade history is publicly auditable on-chain"
        ]
      },
      {
        heading: "Gas Optimization Techniques",
        content: "VFIDE uses advanced gas-saving patterns:",
        points: [
          "Batch operations reduce per-transaction cost",
          "Storage packing minimizes SSTORE operations",
          "EIP-2929 warm storage slot utilization",
          "Layer 2 deployment (Base) for 100x cheaper gas",
          "Off-chain signature verification where possible"
        ]
      }
    ],
    keyTakeaways: [
      "VFIDE architecture prioritizes security, upgradeability, and gas efficiency",
      "Non-custodial vaults ensure users always control their funds",
      "4-layer security protects against various threat levels",
      "Governance-controlled upgrades prevent unilateral protocol changes"
    ]
  },

  "API Integration": {
    title: "API Integration",
    duration: "20 min",
    description: "Build custom payment flows for your platform.",
    sections: [
      {
        heading: "API Overview",
        content: "VFIDE provides REST and WebSocket APIs for seamless payment integration:",
        points: [
          "RESTful HTTP endpoints for payment creation and status",
          "WebSocket for real-time transaction updates",
          "Webhook callbacks for server-side processing",
          "Rate limits: 100 req/sec for verified merchants",
          "Authentication via API keys (never expose client-side)"
        ]
      },
      {
        heading: "Creating Payment Requests",
        content: "Generate payment links programmatically:",
        points: [
          "POST /api/v1/payments/create with amount, currency, metadata",
          "Receive payment_id and payment_url in response",
          "Optionally set expiry time, custom redirect, webhook URL",
          "Payment URLs are shareable via any channel",
          "Payments can be denominated in VFIDE, USDC, or fiat-equivalent"
        ]
      },
      {
        heading: "Monitoring Payment Status",
        content: "Track payment lifecycle in real-time:",
        points: [
          "GET /api/v1/payments/:id for current status",
          "Status values: pending, completed, expired, failed",
          "WebSocket: subscribe to payment events for instant updates",
          "Webhooks: Receive POST to your server when status changes",
          "Verify webhook signatures to prevent spoofing"
        ]
      },
      {
        heading: "Advanced Features",
        content: "VFIDE API supports sophisticated use cases:",
        points: [
          "Subscription billing: Recurring payments with auto-charge",
          "Refunds: Programmatically issue full or partial refunds",
          "Multi-recipient splits: Split payments across multiple vaults",
          "Conditional payments: Escrow with release conditions",
          "Invoice generation: PDF invoices with payment links"
        ]
      },
      {
        heading: "Code Examples (JavaScript)",
        content: "Here's a quick integration example:",
        points: [
          "const vfide = new VfideSDK({ apiKey: 'your_api_key' });",
          "const payment = await vfide.payments.create({ amount: 100, currency: 'VFIDE' });",
          "console.log(payment.payment_url); // Share this link",
          "vfide.on('payment.completed', (data) => { /* fulfill order */ });",
          "See full SDK documentation at docs.vfide.com/api"
        ]
      },
      {
        heading: "Testing & Debugging",
        content: "VFIDE provides testnet environments for development:",
        points: [
          "Use testnet API keys for free testing (no real funds)",
          "Testnet faucet for obtaining test tokens",
          "Detailed error messages with debugging hints",
          "API playground at docs.vfide.com/playground",
          "Community Discord for technical support"
        ]
      }
    ],
    keyTakeaways: [
      "VFIDE API enables custom payment flows for any platform",
      "REST endpoints, WebSockets, and webhooks cover all use cases",
      "SDK available for JavaScript, Python, PHP (more coming)",
      "Testnet environment allows risk-free development"
    ]
  }
};
