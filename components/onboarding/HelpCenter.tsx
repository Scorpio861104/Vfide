'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HelpCircle,
  X,
  Book,
  Wallet,
  Shield,
  ChevronRight,
  Globe,
  Droplets,
  Sparkles,
  ArrowRight,
  Clock,
  Lock,
  Fingerprint,
} from 'lucide-react'
import { isCardBoundVaultMode } from '@/lib/contracts'

interface HelpTopic {
  id: string
  title: string
  icon: React.ReactNode
  content: string[]
}

function buildTopics(isCardBound: boolean): HelpTopic[] {
  const vaultSecurityContent = isCardBound
    ? [
        'Wallet Rotation: Guardians can approve signer rotation and protect queued transfers. Configure heirs and inheritance in the vault\'s Inheritance section.',
        'Spend Limits: Per-transfer and per-day caps prevent runaway withdrawals.',
        'Queue Delay: Large transfers enter a time-locked queue before execution.',
      ]
    : [
        'Next of Kin: Designate an heir to inherit your vault if something happens.',
        'Guardian Threshold: Require M-of-N guardian approval for sensitive actions.',
        'Spend Limits: Per-transfer and per-day caps prevent runaway withdrawals.',
      ]

  return [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <Sparkles size={16} />,
      content: [
        'Connect your Web3 wallet (MetaMask, WalletConnect, or Coinbase Wallet).',
        'Switch to the correct network — Sepolia for testnet or mainnet.',
        'Create your vault from the Vault page.',
      ],
    },
    {
      id: 'network-setup',
      title: 'Network Setup',
      icon: <Globe size={16} />,
      content: [
        'Open your wallet and look for the network selector.',
        'Add a custom RPC if your wallet does not list the network by default.',
        'Confirm you are on the right chain before any transaction.',
      ],
    },
    {
      id: 'test-eth',
      title: 'Get Test ETH',
      icon: <Droplets size={16} />,
      content: [
        'Visit a Sepolia faucet (e.g. sepoliafaucet.com).',
        'Paste your wallet address and request funds.',
        'Funds typically arrive within a minute.',
      ],
    },
    {
      id: 'wallet-setup',
      title: 'Wallet Setup',
      icon: <Wallet size={16} />,
      content: [
        'Install MetaMask or another EIP-1193 compatible wallet extension.',
        'Create a new account or import an existing seed phrase.',
        'Keep your seed phrase offline and never share it.',
      ],
    },
    {
      id: 'vault-security',
      title: 'Vault Security',
      icon: <Shield size={16} />,
      content: vaultSecurityContent,
    },
    {
      id: 'withdrawal-queue',
      title: 'Withdrawal Queue (Your Safety Net)',
      icon: <Clock size={16} />,
      content: [
        'Every CardBound vault has a 7-day withdrawal queue for amounts at or above your daily limit. This is your built-in protection against a lost phone or stolen wallet key.',
        'When a large withdrawal is requested, the vault holds it for 7 days before sending the funds. During that window, you OR any guardian can cancel it from the Lock My Vault page or the Guardian dashboard.',
        'How to use it well: set your daily limit aggressively (e.g. one day\'s realistic spend). Smaller = more transactions get queued = more protection. You can change the limit any time from Vault Settings.',
        'Payments above 5× your daily limit also queue — same 7-day window, same guardian cancel.',
        'Caveat: a thief CAN still drain amounts below the per-transfer cap instantly. Keep that cap low if device-grab is a real concern, and consider turning on App Lock (below).',
      ],
    },
    {
      id: 'lock-my-vault',
      title: 'Lock My Vault (Emergency)',
      icon: <Lock size={16} />,
      content: [
        'If you suspect your wallet is compromised, visit /vault/lock from the menu. This page is your single panic dashboard.',
        'What you can do from there: cancel all pending queued transfers and payments (one click), propose a wallet rotation to a new safe address, and request guardian help.',
        'A wallet rotation moves your vault\'s active signer to a new wallet you control. It uses a delay you choose at proposal time (default 24h, configurable), and guardians can approve to speed it up.',
        'Important: Lock My Vault only works if you still have your current wallet. If you\'ve fully lost the key, guardians initiate recovery on your behalf from the Recovery tab — no action from you needed.',
      ],
    },
    {
      id: 'app-lock',
      title: 'App Lock / PIN',
      icon: <Fingerprint size={16} />,
      content: [
        'App Lock adds a biometric (Face ID / Touch ID / Windows Hello) or PIN prompt on this device before VFIDE will sign transactions above a threshold you choose.',
        'What it protects: someone briefly grabbing your unlocked phone in a coffee shop. The threshold means you don\'t see the prompt on small everyday payments — only on amounts you decide are worth a second factor.',
        'What it does NOT protect: a thief who has imported your wallet key into their own device. They bypass VFIDE entirely. That threat is what the 7-day queue is for.',
        'Configure it from Settings → App Lock. Default is off. You pick: WebAuthn (biometric), PIN, or both. You set the threshold and the session timeout.',
        'Three wrong PIN attempts soft-lock the app for 5 minutes. Lose your PIN? Just clear it from Settings on another logged-in device — there is no recovery flow because App Lock is purely a local device speed-bump.',
      ],
    },
  ]
}

export function HelpCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const isCardBound = isCardBoundVaultMode()
  const topics = buildTopics(isCardBound)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-accent hover:bg-accent-light flex items-center justify-center shadow-lg transition-colors"
        aria-label="Open Help Center"
      >
        <HelpCircle size={20} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            className="fixed bottom-0 right-0 top-0 z-50 w-80 bg-gray-900 border-l border-gray-700 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Book size={16} className="text-accent" />
                <span className="font-bold text-white">Help Center</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close Help Center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {topics.map((topic) => (
                <div key={topic.id} className="rounded-lg border border-gray-700 overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-800 transition-colors"
                    onClick={() =>
                      setExpandedId(expandedId === topic.id ? null : topic.id)
                    }
                  >
                    <div className="flex items-center gap-2 text-white">
                      {topic.icon}
                      <span className="text-sm font-medium">{topic.title}</span>
                    </div>
                    <ChevronRight
                      size={14}
                      className={`text-gray-400 transition-transform ${
                        expandedId === topic.id ? 'rotate-90' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {expandedId === topic.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-700"
                      >
                        <ul className="p-3 space-y-2">
                          {topic.content.map((line, i) => (
                            <li
                              key={i}
                              className="text-xs text-gray-400 flex gap-2"
                            >
                              <ArrowRight
                                size={12}
                                className="mt-0.5 flex-shrink-0 text-accent"
                              />
                              {line}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
