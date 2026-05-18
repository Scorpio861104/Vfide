'use client';

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      for (const shortcut of shortcuts) {
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
        const matchesMeta = shortcut.meta ? event.metaKey : !event.metaKey;
        const matchesShift = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const matchesAlt = shortcut.alt ? event.altKey : !event.altKey;

        // On Mac, Cmd is used instead of Ctrl
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

        if (matchesKey) {
          // Handle Cmd/Ctrl shortcuts
          if (shortcut.ctrl || shortcut.meta) {
            if (ctrlOrCmd && matchesShift && matchesAlt) {
              event.preventDefault();
              shortcut.handler();
              break;
            }
          } else if (matchesCtrl && matchesMeta && matchesShift && matchesAlt) {
            event.preventDefault();
            shortcut.handler();
            break;
          }
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Common keyboard shortcuts
export const SHORTCUTS = {
  SEARCH: { key: 'k', ctrl: true, description: 'Open search' },
  CLOSE: { key: 'Escape', description: 'Close modal/dialog' },
  HELP: { key: '/', ctrl: true, description: 'Show shortcuts' },
  NEW_MESSAGE: { key: 'n', ctrl: true, description: 'New message' },
  NEXT_CONVERSATION: { key: 'ArrowDown', alt: true, description: 'Next conversation' },
  PREV_CONVERSATION: { key: 'ArrowUp', alt: true, description: 'Previous conversation' },
  SEND_MESSAGE: { key: 'Enter', ctrl: true, description: 'Send message' },
};
