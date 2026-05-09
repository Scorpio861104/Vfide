'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command, X } from 'lucide-react';
import { useKeyboardShortcuts, SHORTCUTS, KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
// A11Y FOLLOW-UP FIX: focus trap so keyboard users can't tab out of the
// open shortcuts panel into the page underneath.
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';

interface ShortcutsPanelProps {
  customShortcuts?: KeyboardShortcut[];
}

export function KeyboardShortcutsPanel({ customShortcuts = [] }: ShortcutsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Wire focus trap to the panel ref. The hook handles initial focus,
  // Tab cycling, and focus restoration on close.
  useFocusTrap(dialogRef, isOpen);

  // A11Y FOLLOW-UP FIX: also wire Escape-to-close via the focustrap-escape
  // event the hook dispatches. This is in addition to the existing
  // SHORTCUTS.CLOSE keyboard handler, so the panel responds correctly
  // whether the user presses Esc inside or outside the modal context.
  useEffect(() => {
    const handler = () => setIsOpen(false);
    const node = dialogRef.current;
    if (!node) return;
    node.addEventListener('focustrap-escape', handler);
    return () => node.removeEventListener('focustrap-escape', handler);
  }, [isOpen]);

  const defaultShortcuts = [
    { ...SHORTCUTS.SEARCH, handler: () => {} },
    { ...SHORTCUTS.CLOSE, handler: () => {} },
    { ...SHORTCUTS.HELP, handler: () => setIsOpen(!isOpen) },
    { ...SHORTCUTS.NEW_MESSAGE, handler: () => {} },
    { ...SHORTCUTS.NEXT_CONVERSATION, handler: () => {} },
    { ...SHORTCUTS.PREV_CONVERSATION, handler: () => {} },
    { ...SHORTCUTS.SEND_MESSAGE, handler: () => {} },
  ];

  const allShortcuts = [...defaultShortcuts, ...customShortcuts];

  useKeyboardShortcuts([
    { ...SHORTCUTS.HELP, handler: () => setIsOpen(!isOpen) },
    { ...SHORTCUTS.CLOSE, handler: () => setIsOpen(false) },
  ]);

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const keys = [];
    if (shortcut.ctrl || shortcut.meta) {
      const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      keys.push(isMac ? '⌘' : 'Ctrl');
    }
    if (shortcut.alt) keys.push('Alt');
    if (shortcut.shift) keys.push('Shift');
    keys.push(shortcut.key === 'Escape' ? 'Esc' : shortcut.key.toUpperCase());
    return keys.join(' + ');
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-full shadow-lg transition-colors z-40"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (Cmd+/)"
      >
        <Command className="w-5 h-5 text-cyan-400" />
      </button>

      {/* Shortcuts Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Panel */}
            <motion.div
              ref={dialogRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
              // A11Y FOLLOW-UP FIX: announce as a dialog and link the
              // accessible name to the visible heading via id.
              role="dialog"
              aria-modal="true"
              aria-labelledby="keyboard-shortcuts-title"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                <div>
                  <h2 id="keyboard-shortcuts-title" className="text-xl font-bold text-zinc-100">Keyboard Shortcuts</h2>
                  <p className="text-sm text-zinc-500 mt-1">Navigate faster with keyboard shortcuts</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              {/* Shortcuts List */}
              <div className="p-6 max-h-96 overflow-y-auto">
                <div className="space-y-3">
                  {allShortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 bg-zinc-900 rounded-lg"
                    >
                      <span className="text-sm text-zinc-100">{shortcut.description}</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-zinc-800 text-cyan-400 rounded border border-zinc-700">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-zinc-900 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 text-center">
                  Press <kbd className="px-1 py-0.5 text-xs font-mono bg-zinc-800 text-cyan-400 rounded">Esc</kbd> or{' '}
                  <kbd className="px-1 py-0.5 text-xs font-mono bg-zinc-800 text-cyan-400 rounded">Cmd+/</kbd> to close
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
