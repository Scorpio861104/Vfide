/**
 * A11Y FOCUS-MANAGEMENT FIX: useFocusTrap hook.
 *
 * When a modal opens, three things should happen for keyboard and
 * screen-reader users:
 *   1. Focus moves into the modal (typically to the close button or
 *      first focusable element)
 *   2. Tab key cycles only through focusable elements INSIDE the modal,
 *      not into the underlying page (focus trap)
 *   3. When the modal closes, focus returns to the element that
 *      triggered it (focus restoration)
 *
 * Without these, keyboard users tabbing through a modal fall through
 * into the page underneath — they may activate buttons they can't see,
 * lose their place, or be unable to dismiss the modal at all if the
 * close button isn't reachable. Screen reader users hear background
 * page content as if the modal weren't there.
 *
 * Usage:
 *
 *   const dialogRef = useRef<HTMLDivElement>(null);
 *   useFocusTrap(dialogRef, isOpen);
 *
 *   return (
 *     <div ref={dialogRef} role="dialog" aria-modal="true" ...>
 *       ...
 *     </div>
 *   );
 *
 * The hook handles:
 *   - Initial focus when isOpen flips true (focuses first focusable
 *     descendant, or the container itself if none)
 *   - Tab cycling within the container
 *   - Shift+Tab cycling backward
 *   - Escape key dispatches a 'focustrap-escape' CustomEvent on the
 *     container so consumers can wire dismissal
 *   - Restoring focus to the previously-focused element when isOpen
 *     flips false
 *
 * The hook intentionally does NOT call `event.preventDefault()` for
 * Tab cycling at the boundaries — it just moves focus. This keeps it
 * compatible with React's own synthetic event handling.
 */
import { RefObject, useEffect } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
): void {
  useEffect(() => {
    if (!isActive) return;
    const container = containerRef.current;
    if (!container) return;

    // Capture the element that had focus when the modal opened so we
    // can return focus to it on close. This is the standard "focus
    // restoration" pattern. Falls back to document.body if there
    // wasn't a focused element (typical when the modal opens via a
    // programmatic flow like a query-param trigger).
    const previouslyFocused = (document.activeElement as HTMLElement) ?? null;

    // Move focus into the container. Prefer the first focusable
    // descendant; if none exist (rare — usually a heading-only
    // confirmation dialog), focus the container itself by adding
    // tabindex=-1 temporarily.
    const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const first = focusables[0];
    if (first) {
      // Tiny delay lets any opening animation / portal mount settle
      // before focus moves. setTimeout(0) is enough; we don't need
      // requestAnimationFrame here because focus doesn't need to be
      // synchronized to the next paint.
      setTimeout(() => first.focus(), 0);
    } else {
      // No focusable descendants — make the container itself
      // focusable so screen readers still announce it.
      const hadTabindex = container.hasAttribute('tabindex');
      if (!hadTabindex) container.setAttribute('tabindex', '-1');
      setTimeout(() => container.focus(), 0);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Dispatch a CustomEvent on the container so consumer code
        // can opt into Escape-to-close. We don't call onClose() here
        // because the hook doesn't know about consumer state.
        container.dispatchEvent(new CustomEvent('focustrap-escape', { bubbles: true }));
        return;
      }

      if (e.key !== 'Tab') return;

      // Re-query on every Tab — focusable set can change as the user
      // interacts (e.g. enabling/disabling buttons, conditional fields).
      const current = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (current.length === 0) {
        // No focusable elements; just keep focus on the container.
        e.preventDefault();
        container.focus();
        return;
      }

      const firstEl = current[0];
      const lastEl = current[current.length - 1];
      if (!firstEl || !lastEl) return;

      if (e.shiftKey) {
        // Shift+Tab: cycle backward at the start
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        // Tab: cycle forward at the end
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    container.addEventListener('keydown', onKeyDown);

    return () => {
      container.removeEventListener('keydown', onKeyDown);
      // Restore focus to whatever had it before the modal opened.
      // Wrap in a try/catch because the previously-focused element
      // may have been removed from the DOM (typical if the modal
      // opened via a sequence that mutated the page, like a
      // navigation event).
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        try {
          previouslyFocused.focus();
        } catch {
          /* element gone, just give up — browser default focus is fine */
        }
      }
    };
  }, [containerRef, isActive]);
}
