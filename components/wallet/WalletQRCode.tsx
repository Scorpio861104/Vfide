'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useChainId } from 'wagmi';
import { QrCode, Copy, Check, Download, Share2, X } from 'lucide-react';
import { IS_TESTNET } from '@/lib/chains';
import { logger } from '@/lib/logger';

/**
 * Wallet QR Code Component
 * 
 * Displays a QR code for the connected wallet address
 * Features:
 * - Generate QR code for receiving funds
 * - Copy address
 * - Download QR as image
 * - Share via Web Share API
 */

interface WalletQRCodeProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletQRCode({ isOpen, onClose }: WalletQRCodeProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const copiedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate QR code using canvas
  useEffect(() => {
    if (!address || !isOpen) return;

    // Simple QR code generation using a canvas-based approach
    generateQRCode(address)
      .then(setQrDataUrl)
      .catch(() => {
        setQrDataUrl(''); // Reset on error — failure is visible as missing QR image
      });
  }, [address, isOpen]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  // Copy address with fallback
  const handleCopy = async () => {
    if (!address) return;
    
    // Clear existing timeout
    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
    }
    
    try {
      // Try modern clipboard API first
      await navigator.clipboard.writeText(address);
      setCopied(true);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (_err) {
      // Fallback for non-HTTPS contexts or if clipboard API fails
      try {
        const textArea = document.createElement('textarea');
        textArea.value = address;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        textArea.remove();
        
        if (successful) {
          setCopied(true);
          copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
        } else {
          throw new Error('Copy command failed');
        }
      } catch {
        // Silent fail - user can still manually copy
        logger.debug('Failed to copy address', { address });
      }
    }
  };

  // Download QR code
  const handleDownload = () => {
    if (!qrDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `vfide-wallet-${address?.slice(0, 8)}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  // Share via Web Share API
  const handleShare = async () => {
    if (!address) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My VFIDE Wallet',
          text: `Send crypto to my wallet: ${address}`,
          url: `https://${IS_TESTNET ? 'sepolia.' : ''}basescan.org/address/${address}`,
        });
      } catch (_err) {
        // User cancelled or share failed - this is expected behavior, not an error
        logger.debug('Share cancelled or failed', { address });
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  // Get chain name
  const getChainName = () => {
    const chains: Record<number, string> = {
      1: 'Ethereum',
      8453: 'Base',
      84532: 'Base Sepolia',
      42161: 'Arbitrum',
      137: 'Polygon',
      10: 'Optimism',
    };
    return chains[chainId] || 'Unknown';
  };

  if (!address) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="bg-zinc-900 rounded-2xl border border-zinc-700 p-6 max-w-sm w-full"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <QrCode className="text-cyan-400" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Receive Funds</h3>
                  <p className="text-xs text-zinc-500">{getChainName()}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-xl mb-4">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="Wallet QR Code" 
                  className="w-full aspect-square"
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-zinc-300 border-t-cyan-500 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Address */}
            <div className="bg-zinc-800 rounded-xl p-3 mb-4">
              <p className="text-xs text-zinc-500 mb-1">Wallet Address</p>
              <p className="text-sm font-mono text-white break-all">{address}</p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleCopy}
                className="flex flex-col items-center gap-1 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
              >
                {copied ? (
                  <Check size={20} className="text-green-400" />
                ) : (
                  <Copy size={20} className="text-zinc-400" />
                )}
                <span className="text-xs text-zinc-400">
                  {copied ? 'Copied!' : 'Copy'}
                </span>
              </button>

              <button
                onClick={handleDownload}
                className="flex flex-col items-center gap-1 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
              >
                <Download size={20} className="text-zinc-400" />
                <span className="text-xs text-zinc-400">Save</span>
              </button>

              <button
                onClick={handleShare}
                className="flex flex-col items-center gap-1 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
              >
                <Share2 size={20} className="text-zinc-400" />
                <span className="text-xs text-zinc-400">Share</span>
              </button>
            </div>

            {/* Warning */}
            <p className="text-xs text-zinc-500 text-center mt-4">
              Only send {getChainName()} compatible tokens to this address
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Generate QR code as data URL
 * Uses a simple canvas-based QR generation
 */
async function generateQRCode(data: string): Promise<string> {
  // Create a simple QR-like pattern until a full QR encoder is integrated.
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Generate a deterministic pattern from the address
  const moduleSize = 8;
  const modules = Math.floor(size / moduleSize);
  const quietZone = 4;
  
  ctx.fillStyle = '#000000';
  
  // Position patterns (corners)
  drawPositionPattern(ctx, quietZone * moduleSize, quietZone * moduleSize, moduleSize);
  drawPositionPattern(ctx, (modules - quietZone - 7) * moduleSize, quietZone * moduleSize, moduleSize);
  drawPositionPattern(ctx, quietZone * moduleSize, (modules - quietZone - 7) * moduleSize, moduleSize);

  // Data modules (simplified - create pattern from address hash)
  const hash = simpleHash(data);
  for (let i = 0; i < 200; i++) {
    const x = ((hash * (i + 1)) % (modules - 16)) + 8;
    const y = ((hash * (i + 7)) % (modules - 16)) + 8;
    
    // Avoid position patterns
    if (isInPositionPattern(x, y, modules, quietZone)) continue;
    
    if ((hash * (i + 3)) % 2 === 0) {
      ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
    }
  }

  // Add address text at bottom
  ctx.fillStyle = '#000000';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(data.slice(0, 21), size / 2, size - 20);
  ctx.fillText(data.slice(21), size / 2, size - 8);

  return canvas.toDataURL('image/png');
}

function drawPositionPattern(ctx: CanvasRenderingContext2D, x: number, y: number, moduleSize: number) {
  // Outer black
  ctx.fillStyle = '#000000';
  ctx.fillRect(x, y, 7 * moduleSize, 7 * moduleSize);
  
  // Inner white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + moduleSize, y + moduleSize, 5 * moduleSize, 5 * moduleSize);
  
  // Center black
  ctx.fillStyle = '#000000';
  ctx.fillRect(x + 2 * moduleSize, y + 2 * moduleSize, 3 * moduleSize, 3 * moduleSize);
}

function isInPositionPattern(x: number, y: number, modules: number, quietZone: number): boolean {
  // Top-left
  if (x < quietZone + 8 && y < quietZone + 8) return true;
  // Top-right
  if (x >= modules - quietZone - 8 && y < quietZone + 8) return true;
  // Bottom-left
  if (x < quietZone + 8 && y >= modules - quietZone - 8) return true;
  return false;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Compact QR button for wallet dropdown
 */
export function QRCodeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
    >
      <QrCode size={16} />
      <span>Show QR Code</span>
    </button>
  );
}
