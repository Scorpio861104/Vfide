'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, ArrowRight, Lock, Zap } from 'lucide-react';
import { SECURITY_INFO, isPostQuantumEncrypted } from '@/lib/postQuantumEncryption';

interface QuantumSecurityBadgeProps {
  isQuantumSafe: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

/**
 * Badge indicating quantum security status
 */
export function QuantumSecurityBadge({ 
  isQuantumSafe, 
  size = 'md',
  showLabel = true 
}: QuantumSecurityBadgeProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };
  
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };
  
  return (
    <div className={`inline-flex items-center gap-1.5 ${textSizes[size]}`}>
      {isQuantumSafe ? (
        <>
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="relative"
          >
            <Shield className={`${sizes[size]} text-emerald-400`} />
            <Zap className="absolute -top-0.5 -right-0.5 h-2 w-2 text-cyan-400" />
          </motion.div>
          {showLabel && (
            <span className="text-emerald-400 font-medium">Quantum-Safe</span>
          )}
        </>
      ) : (
        <>
          <AlertTriangle className={`${sizes[size]} text-amber-400`} />
          {showLabel && (
            <span className="text-amber-400 font-medium">Classical Encryption</span>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Card showing encryption security details
 */
export function EncryptionSecurityCard() {
  return (
    <div className="rounded-xl border border-jade/20 bg-black/40 backdrop-blur-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-br from-jade/20 to-cyan-500/20">
          <Shield className="h-6 w-6 text-jade" />
        </div>
        <div>
          <h3 className="font-semibold text-white">{SECURITY_INFO.name}</h3>
          <p className="text-sm text-gray-400">Version {SECURITY_INFO.version}</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Key Exchange */}
        <div className="p-3 rounded-lg bg-white/5">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Key Exchange</h4>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300">
              {SECURITY_INFO.algorithms.keyExchange.classical}
            </span>
            <span className="text-gray-500">+</span>
            <span className="px-2 py-1 rounded bg-jade/20 text-jade">
              {SECURITY_INFO.algorithms.keyExchange.postQuantum}
            </span>
          </div>
        </div>
        
        {/* Encryption */}
        <div className="p-3 rounded-lg bg-white/5">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Symmetric Encryption</h4>
          <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300">
            {SECURITY_INFO.algorithms.encryption}
          </span>
        </div>
        
        {/* Signatures */}
        <div className="p-3 rounded-lg bg-white/5">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Digital Signatures</h4>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300">
              {SECURITY_INFO.algorithms.signature.classical}
            </span>
            <span className="text-gray-500">+</span>
            <span className="px-2 py-1 rounded bg-jade/20 text-jade">
              {SECURITY_INFO.algorithms.signature.postQuantum}
            </span>
          </div>
        </div>
        
        {/* Security Level */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-jade/10 to-cyan-500/10">
          <span className="text-sm text-gray-300">Security Level</span>
          <span className="text-sm font-medium text-jade">
            {SECURITY_INFO.securityLevel.quantum}
          </span>
        </div>
        
        {/* NIST Standards */}
        <div className="pt-3 border-t border-white/10">
          <p className="text-xs text-gray-500 mb-2">NIST Standards Compliance:</p>
          <div className="flex flex-wrap gap-2">
            {SECURITY_INFO.nistStandards.map((standard, i) => (
              <span 
                key={i}
                className="text-xs px-2 py-1 rounded bg-white/5 text-gray-400"
              >
                {standard}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MigrationStepProps {
  step: number;
  title: string;
  description: string;
  code?: string;
  isComplete?: boolean;
}

function MigrationStep({ step, title, description, code, isComplete }: MigrationStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: step * 0.1 }}
      className={`relative pl-8 pb-6 ${step < 4 ? 'border-l-2 border-jade/20' : ''}`}
    >
      <div className={`absolute left-0 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center ${
        isComplete 
          ? 'bg-jade text-black' 
          : 'bg-black border-2 border-jade/40 text-jade'
      }`}>
        {isComplete ? <CheckCircle className="h-4 w-4" /> : step}
      </div>
      
      <h4 className="font-medium text-white mb-1">{title}</h4>
      <p className="text-sm text-gray-400 mb-2">{description}</p>
      
      {code && (
        <pre className="text-xs bg-black/60 rounded-lg p-3 overflow-x-auto">
          <code className="text-jade">{code}</code>
        </pre>
      )}
    </motion.div>
  );
}

/**
 * Migration guide for transitioning to post-quantum encryption
 */
export function QuantumMigrationGuide() {
  const migrationSteps: MigrationStepProps[] = [
    {
      step: 1,
      title: 'Update Imports',
      description: 'Import from the new post-quantum module',
      code: `import { 
  usePQEncryption,
  hybridEncrypt,
  hybridDecrypt 
} from '@/lib/postQuantumEncryption';`
    },
    {
      step: 2,
      title: 'Generate Hybrid Keys',
      description: 'Create quantum-resistant key pairs for your users',
      code: `const { initializeKeys, publicKeys } = usePQEncryption(address);

// Initialize with wallet signature
await initializeKeys(signature);`
    },
    {
      step: 3,
      title: 'Encrypt Messages',
      description: 'Use hybrid encryption for new messages',
      code: `const encrypted = await hybridEncrypt(
  message, 
  recipientPublicKeys
);`
    },
    {
      step: 4,
      title: 'Handle Legacy Messages',
      description: 'Check version before decrypting',
      code: `import { isPostQuantumEncrypted } from '@/lib/postQuantumEncryption';

if (isPostQuantumEncrypted(payload)) {
  // Use new decryption
  const { message } = await hybridDecrypt(payload, keyPair);
} else {
  // Prompt user to request re-encryption
}`
    }
  ];
  
  return (
    <div className="rounded-xl border border-jade/20 bg-black/40 backdrop-blur-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-jade/20">
          <ArrowRight className="h-6 w-6 text-jade" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Migration Guide</h3>
          <p className="text-sm text-gray-400">Upgrade to post-quantum encryption</p>
        </div>
      </div>
      
      <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-400 mb-1">Why Migrate?</h4>
            <p className="text-sm text-gray-300">
              Classical cryptography (ECDH, ECDSA) is vulnerable to attacks by quantum computers.
              By 2030, quantum computers may be powerful enough to break these algorithms.
              Migrate now to protect your data against &quot;harvest now, decrypt later&quot; attacks.
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        {migrationSteps.map((step) => (
          <MigrationStep key={step.step} {...step} />
        ))}
      </div>
      
      <div className="mt-6 p-4 rounded-lg bg-jade/10 border border-jade/20">
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-jade flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-jade mb-1">Hybrid Security</h4>
            <p className="text-sm text-gray-300">
              Our implementation uses a hybrid approach: data is protected by BOTH classical
              AND post-quantum algorithms. An attacker would need to break BOTH to compromise
              your messages.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EncryptionStatusProps {
  encryptedPayload?: string;
  className?: string;
}

/**
 * Component to display encryption status of a message
 */
export function EncryptionStatus({ encryptedPayload, className = '' }: EncryptionStatusProps) {
  const isQuantumSafe = encryptedPayload ? isPostQuantumEncrypted(encryptedPayload) : false;
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <QuantumSecurityBadge isQuantumSafe={isQuantumSafe} size="sm" />
      {!isQuantumSafe && encryptedPayload && (
        <span className="text-xs text-amber-400">
          (Upgrade recommended)
        </span>
      )}
    </div>
  );
}

export default {
  QuantumSecurityBadge,
  EncryptionSecurityCard,
  QuantumMigrationGuide,
  EncryptionStatus
};
