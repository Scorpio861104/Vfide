'use client';

/**
 * useEscapeKey — close modal/dialog on Escape key press.
 *
 * Background:
 *   Keyboard users (including users of assistive tech) universally expect Esc
 *   to dismiss a modal. Without it, the only way out of a focus-trapped dialog
 *   is mouse — broken for screen reader / keyboard-only users.
 *
 *   Apple's HIG, GNOME HIG, Material Design, and the WAI-ARIA Authoring
 *   Practices for the Dialog Pattern all specify Esc-to-dismiss as a hard
 *   requirement.
 *
 * Usage:
 *   useEscapeKey(onClose, isOpen);
 *
 * The `enabled` flag is important — registering the listener globally would
 * intercept Esc presses meant for other modals layered above this one.
 * Always pass the modal's open/visible state.
 */
import { useEffect } from 'react';

export function useEscapeKey(handler: () => void, enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handler();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handler, enabled]);
}
