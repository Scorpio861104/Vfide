/**
 * useKeyboardShortcuts Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle single key shortcuts', () => {
    const callback = jest.fn();
    
    renderHook(() => 
      useKeyboardShortcuts({
        shortcuts: [
          { key: 'k', callback },
        ],
      })
    );
    
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'k' });
      document.dispatchEvent(event);
    });
    
    expect(callback).toHaveBeenCalled();
  });

  it('should handle modifier keys', () => {
    const callback = jest.fn();
    
    renderHook(() => 
      useKeyboardShortcuts({
        shortcuts: [
          { key: 'k', ctrl: true, callback },
        ],
      })
    );
    
    act(() => {
      const event = new KeyboardEvent('keydown', { 
        key: 'k',
        ctrlKey: true,
      });
      document.dispatchEvent(event);
    });
    
    expect(callback).toHaveBeenCalled();
  });

  it('should not trigger without correct modifiers', () => {
    const callback = jest.fn();
    
    renderHook(() => 
      useKeyboardShortcuts({
        shortcuts: [
          { key: 'k', ctrl: true, callback },
        ],
      })
    );
    
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'k' });
      document.dispatchEvent(event);
    });
    
    expect(callback).not.toHaveBeenCalled();
  });

  it('should handle multiple shortcuts', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    
    renderHook(() => 
      useKeyboardShortcuts({
        shortcuts: [
          { key: 'k', callback: callback1 },
          { key: 's', callback: callback2 },
        ],
      })
    );
    
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
    });
    
    expect(callback1).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
  });

  it('should prevent default behavior', () => {
    const callback = jest.fn();
    
    renderHook(() => 
      useKeyboardShortcuts({
        shortcuts: [
          { key: 'k', callback, preventDefault: true },
        ],
      })
    );
    
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'k' });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      document.dispatchEvent(event);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  it('should handle disabled shortcuts', () => {
    const callback = jest.fn();
    
    renderHook(() => 
      useKeyboardShortcuts({
        shortcuts: [
          { key: 'k', callback },
        ],
        enabled: false,
      })
    );
    
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
    });
    
    expect(callback).not.toHaveBeenCalled();
  });

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    
    const { unmount } = renderHook(() => 
      useKeyboardShortcuts({
        shortcuts: [
          { key: 'k', callback: jest.fn() },
        ],
      })
    );
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalled();
  });

  it('should handle shift modifier', () => {
    const callback = jest.fn();
    
    renderHook(() => 
      useKeyboardShortcuts({
        shortcuts: [
          { key: 'K', shift: true, callback },
        ],
      })
    );
    
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { 
        key: 'K',
        shiftKey: true,
      }));
    });
    
    expect(callback).toHaveBeenCalled();
  });

  it('should handle alt modifier', () => {
    const callback = jest.fn();
    
    renderHook(() => 
      useKeyboardShortcuts({
        shortcuts: [
          { key: 'k', alt: true, callback },
        ],
      })
    );
    
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { 
        key: 'k',
        altKey: true,
      }));
    });
    
    expect(callback).toHaveBeenCalled();
  });

  it('should handle meta (cmd) modifier', () => {
    const callback = jest.fn();
    
    renderHook(() => 
      useKeyboardShortcuts({
        shortcuts: [
          { key: 'k', meta: true, callback },
        ],
      })
    );
    
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { 
        key: 'k',
        metaKey: true,
      }));
    });
    
    expect(callback).toHaveBeenCalled();
  });

  it('should handle multiple modifiers', () => {
    const callback = jest.fn();
    
    renderHook(() => 
      useKeyboardShortcuts({
        shortcuts: [
          { key: 'k', ctrl: true, shift: true, callback },
        ],
      })
    );
    
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { 
        key: 'k',
        ctrlKey: true,
        shiftKey: true,
      }));
    });
    
    expect(callback).toHaveBeenCalled();
  });

  it('should ignore shortcuts in input fields', () => {
    const callback = jest.fn();
    
    renderHook(() => 
      useKeyboardShortcuts({
        shortcuts: [
          { key: 'k', callback },
        ],
        ignoreInputFields: true,
      })
    );
    
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    
    act(() => {
      const event = new KeyboardEvent('keydown', { 
        key: 'k',
        bubbles: true,
      });
      input.dispatchEvent(event);
    });
    
    expect(callback).not.toHaveBeenCalled();
    
    document.body.removeChild(input);
  });
});
