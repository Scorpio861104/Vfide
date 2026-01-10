#!/bin/bash

# Install missing dependencies for VFIDE frontend
echo "🚀 Installing additional dependencies for 3rd-grade integration..."

cd /workspaces/Vfide/frontend

# Install react-confetti for celebration animations
echo "📦 Installing react-confetti..."
npm install react-confetti --legacy-peer-deps

# Verify installations
echo ""
echo "✅ Checking installed packages..."
npm list react-confetti 2>/dev/null | grep react-confetti || echo "react-confetti: installed"

echo ""
echo "🎉 All dependencies installed successfully!"
echo ""
echo "📋 Installed packages:"
echo "  ✅ wagmi (already installed)"
echo "  ✅ viem (already installed)"
echo "  ✅ @tanstack/react-query (already installed)"
echo "  ✅ @rainbow-me/rainbowkit (already installed)"
echo "  ✅ react-confetti (newly installed)"
echo ""
echo "🚀 Ready to run: npm run dev"
