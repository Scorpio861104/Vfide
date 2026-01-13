/**
 * Voice Commands Tests
 */

import {
  VoiceState,
  VoiceCommandResult,
} from '../voiceCommands';

describe('VoiceState interface', () => {
  it('defines voice state structure', () => {
    const state: VoiceState = {
      isListening: false,
      isSupported: true,
      transcript: '',
      interimTranscript: '',
      error: null,
      confidence: 0,
    };
    expect(state.isListening).toBe(false);
    expect(state.isSupported).toBe(true);
    expect(state.transcript).toBe('');
    expect(state.interimTranscript).toBe('');
    expect(state.error).toBeNull();
    expect(state.confidence).toBe(0);
  });

  it('tracks listening state', () => {
    const listeningState: VoiceState = {
      isListening: true,
      isSupported: true,
      transcript: 'send 5 dollars to john',
      interimTranscript: 'send five',
      error: null,
      confidence: 0.95,
    };
    expect(listeningState.isListening).toBe(true);
    expect(listeningState.transcript).toBe('send 5 dollars to john');
    expect(listeningState.confidence).toBe(0.95);
  });

  it('tracks error state', () => {
    const errorState: VoiceState = {
      isListening: false,
      isSupported: true,
      transcript: '',
      interimTranscript: '',
      error: 'Microphone access denied',
      confidence: 0,
    };
    expect(errorState.error).toBe('Microphone access denied');
    expect(errorState.isListening).toBe(false);
  });

  it('tracks unsupported state', () => {
    const unsupportedState: VoiceState = {
      isListening: false,
      isSupported: false,
      transcript: '',
      interimTranscript: '',
      error: 'Speech recognition not supported',
      confidence: 0,
    };
    expect(unsupportedState.isSupported).toBe(false);
  });
});

describe('VoiceCommandResult interface', () => {
  it('defines command result structure', () => {
    const result: VoiceCommandResult = {
      transcript: 'send 10 usdc to alice',
      intent: null,
      plan: null,
    };
    expect(result.transcript).toBe('send 10 usdc to alice');
    expect(result.intent).toBeNull();
    expect(result.plan).toBeNull();
  });

  it('includes parsed intent', () => {
    const result: VoiceCommandResult = {
      transcript: 'pay bob 50 dollars',
      intent: {
        action: 'send',
        amount: '50',
        token: 'USDC',
        recipients: [{ name: 'bob', address: null }],
        confidence: 0.9,
        raw: 'pay bob 50 dollars',
      },
      plan: null,
    };
    expect(result.intent).toBeDefined();
    expect(result.intent?.action).toBe('send');
    expect(result.intent?.amount).toBe('50');
  });

  it('includes execution plan', () => {
    const result: VoiceCommandResult = {
      transcript: 'send money',
      intent: {
        action: 'send',
        amount: null,
        token: null,
        recipients: [],
        confidence: 0.5,
        raw: 'send money',
      },
      plan: {
        steps: [{ type: 'input', field: 'amount' }],
        requiresConfirmation: true,
        warnings: ['Amount not specified'],
      },
    };
    expect(result.plan).toBeDefined();
    expect(result.plan?.requiresConfirmation).toBe(true);
    expect(result.plan?.warnings).toContain('Amount not specified');
  });
});

describe('Voice command parsing utilities', () => {
  it('extracts amounts from speech', () => {
    const extractAmount = (text: string): string | null => {
      const patterns = [
        /(\d+(?:\.\d+)?)\s*(?:dollars?|usd|usdc)/i,
        /(\d+(?:\.\d+)?)\s*(?:eth|ether)/i,
        /\$(\d+(?:\.\d+)?)/,
        /(\d+(?:\.\d+)?)/,
      ];
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1];
      }
      return null;
    };

    expect(extractAmount('send 50 dollars')).toBe('50');
    expect(extractAmount('pay $25.50')).toBe('25.50');
    expect(extractAmount('transfer 1.5 eth')).toBe('1.5');
    expect(extractAmount('send money')).toBeNull();
  });

  it('identifies action intents', () => {
    const identifyAction = (text: string): string => {
      const lower = text.toLowerCase();
      if (lower.includes('send') || lower.includes('pay') || lower.includes('transfer')) {
        return 'send';
      }
      if (lower.includes('request') || lower.includes('ask for')) {
        return 'request';
      }
      if (lower.includes('check') || lower.includes('balance') || lower.includes('show')) {
        return 'check';
      }
      return 'unknown';
    };

    expect(identifyAction('send 10 to bob')).toBe('send');
    expect(identifyAction('pay alice 20')).toBe('send');
    expect(identifyAction('request 50 from john')).toBe('request');
    expect(identifyAction('check my balance')).toBe('check');
    expect(identifyAction('hello world')).toBe('unknown');
  });

  it('extracts recipient names', () => {
    const extractRecipient = (text: string): string | null => {
      const patterns = [
        /(?:to|pay)\s+([a-zA-Z]+)/i,
        /(?:from)\s+([a-zA-Z]+)/i,
      ];
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1];
      }
      return null;
    };

    expect(extractRecipient('send 10 to bob')).toBe('bob');
    expect(extractRecipient('pay alice 20')).toBe('alice');
    expect(extractRecipient('request from john')).toBe('john');
    expect(extractRecipient('check balance')).toBeNull();
  });
});

describe('Confidence calculation', () => {
  it('calculates confidence based on match quality', () => {
    const calculateConfidence = (
      hasAmount: boolean,
      hasRecipient: boolean,
      hasAction: boolean
    ): number => {
      let confidence = 0;
      if (hasAction) confidence += 0.4;
      if (hasAmount) confidence += 0.3;
      if (hasRecipient) confidence += 0.3;
      return confidence;
    };

    expect(calculateConfidence(true, true, true)).toBe(1.0);
    expect(calculateConfidence(false, true, true)).toBe(0.7);
    expect(calculateConfidence(false, false, true)).toBe(0.4);
    expect(calculateConfidence(false, false, false)).toBe(0);
  });
});
