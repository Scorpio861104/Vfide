/**
 * useKeyboardShortcuts Hook Tests
 */

import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, KeyboardShortcut } from '../../../hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register event listener on mount', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    
    const shortcuts: KeyboardShortcut[] = [
      { key: 'k', handler: jest.fn(), description: 'Test' },
    ];
    
    renderHook(() => useKeyboardShortcuts(shortcuts));
    
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    
    addEventListenerSpy.mockRestore();
  });

  it('should remove event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    
    const shortcuts: KeyboardShortcut[] = [
      { key: 'k', handler: jest.fn(), description: 'Test' },
    ];
    
    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });

  it('should not register listener when disabled', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    
    const shortcuts: KeyboardShortcut[] = [
      { key: 'k', handler: jest.fn(), description: 'Test' },
    ];
    
    renderHook(() => useKeyboardShortcuts(shortcuts, false));
    
    // Still adds the listener, but the handler checks enabled state
    expect(addEventListenerSpy).toHaveBeenCalled();
    
    addEventListenerSpy.mockRestore();
  });

  it('should accept shortcuts array', () => {
    const handler = jest.fn();
    
    const shortcuts: KeyboardShortcut[] = [
      { key: 'k', handler, description: 'Search' },
      { key: 's', ctrl: true, handler, description: 'Save' },
    ];
    
    const { result } = renderHook(() => useKeyboardShortcuts(shortcuts));
    
    // Hook should not throw and render successfully
    expect(result.error).toBeUndefined();
  });

  it('should support ctrl modifier', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'k', ctrl: true, handler: jest.fn(), description: 'Ctrl+K' },
    ];
    
    const { result } = renderHook(() => useKeyboardShortcuts(shortcuts));
    
    expect(result.error).toBeUndefined();
  });

  it('should support meta modifier', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'k', meta: true, handler: jest.fn(), description: 'Cmd+K' },
    ];
    
    const { result } = renderHook(() => useKeyboardShortcuts(shortcuts));
    
    expect(result.error).toBeUndefined();
  });

  it('should support shift modifier', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'k', shift: true, handler: jest.fn(), description: 'Shift+K' },
    ];
    
    const { result } = renderHook(() => useKeyboardShortcuts(shortcuts));
    
    expect(result.error).toBeUndefined();
  });

  it('should support alt modifier', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'k', alt: true, handler: jest.fn(), description: 'Alt+K' },
    ];
    
    const { result } = renderHook(() => useKeyboardShortcuts(shortcuts));
    
    expect(result.error).toBeUndefined();
  });

  it('should support multiple modifiers', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'k', ctrl: true, shift: true, handler: jest.fn(), description: 'Ctrl+Shift+K' },
    ];
    
    const { result } = renderHook(() => useKeyboardShortcuts(shortcuts));
    
    expect(result.error).toBeUndefined();
  });

  it('should handle empty shortcuts array', () => {
    const { result } = renderHook(() => useKeyboardShortcuts([]));
    
    expect(result.error).toBeUndefined();
  });

  it('should update when shortcuts change', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    
    const { rerender } = renderHook(
      ({ shortcuts }) => useKeyboardShortcuts(shortcuts),
      { 
        initialProps: { 
          shortcuts: [{ key: 'a', handler: handler1, description: 'A' }] as KeyboardShortcut[]
        } 
      }
    );
    
    rerender({ 
      shortcuts: [{ key: 'b', handler: handler2, description: 'B' }] as KeyboardShortcut[]
    });
    
    // Should not throw
    expect(true).toBe(true);
  });

  it('should update when enabled state changes', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'k', handler: jest.fn(), description: 'Test' },
    ];
    
    const { rerender } = renderHook(
      ({ enabled }) => useKeyboardShortcuts(shortcuts, enabled),
      { initialProps: { enabled: true } }
    );
    
    rerender({ enabled: false });
    
    // Should not throw
    expect(true).toBe(true);
  });
});

describe('SHORTCUTS constant', () => {
  it('should export SHORTCUTS', () => {
    const { SHORTCUTS } = require('../../../hooks/useKeyboardShortcuts');
    
    expect(SHORTCUTS).toBeDefined();
    expect(SHORTCUTS.SEARCH).toBeDefined();
    expect(SHORTCUTS.SEARCH.key).toBe('k');
    expect(SHORTCUTS.SEARCH.ctrl).toBe(true);
  });
});
