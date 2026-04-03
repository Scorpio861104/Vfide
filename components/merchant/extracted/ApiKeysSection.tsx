'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function ApiKeysSection({
  keys,
  newKeyName,
  setNewKeyName,
  onGenerateKey,
  onRevokeKey,
}: {
  keys: ApiKey[];
  newKeyName: string;
  setNewKeyName: (name: string) => void;
  onGenerateKey: () => void;
  onRevokeKey: (keyId: string) => void;
}) {
  const displayKeys = keys;

  return (
    <div className="space-y-6">
      {/* Generate New Key */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Generate New API Key
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Submit a key request here, then retrieve the issued secret from your secure backend credential process.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <MobileInput
            label="Key Name"
            placeholder="Production API Key"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1"
          />
          <div className="pt-6">
            <MobileButton onClick={onGenerateKey}>
              Generate
            </MobileButton>
          </div>
        </div>
      </div>

      {/* API Keys List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Your API Keys
        </h2>
        <div className="space-y-3">
          {displayKeys.length === 0 ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-400">
              No API keys available yet.
            </div>
          ) : null}
          {displayKeys.map((key) => (
            <ApiKeyCard
              key={key.id}
              apiKey={key}
              onRevoke={() => onRevokeKey(key.id)}
            />
          ))}
        </div>
      </div>

      {/* API Documentation */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 md:p-6 border border-blue-200 dark:border-blue-700">
        <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-2">📚 API Documentation</h3>
        <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
          Learn how to integrate VFIDE API into your application
        </p>
        <a
          href="/docs"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          View Documentation
        </a>
      </div>
    </div>
  );
}
