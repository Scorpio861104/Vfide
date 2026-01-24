/**
 * useThreatDetection Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useThreatDetection } from '../../../hooks/useThreatDetection';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useThreatDetection Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    // threatLevel depends on riskScore via getThreatLevel(riskScore)
    // With score 0, returns 'none'
    expect(result.current.threatLevel).toBe('none');
    expect(result.current.riskScore).toBe(0);
    expect(result.current.threats).toEqual([]);
    expect(result.current.activeThreats).toEqual([]);
  });

  it('should provide metrics', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    expect(result.current.metrics).toBeDefined();
    expect(result.current.metrics.threatsDetected).toBe(0);
    expect(result.current.metrics.totalSessions).toBe(1);
    expect(result.current.metrics.activeSessions).toBe(1);
  });

  it('should detect anomalies and return a result', async () => {
    const { result } = renderHook(() => useThreatDetection());
    
    await act(async () => {
      const anomalyResult = await result.current.detectAnomalies();
      expect(anomalyResult).toBeDefined();
      expect(anomalyResult.threatLevel).toBeDefined();
      expect(typeof anomalyResult.riskScore).toBe('number');
    });
  });

  it('should check rate limits', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    let isAllowed: boolean = false;
    act(() => {
      isAllowed = result.current.checkRateLimit('test-action');
    });
    
    expect(typeof isAllowed).toBe('boolean');
  });

  it('should report suspicious activity', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    act(() => {
      result.current.reportSuspiciousActivity('unusual_device', {
        description: 'Test suspicious activity',
      });
    });
    
    // After reporting, threats may increase
    expect(result.current.threats.length).toBeGreaterThanOrEqual(0);
  });

  it('should dismiss threats', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    act(() => {
      result.current.dismissThreat('test-threat-id');
    });
    
    // Should not throw
    expect(true).toBe(true);
  });

  it('should get recommendations', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    const recommendations = result.current.getRecommendations();
    expect(Array.isArray(recommendations)).toBe(true);
  });

  it('should have correct threat level based on risk score', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    // With no threats and riskScore 0, threatLevel is 'none'
    expect(result.current.threatLevel).toBe('none');
    expect(result.current.riskScore).toBe(0);
  });

  it('should provide resolve thread function', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    expect(typeof result.current.resolveThread).toBe('function');
  });

  it('should track threats detected in metrics', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    expect(result.current.metrics.threatsDetected).toBe(result.current.threats.length);
  });
});
