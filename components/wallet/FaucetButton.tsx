'use client';

import { useCopyToClipboard } from '@/lib/hooks/useCopyToClipboard';
import { FAUCET_URLS } from '@/lib/testnet';
import { isTestnetChainId } from '@/lib/chains';
import { safeParseFloat } from '@/lib/validation';
import { Check, Copy, Droplets, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { formatUnits } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';

/**
 * Faucet button for testnet - shows "Get ETH" when balance is low
 * Opens a dropdown with faucet links and address copy
 */
export function FaucetButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { copied, copy } = useCopyToClipboard();
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const { playNotification, playSuccess } = useTransactionSounds();

  // Only show on testnet chains when connected
  if (!isConnected || !chainId || !isTestnetChainId(chainId)) return null;

  const ethBalance = balance ? safeParseFloat(formatUnits(balance.value, balance.decimals), 0) : 0;
  const isLowBalance = ethBalance < 0.01;

  const copyAddress = () => {
    if (address) {
      copy(address);
      playSuccess();
    }
  };

  const faucetLinks = [
    { name: 'Coinbase Faucet', url: FAUCET_URLS.coinbase },
    { name: 'Alchemy Faucet', url: FAUCET_URLS.alchemy },
    { name: 'QuickNode Faucet', url: FAUCET_URLS.quicknode },
  ];

  return (
    <div className="relative">
      <motion.button
        onClick={() => {
          setIsOpen(!isOpen);
          playNotification();
        }}
        data-onboarding="faucet-button"
        className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
          isLowBalance
            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          animate={isLowBalance ? { 
            scale: [1, 1.2, 1],
            rotate: [0, -10, 10, 0]
          } : {}}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
        >
          <Droplets size={14} />
        </motion.div>
        <span className="hidden xs:inline">{isLowBalance ? 'Get ETH' : 'Faucet'}</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            
            {/* Dropdown */}
            <motion.div 
              className="fixed sm:absolute right-3 sm:right-0 top-14 sm:top-full mt-2 w-[calc(100vw-1.5rem)] sm:w-72 max-w-md bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <div className="p-4 border-b border-zinc-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-zinc-400 text-xs">Your Address</span>
                  <motion.button
                    onClick={copyAddress}
                    className="text-zinc-500 hover:text-zinc-300"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Check size={14} className="text-green-400" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="copy"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Copy size={14} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
                <div className="font-mono text-sm text-zinc-300 truncate">
                  {address}
                </div>
                <div className="mt-2 text-xs">
                  <span className="text-zinc-500">Balance: </span>
                  <motion.span 
                    className={ethBalance < 0.01 ? 'text-amber-400' : 'text-green-400'}
                    key={ethBalance}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {ethBalance.toFixed(4)} ETH
                  </motion.span>
                </div>
              </div>

              <div className="p-2">
                <p className="text-xs text-zinc-500 px-2 py-1">Get free test ETH:</p>
                
                {faucetLinks.map((link, index) => (
                  <motion.a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-zinc-800 rounded-lg transition-colors group"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ x: 4 }}
                    onClick={() => playNotification()}
                  >
                    <span className="text-zinc-200 text-sm font-medium">{link.name}</span>
                    <motion.div
                      whileHover={{ x: 2 }}
                    >
                      <ExternalLink size={14} className="text-zinc-500 group-hover:text-zinc-300" />
                    </motion.div>
                  </motion.a>
                ))}
              </div>

              <motion.div 
                className="px-4 py-3 bg-zinc-800/50 border-t border-zinc-800"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-xs text-zinc-500">
                  Tokens arrive in ~30 seconds after faucet claim.
                </p>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
