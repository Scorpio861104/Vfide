'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNaturalLanguage } from '@/lib/naturalLanguage';
import { useVoiceCommands, speak } from '@/lib/voiceCommands';
import { toast } from '@/lib/toast';
import { useAccount, usePublicClient } from 'wagmi';

// ============================================================================
// Command Bar Component - Natural Language + Voice
// ============================================================================

export default function CommandBar() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    intent: parsedIntent,
    plan: executionPlan,
    parse,
    clear: clearIntent,
    setInput: _setNLPInput,
  } = useNaturalLanguage();

  const isProcessing = false; // No async processing for now
  const error = null;
  const examples = [
    'Send 100 VFIDE to alice.eth',
    'Split 300 USDC between bob.eth and carol.eth',
    'Pay rent 1500 USDC monthly',
  ];

  const {
    isListening,
    transcript,
    isSupported: voiceSupported,
    startListening,
    stopListening,
  } = useVoiceCommands({
    onResult: (result) => {
      setInput(result.transcript);
      parse(result.transcript);
    },
  });

  // Keyboard shortcut to open (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        clearIntent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearIntent]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Update transcript in input
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      parse(input.trim());
    }
  }, [input, parse]);

  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const resolveRecipient = useCallback(async (identifier: string) => {
    if (identifier.startsWith('0x') && identifier.length === 42) {
      return identifier;
    }

    if (identifier.endsWith('.eth') && publicClient) {
      const resolved = await publicClient.getEnsAddress({ name: identifier });
      if (!resolved) {
        throw new Error(`Unable to resolve ENS ${identifier}`);
      }
      return resolved;
    }

    const response = await fetch(`/api/users?search=${encodeURIComponent(identifier)}&limit=1`);
    if (response.ok) {
      const data = await response.json();
      const user = Array.isArray(data?.data) ? data.data[0] : data?.items?.[0];
      const address = user?.wallet_address || user?.address;
      if (address) {
        return address as string;
      }
    }

    throw new Error(`Unsupported recipient: ${identifier}`);
  }, [publicClient]);

  const handleExecute = useCallback(async () => {
    if (!executionPlan || executionPlan.steps.length === 0) {
      toast.error('No valid actions to execute');
      return;
    }

    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    // Confirm with voice
    speak('Executing your request');

    try {
      for (const step of executionPlan.steps) {
        toast.info(`Executing: ${step.description}`);

        if (step.type === 'send') {
          const recipient = await resolveRecipient(String(step.params.to));
          const response = await fetch('/api/crypto/payment-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              toAddress: recipient,
              amount: String(step.params.amount ?? 0),
              token: String(step.params.token ?? 'ETH'),
              memo: `Command: ${step.description}`,
            }),
          });

          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || 'Failed to create payment request');
          }
        } else {
          toast.info(`Step type ${step.type} requires manual execution`);
        }
      }

      toast.success('All actions completed');
      speak('All done');
      setIsOpen(false);
      setInput('');
      clearIntent();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Execution failed');
    }
  }, [executionPlan, clearIntent, address, resolveRecipient]);

  const handleExampleClick = useCallback((example: string) => {
    setInput(example);
    parse(example);
  }, [parse]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 p-4 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-105 z-50"
        aria-label="Open command bar"
      >
        <CommandIcon />
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
        onClick={() => {
          setIsOpen(false);
          clearIntent();
        }}
      />

      {/* Command Modal */}
      <div className="fixed inset-x-4 top-20 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
        {/* Input */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center border-b border-border">
            <SearchIcon className="ml-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (e.target.value.length > 3) {
                  parse(e.target.value);
                }
              }}
              placeholder="Type a command... (e.g., 'send 0.1 ETH to alice.eth')"
              className="flex-1 px-4 py-4 bg-transparent text-lg outline-none"
            />
            {voiceSupported && (
              <button
                type="button"
                onClick={handleVoiceToggle}
                className={`p-3 mr-2 rounded-lg transition-colors ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'hover:bg-muted'
                }`}
                aria-label={isListening ? 'Stop listening' : 'Start voice input'}
              >
                <MicIcon />
              </button>
            )}
            <kbd className="hidden md:block mr-4 px-2 py-1 text-xs bg-muted rounded text-muted-foreground">
              ESC
            </kbd>
          </div>
        </form>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Processing State */}
          {isProcessing && (
            <div className="p-4 flex items-center gap-3 text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Understanding your request...</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-500/10 text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* Parsed Intent */}
          {parsedIntent && !isProcessing && (
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="text-green-500" />
                <span className="font-medium">Understood: {parsedIntent.type}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  parsedIntent.confidence > 0.8
                    ? 'bg-green-500/20 text-green-500'
                    : parsedIntent.confidence > 0.5
                    ? 'bg-yellow-500/20 text-yellow-500'
                    : 'bg-red-500/20 text-red-500'
                }`}>
                  {(parsedIntent.confidence * 100).toFixed(0)}% confident
                </span>
              </div>

              {/* Intent Details */}
              <div className="bg-muted rounded-lg p-3 space-y-2 text-sm">
                {parsedIntent.recipients && parsedIntent.recipients.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground">To:</span>
                    <div className="flex flex-wrap gap-1">
                      {parsedIntent.recipients.map((r, i) => (
                        <span key={i} className="px-2 py-0.5 bg-primary/10 rounded font-mono text-xs">
                          {r.identifier}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {parsedIntent.amount && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-semibold">
                      {parsedIntent.amount} {parsedIntent.token}
                    </span>
                  </div>
                )}

                {parsedIntent.schedule && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Schedule:</span>
                    <span>{parsedIntent.schedule.type}</span>
                    {parsedIntent.schedule.date && (
                      <span className="text-muted-foreground">
                        ({new Date(parsedIntent.schedule.date).toLocaleString()})
                      </span>
                    )}
                  </div>
                )}

                {parsedIntent.condition && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Condition:</span>
                    <span>{parsedIntent.condition.type}: {parsedIntent.condition.description}</span>
                  </div>
                )}
              </div>

              {/* Execution Plan */}
              {executionPlan && executionPlan.steps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Execution Plan:</h4>
                  <div className="space-y-1">
                    {executionPlan.steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-5 h-5 flex items-center justify-center bg-primary/10 rounded-full text-xs">
                          {i + 1}
                        </span>
                        <span>{step.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Execute Button */}
              <button
                onClick={handleExecute}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
              >
                Execute
              </button>
            </div>
          )}

          {/* Examples (when no intent) */}
          {!parsedIntent && !isProcessing && (
            <div className="p-4 space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Try saying:</h4>
              <div className="grid gap-2">
                {examples.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(example)}
                    className="text-left px-3 py-2 text-sm bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    &quot;{example}&quot;
                  </button>
                ))}
              </div>

              {voiceSupported && (
                <div className="mt-4 p-3 bg-primary/5 rounded-lg text-sm text-muted-foreground">
                  💡 Tip: Click the microphone icon to use voice commands
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-muted rounded">↵</kbd>
            <span>to parse</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <span className="font-semibold text-primary">VFIDE AI</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Icons
// ============================================================================

function CommandIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function SearchIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function CheckCircleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
