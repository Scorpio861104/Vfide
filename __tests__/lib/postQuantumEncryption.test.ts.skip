/**
 * Tests for Post-Quantum Cryptography Module
 * 
 * Tests hybrid encryption (ECDH + ML-KEM) and signatures (ECDSA + Dilithium)
 */

import {
  generateHybridKeyPair,
  deriveHybridKeyPair,
  exportPublicKeys,
  hybridEncrypt,
  hybridDecrypt,
  hybridSign,
  hybridVerify,
  generatePQKeyPair,
  pqEncapsulate,
  pqDecapsulate,
  generateDilithiumKeyPair,
  dilithiumSign,
  dilithiumVerify,
  getEncryptionVersion,
  isPostQuantumEncrypted,
  storePublicKeys,
  getStoredPublicKeys,
  SECURITY_INFO,
  type PQKeyPair,
  type HybridPublicKey
} from '@/lib/postQuantumEncryption';

// Mock crypto for Node.js environment
const mockCrypto = {
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  },
  subtle: {
    generateKey: jest.fn(),
    exportKey: jest.fn(),
    importKey: jest.fn(),
    deriveBits: jest.fn(),
    deriveKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    sign: jest.fn(),
    verify: jest.fn(),
    digest: jest.fn()
  }
};

// Setup global crypto mock
Object.defineProperty(globalThis, 'crypto', {
  value: mockCrypto,
  writable: true
});

// Mock mlkem module
jest.mock('mlkem', () => ({
  MlKem1024: jest.fn().mockImplementation(() => ({
    generateKeyPair: jest.fn().mockResolvedValue([
      new Uint8Array(1568), // Public key
      new Uint8Array(3168)  // Private key
    ]),
    encap: jest.fn().mockResolvedValue([
      new Uint8Array(1568), // Ciphertext
      new Uint8Array(32)    // Shared secret
    ]),
    decap: jest.fn().mockResolvedValue(new Uint8Array(32)) // Shared secret
  }))
}));

// Mock dilithium module
jest.mock('@theqrl/dilithium5', () => ({
  newKeyPair: jest.fn().mockResolvedValue({
    getPublicKey: () => new Uint8Array(2592),
    getSecretKey: () => new Uint8Array(4864)
  }),
  sign: jest.fn().mockResolvedValue(new Uint8Array(4627)),
  verify: jest.fn().mockResolvedValue(true)
}));

describe('Post-Quantum Cryptography Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup subtle crypto mocks
    mockCrypto.subtle.generateKey.mockResolvedValue({
      publicKey: { type: 'public' },
      privateKey: { type: 'private' }
    });
    
    mockCrypto.subtle.exportKey.mockImplementation((format) => {
      if (format === 'raw') return Promise.resolve(new ArrayBuffer(65));
      if (format === 'pkcs8') return Promise.resolve(new ArrayBuffer(121));
      return Promise.resolve(new ArrayBuffer(32));
    });
    
    mockCrypto.subtle.importKey.mockResolvedValue({ type: 'imported' });
    mockCrypto.subtle.deriveBits.mockResolvedValue(new ArrayBuffer(32));
    mockCrypto.subtle.deriveKey.mockResolvedValue({ type: 'aes-key' });
    mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(64));
    mockCrypto.subtle.decrypt.mockResolvedValue(new TextEncoder().encode('test message'));
    mockCrypto.subtle.sign.mockResolvedValue(new ArrayBuffer(64));
    mockCrypto.subtle.verify.mockResolvedValue(true);
    mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));
    
    // Clear localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });
  
  describe('SECURITY_INFO', () => {
    it('should have correct version', () => {
      expect(SECURITY_INFO.version).toBe(4);
    });
    
    it('should document hybrid algorithms', () => {
      expect(SECURITY_INFO.algorithms.keyExchange.classical).toBe('ECDH P-256');
      expect(SECURITY_INFO.algorithms.keyExchange.postQuantum).toBe('ML-KEM-1024 (CRYSTALS-Kyber)');
      expect(SECURITY_INFO.algorithms.signature.postQuantum).toBe('Dilithium-5 (CRYSTALS-Dilithium)');
    });
    
    it('should document NIST standards', () => {
      expect(SECURITY_INFO.nistStandards).toContain('FIPS 203 (ML-KEM)');
      expect(SECURITY_INFO.nistStandards).toContain('FIPS 204 (ML-DSA)');
    });
    
    it('should document security levels', () => {
      expect(SECURITY_INFO.securityLevel.quantum).toBe('256-bit (NIST Level 5)');
    });
  });
  
  describe('ML-KEM (Kyber) Operations', () => {
    it('should generate ML-KEM key pair', async () => {
      const keyPair = await generatePQKeyPair();
      
      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.publicKey.length).toBeGreaterThan(0);
      expect(keyPair.privateKey.length).toBeGreaterThan(0);
    });
    
    it('should encapsulate shared secret', async () => {
      const keyPair = await generatePQKeyPair();
      const { ciphertext, sharedSecret } = await pqEncapsulate(keyPair.publicKey);
      
      expect(ciphertext).toBeInstanceOf(Uint8Array);
      expect(sharedSecret).toBeInstanceOf(Uint8Array);
      expect(sharedSecret.length).toBe(32); // 256-bit secret
    });
    
    it('should decapsulate shared secret', async () => {
      const keyPair = await generatePQKeyPair();
      const { ciphertext, sharedSecret: encapSecret } = await pqEncapsulate(keyPair.publicKey);
      const decapSecret = await pqDecapsulate(ciphertext, keyPair.privateKey);
      
      expect(decapSecret).toBeInstanceOf(Uint8Array);
      expect(decapSecret.length).toBe(32);
    });
  });
  
  describe('Dilithium Signature Operations', () => {
    it('should generate Dilithium key pair', async () => {
      const keyPair = await generateDilithiumKeyPair();
      
      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
    });
    
    it('should sign message with Dilithium', async () => {
      const keyPair = await generateDilithiumKeyPair();
      const message = new TextEncoder().encode('test message');
      const signature = await dilithiumSign(message, keyPair.privateKey);
      
      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBeGreaterThan(0);
    });
    
    it('should verify valid Dilithium signature', async () => {
      const keyPair = await generateDilithiumKeyPair();
      const message = new TextEncoder().encode('test message');
      const signature = await dilithiumSign(message, keyPair.privateKey);
      
      const isValid = await dilithiumVerify(message, signature, keyPair.publicKey);
      expect(isValid).toBe(true);
    });
  });
  
  describe('Hybrid Key Pair Generation', () => {
    it('should generate complete hybrid key pair', async () => {
      const keyPair = await generateHybridKeyPair();
      
      // Classical keys
      expect(keyPair.classicalPublicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.classicalPrivateKey).toBeInstanceOf(Uint8Array);
      
      // Post-quantum keys
      expect(keyPair.pqPublicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.pqPrivateKey).toBeInstanceOf(Uint8Array);
      
      // Signing keys
      expect(keyPair.signPublicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.signPrivateKey).toBeInstanceOf(Uint8Array);
      
      // Dilithium keys
      expect(keyPair.dilithiumPublicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.dilithiumPrivateKey).toBeInstanceOf(Uint8Array);
    });
    
    it('should derive hybrid key pair from wallet signature', async () => {
      const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';
      const signature = '0xabc123...';
      
      const keyPair = await deriveHybridKeyPair(walletAddress, signature);
      
      expect(keyPair.classicalPublicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.pqPublicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.dilithiumPublicKey).toBeInstanceOf(Uint8Array);
    });
    
    it('should export public keys in correct format', async () => {
      const keyPair = await generateHybridKeyPair();
      const publicKeys = exportPublicKeys(keyPair);
      
      expect(publicKeys.version).toBe(4);
      expect(typeof publicKeys.classical).toBe('string');
      expect(typeof publicKeys.pq).toBe('string');
      expect(typeof publicKeys.sign).toBe('string');
      expect(typeof publicKeys.dilithium).toBe('string');
      
      // Should be hex-encoded
      expect(publicKeys.classical).toMatch(/^[0-9a-f]+$/);
      expect(publicKeys.pq).toMatch(/^[0-9a-f]+$/);
    });
  });
  
  describe('Hybrid Encryption', () => {
    let aliceKeyPair: PQKeyPair;
    let bobKeyPair: PQKeyPair;
    let alicePublicKeys: HybridPublicKey;
    let bobPublicKeys: HybridPublicKey;
    
    beforeEach(async () => {
      aliceKeyPair = await generateHybridKeyPair();
      bobKeyPair = await generateHybridKeyPair();
      alicePublicKeys = exportPublicKeys(aliceKeyPair);
      bobPublicKeys = exportPublicKeys(bobKeyPair);
    });
    
    it('should encrypt message with hybrid encryption', async () => {
      const message = 'Hello, quantum-safe world!';
      const encrypted = await hybridEncrypt(message, bobPublicKeys);
      
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
      
      // Should be base64 encoded
      expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
    });
    
    it('should include version 4 in encrypted payload', async () => {
      const message = 'Test message';
      const encrypted = await hybridEncrypt(message, bobPublicKeys);
      
      const payload = JSON.parse(Buffer.from(encrypted, 'base64').toString('utf8'));
      expect(payload.version).toBe(4);
    });
    
    it('should include all required fields in encrypted payload', async () => {
      const message = 'Test message';
      const encrypted = await hybridEncrypt(message, bobPublicKeys);
      
      const payload = JSON.parse(Buffer.from(encrypted, 'base64').toString('utf8'));
      
      expect(payload).toHaveProperty('ephemeralPublicKey');
      expect(payload).toHaveProperty('pqCiphertext');
      expect(payload).toHaveProperty('ciphertext');
      expect(payload).toHaveProperty('iv');
      expect(payload).toHaveProperty('timestamp');
      expect(payload).toHaveProperty('nonce');
    });
    
    it('should decrypt message successfully', async () => {
      const originalMessage = 'Secret quantum-resistant message';
      const encrypted = await hybridEncrypt(originalMessage, bobPublicKeys);
      
      // Mock decrypt to return original message
      mockCrypto.subtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(originalMessage)
      );
      
      const decrypted = await hybridDecrypt(encrypted, bobKeyPair);
      
      expect(decrypted.message).toBe(originalMessage);
      expect(typeof decrypted.timestamp).toBe('number');
    });
    
    it('should reject non-v4 encrypted payloads', async () => {
      const legacyPayload = Buffer.from(JSON.stringify({
        version: 3,
        ciphertext: 'abc123'
      })).toString('base64');
      
      await expect(hybridDecrypt(legacyPayload, bobKeyPair))
        .rejects.toThrow('Unsupported encryption version');
    });
  });
  
  describe('Hybrid Signatures', () => {
    let keyPair: PQKeyPair;
    let publicKeys: HybridPublicKey;
    
    beforeEach(async () => {
      keyPair = await generateHybridKeyPair();
      publicKeys = exportPublicKeys(keyPair);
    });
    
    it('should sign message with hybrid signatures', async () => {
      const message = 'Important message to sign';
      const signed = await hybridSign(message, keyPair);
      
      expect(signed.message).toBe(message);
      expect(typeof signed.ecdsaSignature).toBe('string');
      expect(typeof signed.dilithiumSignature).toBe('string');
      expect(typeof signed.timestamp).toBe('number');
    });
    
    it('should verify valid hybrid signature', async () => {
      const message = 'Message to verify';
      const signed = await hybridSign(message, keyPair);
      
      const isValid = await hybridVerify(signed, publicKeys);
      expect(isValid).toBe(true);
    });
    
    it('should include timestamp in signed message', async () => {
      const beforeSign = Date.now();
      const signed = await hybridSign('Test', keyPair);
      const afterSign = Date.now();
      
      expect(signed.timestamp).toBeGreaterThanOrEqual(beforeSign);
      expect(signed.timestamp).toBeLessThanOrEqual(afterSign);
    });
  });
  
  describe('Version Detection', () => {
    it('should detect version 4 (post-quantum) payloads', () => {
      const v4Payload = Buffer.from(JSON.stringify({
        version: 4,
        ciphertext: 'abc123'
      })).toString('base64');
      
      expect(getEncryptionVersion(v4Payload)).toBe(4);
      expect(isPostQuantumEncrypted(v4Payload)).toBe(true);
    });
    
    it('should detect legacy payloads', () => {
      const v3Payload = Buffer.from(JSON.stringify({
        version: 3,
        ciphertext: 'abc123'
      })).toString('base64');
      
      expect(getEncryptionVersion(v3Payload)).toBe(3);
      expect(isPostQuantumEncrypted(v3Payload)).toBe(false);
    });
    
    it('should default to version 1 for invalid payloads', () => {
      expect(getEncryptionVersion('invalid-base64!!')).toBe(1);
      expect(isPostQuantumEncrypted('invalid-base64!!')).toBe(false);
    });
    
    it('should handle payloads without version field', () => {
      const noVersionPayload = Buffer.from(JSON.stringify({
        ciphertext: 'abc123'
      })).toString('base64');
      
      expect(getEncryptionVersion(noVersionPayload)).toBe(1);
    });
  });
  
  describe('Key Storage', () => {
    const testAddress = '0xTestAddress123';
    const testPublicKeys: HybridPublicKey = {
      classical: 'abc123',
      pq: 'def456',
      sign: 'ghi789',
      dilithium: 'jkl012',
      version: 4
    };
    
    beforeEach(() => {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    });
    
    it('should store and retrieve public keys', () => {
      storePublicKeys(testAddress, testPublicKeys);
      const retrieved = getStoredPublicKeys(testAddress);
      
      expect(retrieved).toEqual(testPublicKeys);
    });
    
    it('should normalize address to lowercase', () => {
      storePublicKeys('0xABCDEF', testPublicKeys);
      const retrieved = getStoredPublicKeys('0xabcdef');
      
      expect(retrieved).toEqual(testPublicKeys);
    });
    
    it('should return null for unknown address', () => {
      const retrieved = getStoredPublicKeys('0xUnknown');
      expect(retrieved).toBeNull();
    });
  });
  
  describe('Security Properties', () => {
    it('should use 256-bit AES-GCM', () => {
      expect(SECURITY_INFO.algorithms.encryption).toBe('AES-256-GCM');
    });
    
    it('should use NIST Level 5 post-quantum security', () => {
      expect(SECURITY_INFO.securityLevel.quantum).toContain('Level 5');
    });
    
    it('should require both classical and PQ algorithms', () => {
      expect(SECURITY_INFO.algorithms.keyExchange.combined).toContain('both');
      expect(SECURITY_INFO.algorithms.signature.combined).toContain('both');
    });
  });
});

describe('Post-Quantum Encryption Integration', () => {
  describe('End-to-End Encryption Flow', () => {
    it('should complete full encryption/decryption cycle', async () => {
      // Generate keys for Alice and Bob
      const aliceKeys = await generateHybridKeyPair();
      const bobKeys = await generateHybridKeyPair();
      
      const alicePublic = exportPublicKeys(aliceKeys);
      const bobPublic = exportPublicKeys(bobKeys);
      
      // Alice encrypts message for Bob
      const message = 'Hello Bob, this is quantum-safe!';
      const encrypted = await hybridEncrypt(message, bobPublic);
      
      // Verify payload structure
      const payload = JSON.parse(Buffer.from(encrypted, 'base64').toString('utf8'));
      expect(payload.version).toBe(4);
      expect(payload.ephemeralPublicKey).toBeDefined();
      expect(payload.pqCiphertext).toBeDefined();
      
      // Bob decrypts message
      mockCrypto.subtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(message)
      );
      
      const decrypted = await hybridDecrypt(encrypted, bobKeys);
      expect(decrypted.message).toBe(message);
    });
    
    it('should complete full signing/verification cycle', async () => {
      const signerKeys = await generateHybridKeyPair();
      const signerPublic = exportPublicKeys(signerKeys);
      
      // Sign message
      const message = 'I attest to this statement';
      const signed = await hybridSign(message, signerKeys);
      
      expect(signed.ecdsaSignature).toBeDefined();
      expect(signed.dilithiumSignature).toBeDefined();
      
      // Verify signature
      const isValid = await hybridVerify(signed, signerPublic);
      expect(isValid).toBe(true);
    });
  });
  
  describe('Backward Compatibility', () => {
    it('should reject v3 payloads with helpful error', async () => {
      const v3Payload = Buffer.from(JSON.stringify({
        version: 3,
        ephemPublicKey: 'abc',
        ciphertext: 'def',
        iv: '123'
      })).toString('base64');
      
      const keyPair = await generateHybridKeyPair();
      
      await expect(hybridDecrypt(v3Payload, keyPair))
        .rejects.toThrow(/version.*3|Unsupported encryption/i);
    });
    
    it('should detect post-quantum vs legacy encryption', () => {
      const pqPayload = Buffer.from(JSON.stringify({ version: 4 })).toString('base64');
      const legacyPayload = Buffer.from(JSON.stringify({ version: 2 })).toString('base64');
      
      expect(isPostQuantumEncrypted(pqPayload)).toBe(true);
      expect(isPostQuantumEncrypted(legacyPayload)).toBe(false);
    });
  });
});
