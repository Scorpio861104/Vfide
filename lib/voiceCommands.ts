/**
 * Voice Commands Integration
 * 
 * Uses Web Speech API for voice input - fully client-side, no external services.
 * Integrates with Natural Language Parser for command execution.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { parseNaturalLanguage, ParsedIntent, createExecutionPlan, ExecutionPlan } from './naturalLanguage';

// ============================================================================
// Types
// ============================================================================

export interface VoiceState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  confidence: number;
}

export interface VoiceCommandResult {
  transcript: string;
  intent: ParsedIntent | null;
  plan: ExecutionPlan | null;
}

type VoiceEventCallback = (result: VoiceCommandResult) => void;

// ============================================================================
// Speech Recognition Setup
// ============================================================================

// Browser compatibility types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

function getSpeechRecognition(): SpeechRecognition | null {
  if (typeof window === 'undefined') return null;
  
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionAPI) return null;
  
  return new SpeechRecognitionAPI();
}

// ============================================================================
// Voice Command Shortcuts
// ============================================================================

const VOICE_SHORTCUTS: Record<string, string> = {
  // Navigation
  'go to dashboard': '/dashboard',
  'go to vault': '/vault',
  'go to payments': '/pay',
  'go to settings': '/settings',
  'go home': '/',
  
  // Quick actions
  'show balance': 'action:showBalance',
  'show transactions': 'action:showTransactions',
  'show notifications': 'action:showNotifications',
  'refresh': 'action:refresh',
  'cancel': 'action:cancel',
  'confirm': 'action:confirm',
  'go back': 'action:back',
};

function checkForShortcut(transcript: string): { type: 'navigation' | 'action'; value: string } | null {
  const lower = transcript.toLowerCase().trim();
  
  for (const [phrase, target] of Object.entries(VOICE_SHORTCUTS)) {
    if (lower.includes(phrase)) {
      if (target.startsWith('action:')) {
        return { type: 'action', value: target.replace('action:', '') };
      }
      return { type: 'navigation', value: target };
    }
  }
  
  return null;
}

// ============================================================================
// Voice Commands Hook
// ============================================================================

export function useVoiceCommands(options?: {
  continuous?: boolean;
  language?: string;
  onResult?: VoiceEventCallback;
  onShortcut?: (shortcut: { type: 'navigation' | 'action'; value: string }) => void;
}) {
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isSupported: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    confidence: 0,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(options?.onResult);
  const onShortcutRef = useRef(options?.onShortcut);

  // Update refs when callbacks change
  useEffect(() => {
    onResultRef.current = options?.onResult;
    onShortcutRef.current = options?.onShortcut;
  }, [options?.onResult, options?.onShortcut]);

  // Initialize speech recognition
  useEffect(() => {
    const recognition = getSpeechRecognition();
    
    if (!recognition) {
      setState(s => ({ ...s, isSupported: false }));
      return;
    }

    recognition.continuous = options?.continuous ?? false;
    recognition.interimResults = true;
    recognition.lang = options?.language ?? 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState(s => ({ 
        ...s, 
        isListening: true, 
        error: null,
        transcript: '',
        interimTranscript: '',
      }));
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      let bestConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result || !result[0]) continue;
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        if (result.isFinal) {
          final += transcript;
          bestConfidence = Math.max(bestConfidence, confidence);
        } else {
          interim += transcript;
        }
      }

      setState(s => ({
        ...s,
        transcript: s.transcript + final,
        interimTranscript: interim,
        confidence: bestConfidence || s.confidence,
      }));

      // Process final results
      if (final) {
        const fullTranscript = state.transcript + final;
        
        // Check for shortcuts first
        const shortcut = checkForShortcut(fullTranscript);
        if (shortcut && onShortcutRef.current) {
          onShortcutRef.current(shortcut);
          return;
        }

        // Parse as natural language command
        const intent = parseNaturalLanguage(fullTranscript);
        const plan = intent.type !== 'unknown' ? createExecutionPlan(intent) : null;

        if (onResultRef.current) {
          onResultRef.current({
            transcript: fullTranscript,
            intent,
            plan,
          });
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = 'Speech recognition error';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not available. Please check permissions.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please enable in settings.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check connection.';
          break;
        case 'aborted':
          errorMessage = ''; // User cancelled, no error message
          break;
        default:
          errorMessage = event.message || 'Unknown error occurred';
      }

      setState(s => ({ 
        ...s, 
        isListening: false, 
        error: errorMessage || null,
      }));
    };

    recognition.onend = () => {
      setState(s => ({ ...s, isListening: false }));
    };

    recognitionRef.current = recognition;
    setState(s => ({ ...s, isSupported: true }));

    return () => {
      recognition.abort();
    };
  }, [options?.continuous, options?.language]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !state.isListening) {
      setState(s => ({ 
        ...s, 
        transcript: '', 
        interimTranscript: '',
        error: null,
      }));
      
      try {
        recognitionRef.current.start();
      } catch (_err) {
        // Already started, ignore
      }
    }
  }, [state.isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && state.isListening) {
      recognitionRef.current.stop();
    }
  }, [state.isListening]);

  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  const clearTranscript = useCallback(() => {
    setState(s => ({ 
      ...s, 
      transcript: '', 
      interimTranscript: '',
    }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
  };
}

// ============================================================================
// Text-to-Speech for Confirmations
// ============================================================================

export function speak(text: string, options?: {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 1;
    utterance.pitch = options?.pitch ?? 1;
    utterance.volume = options?.volume ?? 1;

    // Find preferred voice
    if (options?.voice) {
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.name.toLowerCase().includes(options.voice!.toLowerCase())
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);

    window.speechSynthesis.speak(utterance);
  });
}

// Speak a confirmation message for an intent
export async function speakIntent(intent: ParsedIntent): Promise<void> {
  let message = '';

  switch (intent.type) {
    case 'send':
      message = `Sending ${intent.amount} ${intent.token} to ${intent.recipients.map(r => r.identifier).join(' and ')}.`;
      break;
    case 'split':
      message = `Splitting ${intent.amount} ${intent.token} between ${intent.recipients.length} recipients.`;
      break;
    case 'stream':
      if (intent.stream) {
        message = `Creating payment stream of ${intent.amount} ${intent.token} over ${Math.round(intent.stream.duration / 86400)} days.`;
      }
      break;
    case 'schedule':
      if (intent.schedule?.recurrence) {
        message = `Scheduling ${intent.schedule.recurrence} payment of ${intent.amount} ${intent.token}.`;
      } else {
        message = `Scheduling payment of ${intent.amount} ${intent.token} for ${intent.schedule?.date?.toLocaleDateString()}.`;
      }
      break;
    case 'conditional':
      message = `Creating conditional payment: ${intent.amount} ${intent.token}, ${intent.condition?.description}.`;
      break;
    default:
      message = "I didn't understand that command. Please try again.";
  }

  await speak(message);
}

// ============================================================================
// Voice Feedback Utility
// ============================================================================

export const voiceFeedback = {
  confirm: () => speak('Confirmed.'),
  cancel: () => speak('Cancelled.'),
  error: (msg: string) => speak(`Error: ${msg}`),
  success: (msg: string) => speak(msg),
  listening: () => speak('Listening.'),
  processing: () => speak('Processing...'),
};

export default useVoiceCommands;
