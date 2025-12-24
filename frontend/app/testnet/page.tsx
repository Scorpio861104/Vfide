'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function TestnetPage() {
  const [step, setStep] = useState(1)
  const [walletAddress, setWalletAddress] = useState('')
  const [hasWallet, setHasWallet] = useState<boolean | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [ethBalance, setEthBalance] = useState<string>('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isInMetaMaskBrowser, setIsInMetaMaskBrowser] = useState(false)

  const ZKSYNC_SEPOLIA_CHAIN_ID = 300
  const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS || '0x3249215721a21BC9635C01Ea05AdE032dd90961f'
  const PRESALE_ADDRESS = process.env.NEXT_PUBLIC_VFIDE_PRESALE_ADDRESS || '0x338926cd13aAA99da8e846732e8010b16d1369ea'

  // Detect mobile and MetaMask in-app browser
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
      // Detect if we're inside MetaMask's in-app browser
      const ethereum = (window as any).ethereum
      const isMetaMask = ethereum?.isMetaMask
      const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      // MetaMask mobile browser has ethereum injected immediately + mobile user agent
      setIsInMetaMaskBrowser(isMetaMask && isMobileDevice && ethereum)
    }
  }, [])

  // Check if wallet exists on load
  useEffect(() => {
    const checkWallet = async () => {
      // Wait a bit for wallet to inject
      await new Promise(resolve => setTimeout(resolve, 500))
      
      if (typeof window !== 'undefined') {
        const ethereum = (window as any).ethereum
        const hasEthereum = !!ethereum
        setHasWallet(hasEthereum)
        
        if (hasEthereum) {
          try {
            const accounts = await ethereum.request({ method: 'eth_accounts' })
            if (accounts && accounts.length > 0) {
              setWalletAddress(accounts[0])
              const chain = await ethereum.request({ method: 'eth_chainId' })
              const chainNum = parseInt(chain, 16)
              setChainId(chainNum)
              
              if (chainNum === ZKSYNC_SEPOLIA_CHAIN_ID) {
                // Already on zkSync Sepolia - check balance and decide step
                const balance = await ethereum.request({
                  method: 'eth_getBalance',
                  params: [accounts[0], 'latest']
                })
                const ethBal = parseInt(balance, 16) / 1e18
                setEthBalance(ethBal.toFixed(4))
                
                if (ethBal >= 0.001) {
                  setStep(5) // Has ETH, go straight to explore
                } else {
                  setStep(4) // On right network but needs ETH
                }
              } else {
                setStep(3) // Connected but wrong network
              }
            } else {
              // Has wallet but not connected - go to step 2
              setStep(2)
            }
          } catch (e) {
            console.error('Wallet check error:', e)
            setStep(2) // Has wallet but error, go to connect
          }
        }
        // If no wallet, stays at step 1
      }
    }
    checkWallet()
  }, [])

  const updateBalance = async (address: string) => {
    try {
      const balance = await (window as any).ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      })
      const ethBal = parseInt(balance, 16) / 1e18
      setEthBalance(ethBal.toFixed(4))
      return ethBal
    } catch (e) {
      console.error(e)
      return 0
    }
  }

  const handleInstallWallet = () => {
    if (isMobile) {
      const isAndroid = /Android/i.test(navigator.userAgent)
      if (isAndroid) {
        window.open('https://play.google.com/store/apps/details?id=io.metamask', '_blank')
      } else {
        window.open('https://apps.apple.com/app/metamask/id1438144202', '_blank')
      }
    } else {
      window.open('https://metamask.io/download/', '_blank')
    }
  }

  const handleOpenInMetaMask = () => {
    const currentUrl = window.location.href
    window.location.href = `https://metamask.app.link/dapp/${currentUrl.replace('https://', '')}`
  }

  const handleConnect = async () => {
    setLoading(true)
    setError('')
    try {
      const ethereum = (window as any).ethereum
      if (!ethereum) {
        setError('No wallet found. Please install MetaMask.')
        setHasWallet(false)
        setStep(1)
        return
      }
      
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      })
      
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0])
        const chain = await ethereum.request({ method: 'eth_chainId' })
        const chainNum = parseInt(chain, 16)
        setChainId(chainNum)
        
        // Check if already on zkSync Sepolia
        if (chainNum === ZKSYNC_SEPOLIA_CHAIN_ID) {
          const bal = await updateBalance(accounts[0])
          if (bal >= 0.001) {
            setStep(5) // Already set up, go to explore
          } else {
            setStep(4) // Need ETH
          }
        } else {
          setStep(3) // Need to switch network
        }
      }
    } catch (err: any) {
      console.error('Connect error:', err)
      if (err.code === 4001) {
        setError('You rejected the connection. Please try again and click "Connect".')
      } else {
        setError(err.message || 'Failed to connect. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchNetwork = async () => {
    setLoading(true)
    setError('')
    try {
      const ethereum = (window as any).ethereum
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${ZKSYNC_SEPOLIA_CHAIN_ID.toString(16)}` }]
        })
      } catch (switchError: any) {
        if (switchError.code === 4902 || switchError.code === -32603) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${ZKSYNC_SEPOLIA_CHAIN_ID.toString(16)}`,
              chainName: 'zkSync Sepolia Testnet',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://sepolia.era.zksync.dev'],
              blockExplorerUrls: ['https://sepolia.explorer.zksync.io']
            }]
          })
        } else {
          throw switchError
        }
      }
      setChainId(ZKSYNC_SEPOLIA_CHAIN_ID)
      const bal = await updateBalance(walletAddress)
      if (bal >= 0.001) {
        setStep(5)
      } else {
        setStep(4)
      }
    } catch (err: any) {
      console.error('Switch network error:', err)
      if (err.code === 4001) {
        setError('You rejected the network switch. Please try again.')
      } else {
        setError(err.message || 'Failed to switch network. Please try manually.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAddToken = async () => {
    try {
      await (window as any).ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: TOKEN_ADDRESS,
            symbol: 'VFIDE',
            decimals: 18,
            image: 'https://vfide.io/logo.png'
          }
        }
      })
    } catch (err) {
      console.error(err)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const goBack = () => {
    if (step > 1) setStep(step - 1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#1a1a2f] text-white">
      {/* Testnet Banner */}
      <div className="bg-yellow-500 text-black py-3 px-4 text-center font-bold text-lg">
        🧪 TESTNET MODE - Free to test, no real money needed!
      </div>

      {/* Copy Toast */}
      {copied && (
        <div className="fixed top-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse">
          ✓ Copied to clipboard!
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* MetaMask Browser Indicator */}
        {isInMetaMaskBrowser && (
          <div className="bg-orange-500/20 border border-orange-500 rounded-lg p-3 mb-6 text-center">
            <span className="text-orange-400">🦊 You&apos;re browsing in MetaMask - perfect!</span>
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Try VFIDE Free
          </h1>
          <p className="text-xl text-gray-300">
            5 minutes to test the future of payments. No money required.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-10">
          <div className="flex justify-between mb-2">
            {['Install Wallet', 'Connect', 'Switch Network', 'Get Test ETH', 'Explore!'].map((label, i) => (
              <div key={i} className={`text-xs ${step > i ? 'text-green-400' : step === i + 1 ? 'text-purple-400 font-bold' : 'text-gray-500'}`}>
                {step > i ? '✓' : i + 1}. {label}
              </div>
            ))}
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Back Button */}
        {step > 1 && step < 5 && (
          <button onClick={goBack} className="mb-4 text-gray-400 hover:text-white text-sm flex items-center gap-1">
            ← Back to previous step
          </button>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6 text-center">
            ❌ {error}
            <button onClick={() => setError('')} className="ml-4 text-sm underline">Dismiss</button>
          </div>
        )}

        {/* Step 1: Install Wallet */}
        {step === 1 && (
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
            <div className="text-center">
              <div className="text-6xl mb-6">🦊</div>
              <h2 className="text-2xl font-bold mb-4">Step 1: Get a Crypto Wallet</h2>
              <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                A wallet is like a bank app for crypto. MetaMask is free and takes 2 minutes to set up.
              </p>
              
              {hasWallet === null ? (
                <div className="text-gray-400">
                  <div className="animate-spin inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mb-2"></div>
                  <p>Checking for wallet...</p>
                  <button 
                    onClick={() => setHasWallet(false)} 
                    className="mt-4 text-purple-400 underline text-sm"
                  >
                    I don&apos;t have a wallet
                  </button>
                </div>
              ) : hasWallet === false ? (
                <>
                  {isMobile && !isInMetaMaskBrowser ? (
                    <div className="space-y-4">
                      <p className="text-yellow-400 text-sm mb-4">
                        📱 You&apos;re on mobile! For the best experience:
                      </p>
                      <button
                        onClick={handleOpenInMetaMask}
                        className="bg-orange-500 hover:bg-orange-400 px-8 py-4 rounded-xl text-xl font-bold transition-all w-full"
                      >
                        🦊 Open in MetaMask App
                      </button>
                      <p className="text-gray-500 text-sm">
                        If you don&apos;t have MetaMask:
                      </p>
                      <button
                        onClick={handleInstallWallet}
                        className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-xl font-bold transition-all w-full"
                      >
                        📥 Install MetaMask App
                      </button>
                    </div>
                  ) : isMobile && isInMetaMaskBrowser ? (
                    <div className="space-y-4">
                      <div className="text-green-400 text-sm mb-4">
                        ✓ You&apos;re in MetaMask! Great choice.
                      </div>
                      <p className="text-gray-400 text-sm">
                        Wallet should connect automatically. If not, try refreshing.
                      </p>
                      <button 
                        onClick={() => window.location.reload()} 
                        className="bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-xl font-bold transition-all w-full"
                      >
                        🔄 Refresh Page
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={handleInstallWallet}
                        className="bg-orange-500 hover:bg-orange-400 px-8 py-4 rounded-xl text-xl font-bold transition-all transform hover:scale-105 mb-4"
                      >
                        📥 Install MetaMask (Free)
                      </button>
                      <p className="text-gray-500 text-sm">
                        After installing, refresh this page
                      </p>
                      <button 
                        onClick={() => window.location.reload()} 
                        className="mt-4 text-purple-400 underline"
                      >
                        🔄 Refresh Page
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="text-green-400 text-xl mb-4">✓ Wallet detected!</div>
                  <button
                    onClick={() => setStep(2)}
                    className="bg-purple-600 hover:bg-purple-500 px-8 py-4 rounded-xl text-xl font-bold transition-all"
                  >
                    Continue →
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Connect Wallet */}
        {step === 2 && (
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
            <div className="text-center">
              <div className="text-6xl mb-6">🔗</div>
              <h2 className="text-2xl font-bold mb-4">Step 2: Connect Your Wallet</h2>
              <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                Click the button below. MetaMask will popup asking permission - click &quot;Connect&quot;.
              </p>
              
              <button
                onClick={handleConnect}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 px-8 py-4 rounded-xl text-xl font-bold transition-all transform hover:scale-105"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Connecting...
                  </span>
                ) : (
                  '🔗 Connect Wallet'
                )}
              </button>

              <div className="mt-6 text-gray-500 text-sm space-y-2">
                <p>💡 If nothing happens:</p>
                <ul className="text-left max-w-sm mx-auto space-y-1">
                  <li>• Click the MetaMask 🦊 icon in your browser toolbar</li>
                  <li>• Make sure MetaMask is unlocked</li>
                  <li>• Check for a pending popup</li>
                </ul>
              </div>

              {isMobile && !isInMetaMaskBrowser && (
                <button
                  onClick={handleOpenInMetaMask}
                  className="mt-4 bg-orange-500 hover:bg-orange-400 px-6 py-3 rounded-xl font-bold transition-all w-full"
                >
                  🦊 Open in MetaMask Browser
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Switch Network */}
        {step === 3 && (
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
            <div className="text-center">
              <div className="text-6xl mb-6">🌐</div>
              <h2 className="text-2xl font-bold mb-4">Step 3: Switch to Test Network</h2>
              <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                We use zkSync Sepolia - a free test network. Click below to add it automatically.
              </p>
              
              <div className="bg-black/30 rounded-lg p-4 mb-6 inline-block">
                <div className="text-green-400 text-sm">✓ Connected: {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}</div>
                <div className="text-yellow-400 text-sm mt-1">
                  Current Network: {chainId === 1 ? 'Ethereum Mainnet' : chainId === 11155111 ? 'Sepolia' : chainId === ZKSYNC_SEPOLIA_CHAIN_ID ? 'zkSync Sepolia ✓' : `Chain ${chainId}`}
                </div>
              </div>

              <br />
              
              <button
                onClick={handleSwitchNetwork}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 px-8 py-4 rounded-xl text-xl font-bold transition-all transform hover:scale-105"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Switching...
                  </span>
                ) : (
                  '🌐 Switch to zkSync Sepolia'
                )}
              </button>

              <div className="mt-6 text-gray-500 text-sm">
                <p>💡 MetaMask will popup asking to add and switch network - approve both</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Get Test ETH */}
        {step === 4 && (
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
            <div className="text-center">
              <div className="text-6xl mb-6">⛽</div>
              <h2 className="text-2xl font-bold mb-4">Step 4: Get Free Test ETH</h2>
              <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                You need a tiny bit of test ETH for transaction fees (gas). It&apos;s 100% free!
              </p>

              <div className="bg-black/30 rounded-lg p-4 mb-6">
                <div className="text-green-400">✓ Connected: {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}</div>
                <div className="text-green-400">✓ Network: zkSync Sepolia</div>
                <div className={parseFloat(ethBalance) > 0 ? 'text-green-400' : 'text-yellow-400'}>
                  {parseFloat(ethBalance) > 0 ? '✓' : '⚠'} Balance: {ethBalance} ETH
                </div>
              </div>

              {parseFloat(ethBalance) < 0.001 ? (
                <>
                  <div className="bg-blue-900/30 border border-blue-500/50 rounded-xl p-6 mb-6 text-left max-w-md mx-auto">
                    <h3 className="font-bold text-blue-400 mb-3">🚰 How to get free test ETH:</h3>
                    <ol className="text-gray-300 space-y-3 text-sm">
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-bold">1.</span>
                        <span>Go to a Sepolia faucet (link below)</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-bold">2.</span>
                        <span>Paste your address:</span>
                      </li>
                      <li className="bg-black/50 p-2 rounded text-xs font-mono break-all flex items-center justify-between">
                        <span>{walletAddress}</span>
                        <button onClick={() => copyToClipboard(walletAddress)} className="ml-2 text-purple-400 hover:text-purple-300">📋</button>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-bold">3.</span>
                        <span>Request ETH, then bridge to zkSync</span>
                      </li>
                    </ol>
                  </div>

                  <div className="flex flex-col gap-3">
                    <a
                      href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-bold transition-all inline-block"
                    >
                      🚰 Google Cloud Faucet (Fastest)
                    </a>
                    <a
                      href="https://portal.zksync.io/bridge/?network=sepolia"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-xl font-bold transition-all inline-block"
                    >
                      🌉 Bridge to zkSync Sepolia
                    </a>
                  </div>

                  <button
                    onClick={async () => {
                      const bal = await updateBalance(walletAddress)
                      if (bal >= 0.001) {
                        setStep(5)
                      }
                    }}
                    className="mt-6 text-purple-400 hover:text-purple-300 underline"
                  >
                    🔄 Check balance again
                  </button>
                </>
              ) : (
                <>
                  <div className="text-green-400 text-xl mb-4">✓ You have test ETH! Ready to go!</div>
                  <button
                    onClick={() => setStep(5)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 px-8 py-4 rounded-xl text-xl font-bold transition-all transform hover:scale-105"
                  >
                    🚀 Start Exploring!
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Explore */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 rounded-2xl p-8 border border-green-500/30 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold mb-2">You&apos;re All Set!</h2>
              <p className="text-gray-300 mb-4">Your wallet is connected and funded. Time to explore VFIDE!</p>
              
              <div className="bg-black/30 rounded-lg p-4 inline-block mb-6">
                <div className="text-green-400 text-sm">✓ {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</div>
                <div className="text-green-400 text-sm">✓ zkSync Sepolia • {ethBalance} ETH</div>
              </div>
            </div>

            {/* Add Token Button */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
              <button
                onClick={handleAddToken}
                className="bg-pink-600 hover:bg-pink-500 px-6 py-3 rounded-xl font-bold transition-all"
              >
                ➕ Add VFIDE Token to Wallet
              </button>
              <p className="text-gray-500 text-sm mt-2">See your VFIDE balance in MetaMask</p>
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-4">
              <Link href="/dashboard" className="bg-white/5 hover:bg-white/10 rounded-xl p-6 border border-white/10 transition-all">
                <div className="text-3xl mb-2">📊</div>
                <h3 className="font-bold text-lg mb-1">Dashboard</h3>
                <p className="text-gray-400 text-sm">Check your ProofScore and activity</p>
              </Link>
              
              <Link href="/token-launch" className="bg-white/5 hover:bg-white/10 rounded-xl p-6 border border-white/10 transition-all">
                <div className="text-3xl mb-2">🚀</div>
                <h3 className="font-bold text-lg mb-1">Presale</h3>
                <p className="text-gray-400 text-sm">Preview the token presale (testnet)</p>
              </Link>
              
              <Link href="/merchant" className="bg-white/5 hover:bg-white/10 rounded-xl p-6 border border-white/10 transition-all">
                <div className="text-3xl mb-2">🏪</div>
                <h3 className="font-bold text-lg mb-1">Merchant Portal</h3>
                <p className="text-gray-400 text-sm">Try the 0% fee payment system</p>
              </Link>
              
              <Link href="/sanctum" className="bg-white/5 hover:bg-white/10 rounded-xl p-6 border border-white/10 transition-all">
                <div className="text-3xl mb-2">🏛️</div>
                <h3 className="font-bold text-lg mb-1">Sanctum</h3>
                <p className="text-gray-400 text-sm">Stake tokens and earn rewards</p>
              </Link>
            </div>

            {/* Contract Info */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="font-bold mb-4">📝 Contract Addresses (zkSync Sepolia)</h3>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between items-center bg-black/30 p-2 rounded">
                  <span className="text-gray-400">VFIDE Token:</span>
                  <span className="text-purple-400">{TOKEN_ADDRESS.slice(0, 10)}...{TOKEN_ADDRESS.slice(-8)}</span>
                  <button onClick={() => copyToClipboard(TOKEN_ADDRESS)} className="text-gray-500 hover:text-white">📋</button>
                </div>
                <div className="flex justify-between items-center bg-black/30 p-2 rounded">
                  <span className="text-gray-400">Presale:</span>
                  <span className="text-purple-400">{PRESALE_ADDRESS.slice(0, 10)}...{PRESALE_ADDRESS.slice(-8)}</span>
                  <button onClick={() => copyToClipboard(PRESALE_ADDRESS)} className="text-gray-500 hover:text-white">📋</button>
                </div>
              </div>
              <a 
                href={`https://sepolia.explorer.zksync.io/address/${TOKEN_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 text-sm mt-4 inline-block"
              >
                View on Explorer →
              </a>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-12 bg-white/5 rounded-xl p-6 border border-white/10">
          <h3 className="font-bold text-lg mb-4">❓ Need Help?</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="text-purple-400 font-medium mb-2">Common Issues:</h4>
              <ul className="text-gray-400 space-y-1">
                <li>• <strong>No popup?</strong> Click MetaMask icon in browser toolbar</li>
                <li>• <strong>Wrong network?</strong> Go back and click Switch Network</li>
                <li>• <strong>No test ETH?</strong> Faucets may take a few minutes</li>
                <li>• <strong>On mobile?</strong> Open this page inside the MetaMask app browser</li>
              </ul>
            </div>
            <div>
              <h4 className="text-purple-400 font-medium mb-2">Resources:</h4>
              <ul className="text-gray-400 space-y-1">
                <li><a href="https://metamask.io/faqs/" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400">• MetaMask FAQ</a></li>
                <li><a href="https://docs.zksync.io/build/getting-started" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400">• zkSync Docs</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>�� This is a testnet demo. No real money is involved.</p>
          <p className="mt-1">Network: zkSync Sepolia (Chain ID: 300)</p>
        </div>
      </div>
    </div>
  )
}
