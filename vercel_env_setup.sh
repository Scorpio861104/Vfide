#!/bin/bash

# Vercel Environment Setup Script
# Run this script after authenticating with Vercel CLI

echo "Linking to Vercel project 'vfide-frontend'..."
vercel link --yes --project vfide-frontend

echo "Setting Environment Variables..."

# Helper function to set env var
set_env() {
  echo "Setting $1..."
  echo -n "$2" | vercel env add "$1" production
  echo -n "$2" | vercel env add "$1" preview
  echo -n "$2" | vercel env add "$1" development
}

# Contract Addresses from deploy_output.txt
set_env NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS "0xf57992ab9F8887650C2a220A34fe86ebD00c02f5"
set_env NEXT_PUBLIC_VFIDE_PRESALE_ADDRESS "0x89aefb047B6CB2bB302FE2734DDa452985eF1658"
set_env NEXT_PUBLIC_STABLECOIN_REGISTRY_ADDRESS "0x0Ca218c43619D7Ad0054944eB00F4591d8B109d8"
set_env NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS "0x1508fa7D70A88F3c5E89d3a82f668cD92Fa902B5"
set_env NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS "0x8C6D5494094b4Af02Ac0eda10295FFf01A971f1a"
set_env NEXT_PUBLIC_VAULT_HUB_ADDRESS "0x090014f269f642656394E2FEaB038b92387B4db3"
set_env NEXT_PUBLIC_SEER_ADDRESS "0x90b672C009F0F16201E7bE2c6696d1c375d28422"
set_env NEXT_PUBLIC_DAO_ADDRESS "0xbbeB488A63Bed08939314a8a293DF9b634B3b4CD"
set_env NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS "0x3e679dfc533371Be29B696E9d4011C5723B1e56e"
set_env NEXT_PUBLIC_TRUST_GATEWAY_ADDRESS "0xd256462c479489fD674Df7DF80d13CB8E80face0"
set_env NEXT_PUBLIC_SECURITY_HUB_ADDRESS "0x977e54d9f5668703F9f3416c8AE8Ce8597637840"

# Configuration
set_env NEXT_PUBLIC_DEFAULT_CHAIN_ID "300"
# Note: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID needs to be set manually if not already present

echo "Environment variables set successfully!"
echo "Please run 'vercel deploy --prod' to redeploy with new settings."
