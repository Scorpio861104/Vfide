/**
 * useThreatDetection Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useThreatDetection } from '../../../hooks/useThreatDetection';

describe('useThreatDetection Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize threat detection', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    expect(result.current).toBeDefined();
    expect(result.current.threats).toEqual([]);
  });

  it('should detect suspicious addresses', async () => {
    const { result } = renderHook(() => useThreatDetection());
    
    act(() => {
      result.current.checkAddress('0x0000000000000000000000000000000000000000');
    });
    
    await waitFor(() => {
      expect(result.current.threats.length).toBeGreaterThan(0);
    });
  });

  it('should validate transaction safety', async () => {
    const { result } = renderHook(() => useThreatDetection());
    
    const tx = {
      to: '0x1234567890123456789012345678901234567890',
      value: '1000000000000000000',
      data: '0x',
    };
    
    act(() => {
      result.current.validateTransaction(tx);
    });
    
    await waitFor(() => {
      expect(result.current.validationResult).toBeDefined();
    });
  });

  it('should detect phishing attempts', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    const suspiciousUrl = 'http://metamask-login.phishing.com';
    
    act(() => {
      result.current.checkUrl(suspiciousUrl);
    });
    
    expect(result.current.threats).toHaveLength(1);
    expect(result.current.threats[0].type).toBe('phishing');
  });

  it('should warn about large transfers', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    act(() => {
      result.current.checkAmount('1000000000000000000000'); // 1000 ETH
    });
    
    expect(result.current.warnings).toContain('large_amount');
  });

  it('should detect reentrancy risks', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    const contractCode = '0x...'; // Simplified
    
    act(() => {
      result.current.analyzeContract(contractCode);
    });
    
    expect(result.current.vulnerabilities).toBeDefined();
  });

  it('should track threat history', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    act(() => {
      result.current.checkAddress('0x0000000000000000000000000000000000000000');
      result.current.checkAddress('0x1111111111111111111111111111111111111111');
    });
    
    expect(result.current.threatHistory).toHaveLength(2);
  });

  it('should calculate risk score', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    act(() => {
      result.current.checkAddress('0x0000000000000000000000000000000000000000');
    });
    
    expect(result.current.riskScore).toBeGreaterThan(0);
    expect(result.current.riskScore).toBeLessThanOrEqual(100);
  });

  it('should provide threat recommendations', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    act(() => {
      result.current.checkAddress('0x0000000000000000000000000000000000000000');
    });
    
    expect(result.current.recommendations).toBeDefined();
    expect(Array.isArray(result.current.recommendations)).toBe(true);
  });

  it('should detect token approval risks', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    const approval = {
      spender: '0x1234567890123456789012345678901234567890',
      amount: 'unlimited',
    };
    
    act(() => {
      result.current.checkApproval(approval);
    });
    
    expect(result.current.warnings).toContain('unlimited_approval');
  });

  it('should verify contract source', async () => {
    const { result } = renderHook(() => useThreatDetection());
    
    act(() => {
      result.current.verifyContract('0x1234567890123456789012345678901234567890');
    });
    
    await waitFor(() => {
      expect(result.current.contractStatus).toBeDefined();
    });
  });

  it('should detect frontrunning attempts', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    act(() => {
      result.current.detectFrontrunning({
        gasPrice: '100000000000',
        mempool: ['tx1', 'tx2'],
      });
    });
    
    expect(result.current.frontrunningRisk).toBeDefined();
  });

  it('should check blacklisted addresses', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    act(() => {
      result.current.checkBlacklist('0x0000000000000000000000000000000000000000');
    });
    
    expect(result.current.isBlacklisted).toBeDefined();
  });

  it('should analyze transaction patterns', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    const transactions = [
      { value: '1000000000000000000', timestamp: Date.now() - 1000 },
      { value: '2000000000000000000', timestamp: Date.now() - 2000 },
      { value: '3000000000000000000', timestamp: Date.now() - 3000 },
    ];
    
    act(() => {
      result.current.analyzePattern(transactions);
    });
    
    expect(result.current.patternAnalysis).toBeDefined();
  });

  it('should provide real-time threat monitoring', () => {
    const { result } = renderHook(() => 
      useThreatDetection({ realTimeMonitoring: true })
    );
    
    expect(result.current.isMonitoring).toBe(true);
  });

  it('should generate threat reports', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    act(() => {
      result.current.checkAddress('0x0000000000000000000000000000000000000000');
    });
    
    const report = result.current.generateReport();
    expect(report).toBeDefined();
    expect(report.threats).toBeDefined();
  });

  it('should clear threat alerts', () => {
    const { result } = renderHook(() => useThreatDetection());
    
    act(() => {
      result.current.checkAddress('0x0000000000000000000000000000000000000000');
      result.current.clearThreats();
    });
    
    expect(result.current.threats).toHaveLength(0);
  });

  it('should handle API failures gracefully', async () => {
    const { result } = renderHook(() => useThreatDetection());
    
    act(() => {
      result.current.checkAddress('invalid-address');
    });
    
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });

  it('should support custom threat rules', () => {
    const customRules = [
      { pattern: /0x0+/, severity: 'high', message: 'Suspicious address' },
    ];
    
    const { result } = renderHook(() => 
      useThreatDetection({ customRules })
    );
    
    act(() => {
      result.current.checkAddress('0x0000000000000000000000000000000000000000');
    });
    
    expect(result.current.threats.length).toBeGreaterThan(0);
  });

  it('should rate limit threat checks', () => {
    const { result } = renderHook(() => 
      useThreatDetection({ rateLimit: 10 })
    );
    
    for (let i = 0; i < 20; i++) {
      act(() => {
        result.current.checkAddress(`0x${i.toString().repeat(40)}`);
      });
    }
    
    expect(result.current.rateLimitExceeded).toBe(true);
  });
});
