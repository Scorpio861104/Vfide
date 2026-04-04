'use client';

import { useCallback, useRef, useState } from 'react';
import { getUserLocale } from '@/lib/locale';

const VOICE_LANG_MAP: Record<string, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  sw: 'sw-KE',
  pt: 'pt-BR',
  es: 'es-MX',
  ha: 'ha-NG',
  ar: 'ar-SA',
  hi: 'hi-IN',
};

function getVoiceLang(): string {
  const locale = getUserLocale();
  const lang = locale.split('-')[0] ?? 'en';
  return VOICE_LANG_MAP[lang] || locale;
}

export function useVoicePOS() {
  const [enabled, setEnabled] = useState(false);
  const speakingRef = useRef(false);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const speak = useCallback((text: string) => {
    if (!enabled || !isSupported || speakingRef.current) return;

    speakingRef.current = true;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getVoiceLang();
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onend = () => { speakingRef.current = false; };
    utterance.onerror = () => { speakingRef.current = false; };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [enabled, isSupported]);

  const toggle = useCallback(() => {
    setEnabled((current) => {
      const next = !current;
      if (isSupported) {
        if (!next) {
          window.speechSynthesis.cancel();
        } else {
          const test = new SpeechSynthesisUtterance('Voice mode enabled');
          test.lang = getVoiceLang();
          test.rate = 0.9;
          window.speechSynthesis.speak(test);
        }
      }
      return next;
    });
  }, [isSupported]);

  const announceCartAdd = useCallback((productName: string, qty: number, total: number) => {
    speak(`Added ${qty} ${productName}. Cart total: ${total.toFixed(2)}`);
  }, [speak]);

  const announceCartRemove = useCallback((productName: string) => {
    speak(`Removed ${productName} from cart`);
  }, [speak]);

  const announceTotal = useCallback((total: number) => {
    speak(`Total: ${total.toFixed(2)}`);
  }, [speak]);

  const announceQRReady = useCallback((total: number) => {
    speak(`QR code ready. Show to customer. Amount: ${total.toFixed(2)}`);
  }, [speak]);

  const announcePaymentReceived = useCallback((amount: number) => {
    speak(`Payment received. ${amount.toFixed(2)}. Thank you.`);
  }, [speak]);

  const announceError = useCallback((message: string) => {
    speak(`Error: ${message}`);
  }, [speak]);

  return {
    speak,
    isSupported,
    enabled,
    toggle,
    announceCartAdd,
    announceCartRemove,
    announceTotal,
    announceQRReady,
    announcePaymentReceived,
    announceError,
  };
}
