# VFIDE Tester Onboarding Guide

## 🎯 What You'll Be Testing
VFIDE is a decentralized payment protocol. You'll help test buying tokens, making payments, and security features.

---

## 📋 STEP 1: Create a Wallet (5 minutes)

### Option A: MetaMask (Recommended)
1. Go to https://metamask.io/download/
2. Click "Install MetaMask for [your browser]"
3. Click "Create a new wallet"
4. Create a password (write it down!)
5. **IMPORTANT**: Write down your 12-word Secret Recovery Phrase on paper
6. Confirm the phrase by clicking words in order
7. Done! You now have a wallet

### Option B: Rabby Wallet
1. Go to https://rabby.io/
2. Click "Install"
3. Follow setup steps (similar to MetaMask)

---

## 📋 STEP 2: Add Sepolia Testnet (2 minutes)

### For MetaMask:
1. Click the network dropdown (top left, says "Ethereum Mainnet")
2. Click "Show test networks" toggle at bottom
3. If you don't see Sepolia:
   - Click "Add network"
   - Click "Add network manually"
   - Enter these details:
     ```
     Network Name: Sepolia
     RPC URL: https://ethereum-sepolia-rpc.publicnode.com
     Chain ID: 11155111
     Currency Symbol: ETH
     Explorer: https://sepolia.etherscan.io
     ```
   - Click "Save"
4. Select "Sepolia" from the network list

---

## 📋 STEP 3: Get Free Test ETH (5 minutes)

You need fake ETH to pay for gas. It's FREE!

### Faucet Options (try in order):

1. **Google Cloud Faucet** (Easiest - 0.05 ETH)
   - Go to: https://cloud.google.com/application/web3/faucet/ethereum/sepolia
   - Paste your wallet address
   - Click "Request"
   - Wait 30 seconds

2. **Alchemy Faucet** (0.5 ETH - requires free account)
   - Go to: https://sepoliafaucet.com/
   - Sign up for free Alchemy account
   - Paste your wallet address
   - Click "Send Me ETH"

3. **Infura Faucet** (0.5 ETH)
   - Go to: https://www.infura.io/faucet/sepolia
   - Create free account
   - Get ETH

### How to Find Your Wallet Address:
1. Open MetaMask
2. Click on your account name at top
3. Your address will be copied (starts with 0x...)

---

## 📋 STEP 4: Get Your Tester Role

Contact the **Deployer** (project lead) and tell them:
1. Your wallet address
2. Which role you want to test:

| Role | What You'll Do | Difficulty |
|------|----------------|------------|
| **Presale Buyer** | Buy tokens at different prices | Easy |
| **Merchant** | Accept payments, manage store | Medium |
| **Guardian** | Test security/emergency features | Medium |
| **General User** | Create vault, send tokens, build trust | Easy |

The Deployer will:
- Give you the contract addresses (see STEP 5)
- Tell you which tests to run (see STEP 6)
- Add you to the testing chat/channel

---

## 📋 STEP 5: Import Contract Addresses

Once deployed, you'll receive a file or message with addresses like:

```
VFIDEToken: 0x1234...
VFIDEPresale: 0x5678...
(etc.)
```

### To Add Token to MetaMask:
1. Open MetaMask
2. Click "Import tokens" at bottom
3. Paste the VFIDEToken address
4. Click "Next" then "Import"
5. You'll now see your VFIDE balance

---

## 📋 STEP 6: Run Your Tests

Go to the role-specific guide:
- [Presale Buyer Tests](./ROLE-PRESALE-BUYER.md)
- [Merchant Tests](./ROLE-MERCHANT.md)
- [Guardian Tests](./ROLE-GUARDIAN.md)
- [General User Tests](./ROLE-GENERAL-USER.md)

---

## ❓ Troubleshooting

### "Insufficient funds for gas"
- You need more Sepolia ETH
- Go back to Step 3 and try another faucet

### "Transaction failed"
- Screenshot the error
- Send to the testing chat
- Wait for help before trying again

### "I can't find the contract"
- Make sure you're on Sepolia network (Step 2)
- Double-check the contract address
- Try refreshing MetaMask

### "MetaMask isn't working"
- Try refreshing the page
- Try closing and reopening browser
- Try clearing MetaMask cache: Settings → Advanced → Reset Account

---

## 📞 Support

- Testing Chat: [Link from Deployer]
- Deployer Contact: [Contact from Deployer]
- Report bugs with screenshots!

---

## ✅ Onboarding Checklist

- [ ] Wallet created
- [ ] Sepolia network added
- [ ] Got test ETH (check balance > 0.01)
- [ ] Got role assignment
- [ ] Got contract addresses
- [ ] Ready to test!
