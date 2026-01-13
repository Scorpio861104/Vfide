/**
 * SDK Tests
 * 
 * Tests for VFIDE SDK - embeddable payment widgets
 */

import {
  vfide,
  VFIDEConfig,
  PaymentRequest,
  PaymentResult,
  SubscriptionConfig,
  SubscriptionResult,
  DonationConfig,
  WidgetOptions,
} from '../sdk';

// Mock DOM elements
const mockButton = {
  className: '',
  innerHTML: '',
  style: {},
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const mockContainer = {
  appendChild: jest.fn(),
  removeChild: jest.fn(),
  querySelector: jest.fn(),
};

const mockDocument = {
  createElement: jest.fn(() => mockButton),
  getElementById: jest.fn(() => mockContainer),
  querySelector: jest.fn(() => mockContainer),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
  },
};

// Set up mocks
beforeEach(() => {
  // @ts-expect-error - mock document for tests
  if (typeof global.document === 'undefined') {
    global.document = mockDocument as unknown as Document;
  }
  jest.clearAllMocks();
});

describe('VFIDEConfig interface', () => {
  it('should define required config properties', () => {
    const config: VFIDEConfig = {
      environment: 'testnet',
      theme: 'dark',
    };
    
    expect(config.environment).toBe('testnet');
    expect(config.theme).toBe('dark');
  });

  it('should support mainnet environment', () => {
    const config: VFIDEConfig = {
      environment: 'mainnet',
      theme: 'light',
    };
    
    expect(config.environment).toBe('mainnet');
  });

  it('should support auto theme', () => {
    const config: VFIDEConfig = {
      environment: 'testnet',
      theme: 'auto',
    };
    
    expect(config.theme).toBe('auto');
  });
});

describe('PaymentRequest interface', () => {
  it('should define payment request structure', () => {
    const request: PaymentRequest = {
      recipient: '0x1234567890123456789012345678901234567890',
      amount: '100',
      token: 'USDC',
      description: 'Test payment',
    };
    
    expect(request.recipient).toBe('0x1234567890123456789012345678901234567890');
    expect(request.amount).toBe('100');
    expect(request.token).toBe('USDC');
    expect(request.description).toBe('Test payment');
  });

  it('should allow optional fields', () => {
    const request: PaymentRequest = {
      recipient: '0x1234567890123456789012345678901234567890',
      amount: '50',
      token: 'ETH',
    };
    
    expect(request.description).toBeUndefined();
  });
});

describe('PaymentResult interface', () => {
  it('should define successful payment result', () => {
    const result: PaymentResult = {
      success: true,
      transactionHash: '0xabc123',
      amount: '100',
      token: 'USDC',
    };
    
    expect(result.success).toBe(true);
    expect(result.transactionHash).toBe('0xabc123');
  });

  it('should define failed payment result', () => {
    const result: PaymentResult = {
      success: false,
      error: 'User rejected transaction',
    };
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('User rejected transaction');
  });
});

describe('SubscriptionConfig interface', () => {
  it('should define subscription config', () => {
    const config: SubscriptionConfig = {
      recipient: '0x1234567890123456789012345678901234567890',
      amount: '10',
      token: 'USDC',
      interval: 'monthly',
    };
    
    expect(config.interval).toBe('monthly');
    expect(config.amount).toBe('10');
  });

  it('should support different intervals', () => {
    const intervals: SubscriptionConfig['interval'][] = ['weekly', 'biweekly', 'monthly', 'yearly'];
    
    intervals.forEach(interval => {
      const config: SubscriptionConfig = {
        recipient: '0x1234567890123456789012345678901234567890',
        amount: '10',
        token: 'USDC',
        interval,
      };
      expect(config.interval).toBe(interval);
    });
  });
});

describe('DonationConfig interface', () => {
  it('should define donation config with presets', () => {
    const config: DonationConfig = {
      recipient: '0x1234567890123456789012345678901234567890',
      token: 'ETH',
      presets: [1, 5, 10, 25],
      allowCustom: true,
      message: 'Support our project',
    };
    
    expect(config.presets).toEqual([1, 5, 10, 25]);
    expect(config.allowCustom).toBe(true);
  });

  it('should allow donations without presets', () => {
    const config: DonationConfig = {
      recipient: '0x1234567890123456789012345678901234567890',
      token: 'USDC',
    };
    
    expect(config.presets).toBeUndefined();
  });
});

describe('WidgetOptions interface', () => {
  it('should define widget placement options', () => {
    const options: WidgetOptions = {
      container: '#payment-widget',
      label: 'Pay Now',
      className: 'custom-button',
    };
    
    expect(options.container).toBe('#payment-widget');
    expect(options.label).toBe('Pay Now');
    expect(options.className).toBe('custom-button');
  });
});

describe('VFIDE SDK singleton', () => {
  it('should export vfide singleton', () => {
    expect(vfide).toBeDefined();
  });

  it('should have init method', () => {
    expect(typeof vfide.init).toBe('function');
  });

  it('should have on method for events', () => {
    expect(typeof vfide.on).toBe('function');
  });

  it('should have createPaymentButton method', () => {
    expect(typeof vfide.createPaymentButton).toBe('function');
  });

  it('should have createDonationWidget method', () => {
    expect(typeof vfide.createDonationWidget).toBe('function');
  });

  it('should have createSubscriptionWidget method', () => {
    expect(typeof vfide.createSubscriptionWidget).toBe('function');
  });
});

describe('SDK event system', () => {
  it('should subscribe to events', () => {
    const callback = jest.fn();
    const unsubscribe = vfide.on('widget:loaded', callback);
    
    expect(typeof unsubscribe).toBe('function');
  });

  it('should unsubscribe from events', () => {
    const callback = jest.fn();
    const unsubscribe = vfide.on('payment:completed', callback);
    
    unsubscribe();
    // No error should be thrown
  });

  it('should support all event types', () => {
    const eventTypes = [
      'payment:started',
      'payment:completed',
      'payment:failed',
      'payment:cancelled',
      'subscription:created',
      'subscription:cancelled',
      'subscription:renewed',
      'widget:loaded',
      'widget:error',
    ] as const;

    eventTypes.forEach(eventType => {
      const callback = jest.fn();
      const unsubscribe = vfide.on(eventType, callback);
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });
});

describe('SDK initialization', () => {
  it('should initialize with config', () => {
    vfide.init({
      environment: 'testnet',
      theme: 'dark',
    });
    
    // Should not throw
    expect(true).toBe(true);
  });

  it('should work with minimal config', () => {
    vfide.init({
      environment: 'mainnet',
    });
    
    expect(true).toBe(true);
  });
});

describe('SDK utilities', () => {
  describe('address validation', () => {
    it('validates ETH addresses', () => {
      const isValid = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);
      
      expect(isValid('0x1234567890123456789012345678901234567890')).toBe(true);
      expect(isValid('0x123')).toBe(false);
      expect(isValid('invalid')).toBe(false);
      expect(isValid('')).toBe(false);
    });
  });

  describe('amount formatting', () => {
    it('formats amounts with decimals', () => {
      const format = (amount: string, decimals: number = 2) => {
        const num = parseFloat(amount);
        return num.toFixed(decimals);
      };
      
      expect(format('100')).toBe('100.00');
      expect(format('100.5')).toBe('100.50');
      expect(format('100.123', 3)).toBe('100.123');
    });

    it('handles large amounts', () => {
      const formatLarge = (amount: string) => {
        const num = parseFloat(amount);
        if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
        return num.toString();
      };
      
      expect(formatLarge('1000000')).toBe('1.00M');
      expect(formatLarge('50000')).toBe('50.00K');
      expect(formatLarge('999')).toBe('999');
    });
  });

  describe('token helpers', () => {
    it('identifies stablecoins', () => {
      const stablecoins = ['USDC', 'USDT', 'DAI', 'FRAX', 'LUSD'];
      const isStablecoin = (token: string) => stablecoins.includes(token.toUpperCase());
      
      expect(isStablecoin('USDC')).toBe(true);
      expect(isStablecoin('usdt')).toBe(true);
      expect(isStablecoin('ETH')).toBe(false);
      expect(isStablecoin('VFIDE')).toBe(false);
    });

    it('calculates subscription annual cost', () => {
      const calculateAnnualCost = (amount: number, interval: string) => {
        const multipliers: Record<string, number> = {
          weekly: 52,
          biweekly: 26,
          monthly: 12,
          yearly: 1,
        };
        return amount * (multipliers[interval] || 1);
      };
      
      expect(calculateAnnualCost(10, 'monthly')).toBe(120);
      expect(calculateAnnualCost(10, 'weekly')).toBe(520);
      expect(calculateAnnualCost(100, 'yearly')).toBe(100);
    });
  });
});
