/**
 * Toast utility for use outside of React components
 * 
 * For use inside components, prefer useToast from '@/components/ui/toast'
 */

type ToastType = 'success' | 'error' | 'info';

// Simple toast interface for non-component usage
// Uses a global event emitter pattern
const toastEventTarget = typeof window !== 'undefined' 
  ? new EventTarget() 
  : null;

interface ToastEvent extends CustomEvent {
  detail: {
    message: string;
    type: ToastType;
  };
}

export const toast = {
  success: (message: string) => {
    if (toastEventTarget) {
      toastEventTarget.dispatchEvent(
        new CustomEvent('toast', { detail: { message, type: 'success' } })
      );
    }
    console.log('✅', message);
  },
  
  error: (message: string) => {
    if (toastEventTarget) {
      toastEventTarget.dispatchEvent(
        new CustomEvent('toast', { detail: { message, type: 'error' } })
      );
    }
    console.error('❌', message);
  },
  
  info: (message: string) => {
    if (toastEventTarget) {
      toastEventTarget.dispatchEvent(
        new CustomEvent('toast', { detail: { message, type: 'info' } })
      );
    }
    console.info('ℹ️', message);
  },
};

// Subscribe to toast events (used by ToastProvider)
export function subscribeToToasts(
  callback: (message: string, type: ToastType) => void
): () => void {
  if (!toastEventTarget) return () => {};
  
  const handler = (event: Event) => {
    const { message, type } = (event as ToastEvent).detail;
    callback(message, type);
  };
  
  toastEventTarget.addEventListener('toast', handler);
  return () => toastEventTarget.removeEventListener('toast', handler);
}

export default toast;
