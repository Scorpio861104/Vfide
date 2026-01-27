'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Transaction Sound Effects Hook
 * 
 * Provides audio feedback for wallet interactions:
 * - Connect success
 * - Transaction submitted
 * - Transaction confirmed
 * - Transaction failed
 * - Notification received
 */

type SoundType = 'connect' | 'submit' | 'success' | 'error' | 'notification' | 'click';

interface SoundSettings {
  enabled: boolean;
  volume: number; // 0-1
}

const STORAGE_KEY = 'vfide-sound-settings';

// Base64 encoded short sounds (tiny wav files) - kept for potential future use
const _SOUNDS: Record<SoundType, string> = {
  connect: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAB/f39/',
  submit: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAB/gH+A',
  success: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAB/gICA',
  error: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAB/YGBg',
  notification: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAB/cHBw',
  click: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAB/f39/',
};

// Web Audio API context - kept for potential file-based audio
const _audioContext: AudioContext | null = null;

// Pre-generated tones using Web Audio API
const TONE_FREQUENCIES: Record<SoundType, number[]> = {
  connect: [523, 659, 784],      // C5, E5, G5 - pleasant chord
  submit: [440, 554],            // A4, C#5 - ascending
  success: [523, 659, 784, 1047], // C major arpeggio up
  error: [311, 277],             // Eb4, C#4 - descending minor
  notification: [880, 1047],     // A5, C6 - notification ping
  click: [800],                  // Single click
};

const TONE_DURATIONS: Record<SoundType, number> = {
  connect: 150,
  submit: 100,
  success: 200,
  error: 200,
  notification: 100,
  click: 30,
};

export function useTransactionSounds() {
  const [settings, setSettings] = useState<SoundSettings>({
    enabled: true,
    volume: 0.5,
  });
  
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load settings from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Initialize audio context on first user interaction
  const initAudioContext = useCallback(() => {
    if (typeof window === 'undefined' || !(window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    
    // Resume if suspended (browser policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    return audioContextRef.current;
  }, []);

  // Play a tone sequence
  const playTone = useCallback((type: SoundType) => {
    if (!settings.enabled) return;

    try {
      const ctx = initAudioContext();
      if (!ctx) return;
      const frequencies = TONE_FREQUENCIES[type];
      const duration = TONE_DURATIONS[type] / 1000; // Convert to seconds
      const noteLength = duration / frequencies.length;

      frequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = type === 'error' ? 'sawtooth' : 'sine';
        
        const startTime = ctx.currentTime + (index * noteLength);
        const endTime = startTime + noteLength;
        
        // Envelope
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(settings.volume * 0.3, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);
        
        oscillator.start(startTime);
        oscillator.stop(endTime);
      });
    } catch (err) {
      console.warn('Audio playback failed:', err);
    }
  }, [settings.enabled, settings.volume, initAudioContext]);

  // Play sound effect
  const play = useCallback((type: SoundType) => {
    playTone(type);
  }, [playTone]);

  // Convenience methods
  const playConnect = useCallback(() => play('connect'), [play]);
  const playSubmit = useCallback(() => play('submit'), [play]);
  const playSuccess = useCallback(() => play('success'), [play]);
  const playError = useCallback(() => play('error'), [play]);
  const playNotification = useCallback(() => play('notification'), [play]);
  const playClick = useCallback(() => play('click'), [play]);

  // Update settings
  const setEnabled = useCallback((enabled: boolean) => {
    setSettings(prev => {
      const updated = { ...prev, enabled };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setSettings(prev => {
      const updated = { ...prev, volume: clampedVolume };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Test sound
  const test = useCallback(() => {
    playConnect();
    setTimeout(() => playSuccess(), 300);
  }, [playConnect, playSuccess]);

  return {
    settings,
    setEnabled,
    setVolume,
    play,
    playConnect,
    playSubmit,
    playSuccess,
    playError,
    playNotification,
    playClick,
    test,
  };
}
