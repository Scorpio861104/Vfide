'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { Check, ChevronDown, AlertTriangle, Zap } from 'lucide-react';
import { base, baseSepolia, polygon, polygonAmoy } from 'wagmi/chains';
import { IS_TESTNET } from '@/lib/chains';

interface NetworkInfo {
  id: number;
  name: string;
  symbol: string;
  color: string;
  testnet?: boolean;
}

// Available networks
const NETWORKS: NetworkInfo[] = IS_TESTNET
  ? [
      { id: baseSepolia.id, name: 'Base Sepolia', symbol: 'ETH', color: '#0052FF', testnet: true },
      { id: polygonAmoy.id, name: 'Polygon Amoy', symbol: 'MATIC', color: '#8247E5', testnet: true },
    ]
  : [
      { id: base.id, name: 'Base', symbol: 'ETH', color: '#0052FF' },
      { id: polygon.id, name: 'Polygon', symbol: 'MATIC', color: '#8247E5' },
    ];

/**
 * Quick Network Switcher
 * 
 * Features:
 * - One-click network switching
 * - Visual feedback during switch
 * - Auto-detect wrong network
 * - Minimal UI footprint
 */
export function NetworkSwitcher() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  
  const [isOpen, setIsOpen] = useState(false);

  // Find current network
  const currentNetwork = NETWORKS.find(n => n.id === chainId);
  const isWrongNetwork = isConnected && !currentNetwork;

  // Handle network switch
  const handleSwitch = (networkId: number) => {
    if (networkId === chainId) {
      setIsOpen(false);
      return;
    }
    switchChain({ chainId: networkId as 84532 | 80002 | 8453 | 137 | 324 | 300 });
    setIsOpen(false);
  };

  if (!isConnected) return null;

  return (
    <div className="relative">
      {/* Wrong network warning */}
      {isWrongNetwork && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-12 left-0 right-0 flex items-center justify-center"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 text-orange-400 text-xs rounded-lg border border-orange-500/30">
            <AlertTriangle size={14} />
            <span>Wrong network</span>
          </div>
        </motion.div>
      )}

      {/* Network button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        whileHover={{ scale: 1.02 }}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
          isOpen
            ? 'bg-zinc-800 border-cyan-500/50'
            : isWrongNetwork
            ? 'bg-orange-500/10 border-orange-500/30'
            : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
        }`}
      >
        {isPending ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Zap size={16} className="text-cyan-400" />
          </motion.div>
        ) : (
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: currentNetwork?.color || '#666' }}
          />
        )}
        
        <span className="text-sm text-white">
          {isPending ? 'Switching...' : currentNetwork?.name || 'Unknown'}
        </span>
        
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={14} className="text-zinc-500" />
        </motion.div>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 w-48 bg-zinc-900 rounded-xl border border-zinc-700 shadow-xl overflow-hidden z-50"
          >
            <div className="p-2">
              {NETWORKS.map((network) => {
                const isActive = network.id === chainId;
                
                return (
                  <button
                    key={network.id}
                    onClick={() => handleSwitch(network.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400'
                        : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: network.color }}
                    />
                    <span className="flex-1 text-left text-sm">{network.name}</span>
                    {isActive && <Check size={16} className="text-cyan-400" />}
                  </button>
                );
              })}
            </div>
            
            {IS_TESTNET && (
              <div className="px-3 py-2 border-t border-zinc-800">
                <span className="text-xs text-zinc-500">Testnet Mode</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
