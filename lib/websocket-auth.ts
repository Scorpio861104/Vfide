/**
 * WebSocket Authentication Helper
 * Provides utilities for secure WebSocket connection authentication
 */

import { type Address } from 'viem';

/**
 * WebSocket Authentication Message Format
 */
export interface WSAuthMessage {
  type: 'auth';
  address: Address;
  message: string;
  signature: string;
  chainId: number;
  timestamp: number;
}

/**
 * Generate authentication message for WebSocket connection
 * This message should be signed by the user's wallet
 */
export function generateWSAuthMessage(address: Address, chainId: number): string {
  const timestamp = Date.now();
  const nonce = crypto.getRandomValues(new Uint8Array(16));
  const nonceHex = Array.from(nonce).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `VFIDE WebSocket Authentication

Address: ${address}
Chain ID: ${chainId}
Timestamp: ${timestamp}
Nonce: ${nonceHex}

By signing this message, you authorize this WebSocket connection.
This request will not trigger any blockchain transaction or cost any gas fees.`;
}

/**
 * Create authentication payload for WebSocket connection
 * 
 * @param address - User's wallet address
 * @param chainId - Current chain ID
 * @param signMessage - Function to sign the authentication message
 * @returns Authentication payload ready to send to server
 */
export async function createWSAuthPayload(
  address: Address,
  chainId: number,
  signMessage: (message: string) => Promise<string>
): Promise<WSAuthMessage> {
  const message = generateWSAuthMessage(address, chainId);
  const signature = await signMessage(message);
  
  return {
    type: 'auth',
    address,
    message,
    signature,
    chainId,
    timestamp: Date.now(),
  };
}

/**
 * Verify WebSocket authentication on the server side
 * 
 * NOTE: This is a client-side reference implementation.
 * The actual verification MUST happen on the WebSocket server.
 * 
 * Server-side verification should:
 * 1. Check timestamp is recent (within 5 minutes)
 * 2. Verify signature matches the message
 * 3. Recover signer address from signature
 * 4. Ensure recovered address matches claimed address
 * 5. Store authenticated session
 */
export interface WSAuthVerificationResult {
  isValid: boolean;
  address?: Address;
  error?: string;
}

/**
 * Client-side validation helper
 * This validates the format and basic requirements
 * The actual cryptographic verification MUST happen server-side
 */
export function validateWSAuthMessage(auth: WSAuthMessage): { valid: boolean; error?: string } {
  // Check required fields
  if (!auth.address || !auth.message || !auth.signature || !auth.chainId) {
    return { valid: false, error: 'Missing required authentication fields' };
  }

  // Check timestamp is recent (within 5 minutes)
  const now = Date.now();
  const timeDiff = now - auth.timestamp;
  const MAX_AGE = 5 * 60 * 1000; // 5 minutes

  if (timeDiff > MAX_AGE) {
    return { valid: false, error: 'Authentication message has expired' };
  }

  if (timeDiff < -60000) {
    return { valid: false, error: 'Authentication message timestamp is in the future' };
  }

  // Check message format
  if (!auth.message.includes('VFIDE WebSocket Authentication')) {
    return { valid: false, error: 'Invalid authentication message format' };
  }

  if (!auth.message.includes(auth.address)) {
    return { valid: false, error: 'Address mismatch in authentication message' };
  }

  // Check signature format (0x prefix and 130 chars for Ethereum signature)
  if (!auth.signature.startsWith('0x') || auth.signature.length !== 132) {
    return { valid: false, error: 'Invalid signature format' };
  }

  return { valid: true };
}

/**
 * Example usage in WebSocket client
 * 
 * ```typescript
 * import { useAccount, useSignMessage } from 'wagmi';
 * import { createWSAuthPayload } from '@/lib/websocket-auth';
 * 
 * function MyComponent() {
 *   const { address, chainId } = useAccount();
 *   const { signMessageAsync } = useSignMessage();
 *   
 *   const connectWebSocket = async () => {
 *     if (!address || !chainId) return;
 *     
 *     // Create authentication payload
 *     const authPayload = await createWSAuthPayload(
 *       address,
 *       chainId,
 *       signMessageAsync
 *     );
 *     
 *     // Connect to WebSocket
 *     const ws = new WebSocket('wss://your-server.com');
 *     
 *     ws.onopen = () => {
 *       // Send authentication immediately after connection
 *       ws.send(JSON.stringify(authPayload));
 *     };
 *     
 *     ws.onmessage = (event) => {
 *       const data = JSON.parse(event.data);
 *       if (data.type === 'auth_success') {
 *         console.log('WebSocket authenticated successfully');
 *       }
 *     };
 *   };
 * }
 * ```
 */

/**
 * Server-side verification pseudo-code
 * This should be implemented in your WebSocket server (e.g., websocket-server/)
 * 
 * ```typescript
 * // In your WebSocket server
 * import { verifyMessage } from 'viem';
 * 
 * async function verifyWSAuth(auth: WSAuthMessage): Promise<WSAuthVerificationResult> {
 *   try {
 *     // 1. Validate format and timestamp
 *     const validation = validateWSAuthMessage(auth);
 *     if (!validation.valid) {
 *       return { isValid: false, error: validation.error };
 *     }
 *     
 *     // 2. Verify the signature
 *     const recoveredAddress = await verifyMessage({
 *       message: auth.message,
 *       signature: auth.signature,
 *     });
 *     
 *     // 3. Check recovered address matches claimed address
 *     if (recoveredAddress.toLowerCase() !== auth.address.toLowerCase()) {
 *       return { isValid: false, error: 'Signature verification failed' };
 *     }
 *     
 *     // 4. Success - store session
 *     return { isValid: true, address: auth.address };
 *   } catch (error) {
 *     return { isValid: false, error: 'Signature verification error' };
 *   }
 * }
 * ```
 */

/**
 * Security Best Practices for WebSocket Authentication:
 * 
 * 1. Always verify signatures on the server
 * 2. Use short expiration times (5 minutes or less)
 * 3. Include nonce to prevent replay attacks
 * 4. Verify chain ID matches your supported networks
 * 5. Rate limit authentication attempts
 * 6. Log failed authentication attempts
 * 7. Use secure WebSocket (wss://) in production
 * 8. Implement connection timeout
 * 9. Re-authenticate on reconnection
 * 10. Clear session on disconnect
 */
