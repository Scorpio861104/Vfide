"use client";

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import Image from 'next/image';

export function SimpleWalletConnect() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        // Wait for mount to avoid hydration mismatch
        const ready = mounted && authenticationStatus !== 'loading';
        
        // Check all connection requirements
        const connected =
          ready &&
          account != null &&
          chain != null &&
          (!authenticationStatus || authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <motion.button
                    onClick={openConnectModal}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base bg-linear-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] font-bold rounded-lg hover:shadow-lg hover:shadow-[#00F0FF]/50 transition-all font-[family-name:var(--font-body)]"
                  >
                    <span className="hidden sm:inline">Connect Wallet</span>
                    <span className="sm:hidden">Connect</span>
                  </motion.button>
                );
              }

              if (chain.unsupported) {
                return (
                  <motion.button
                    onClick={openChainModal}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base bg-red-500 text-white font-bold rounded-lg hover:shadow-lg transition-all font-[family-name:var(--font-body)]"
                  >
                    <span className="hidden sm:inline">Wrong Network</span>
                    <span className="sm:hidden">Wrong Net</span>
                  </motion.button>
                );
              }

              return (
                <div className="flex gap-2">
                  <motion.button
                    onClick={openChainModal}
                    whileHover={{ scale: 1.05 }}
                    className="hidden sm:flex px-4 py-2 bg-[#2A2A2F] border border-[#3A3A3F] text-[#F5F3E8] rounded-lg hover:border-[#00F0FF] transition-all font-[family-name:var(--font-body)] text-sm items-center"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 12,
                          height: 12,
                          borderRadius: 999,
                          overflow: 'hidden',
                          marginRight: 4,
                          display: 'inline-block',
                        }}
                      >
                        {chain.iconUrl && (
                          <Image
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            width={12}
                            height={12}
                            unoptimized
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </motion.button>

                  <motion.button
                    onClick={openAccountModal}
                    whileHover={{ scale: 1.05 }}
                    className="px-3 sm:px-4 py-2 text-sm bg-linear-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] font-bold rounded-lg hover:shadow-lg hover:shadow-[#00F0FF]/50 transition-all font-[family-name:var(--font-body)]"
                  >
                    <span className="hidden sm:inline">
                      {account.displayName}
                      {account.displayBalance ? ` (${account.displayBalance})` : ''}
                    </span>
                    <span className="sm:hidden">{account.displayName}</span>
                  </motion.button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
