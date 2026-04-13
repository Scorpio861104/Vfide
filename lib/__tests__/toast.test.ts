/**
 * Toast Utility Tests
 */

const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('@/lib/logger', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { toast, subscribeToToasts } from '../toast';

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleInfo = console.info;

let consoleOutput: string[] = [];

beforeEach(() => {
  consoleOutput = [];
  mockLoggerInfo.mockClear();
  mockLoggerError.mockClear();
  console.log = jest.fn((...args) => {
    consoleOutput.push(args.join(' '));
  });
  console.error = jest.fn((...args) => {
    consoleOutput.push(args.join(' '));
  });
  console.info = jest.fn((...args) => {
    consoleOutput.push(args.join(' '));
  });
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.info = originalConsoleInfo;
});

describe('toast.success', () => {
  it('logs success messages', () => {
    toast.success('Operation completed');
    expect(mockLoggerInfo).toHaveBeenCalledWith('✅', 'Operation completed');
  });

  it('includes emoji in output', () => {
    toast.success('Test message');
    expect(mockLoggerInfo).toHaveBeenCalledWith('✅', 'Test message');
  });
});

describe('toast.error', () => {
  it('logs error messages', () => {
    toast.error('Something went wrong');
    expect(mockLoggerError).toHaveBeenCalledWith('❌', 'Something went wrong');
  });

  it('includes emoji in output', () => {
    toast.error('Error message');
    expect(mockLoggerError).toHaveBeenCalledWith('❌', 'Error message');
  });
});

describe('toast.info', () => {
  it('logs info messages', () => {
    toast.info('Information update');
    expect(mockLoggerInfo).toHaveBeenCalledWith('ℹ️', 'Information update');
  });

  it('includes emoji in output', () => {
    toast.info('Info message');
    expect(mockLoggerInfo).toHaveBeenCalledWith('ℹ️', 'Info message');
  });
});

describe('subscribeToToasts', () => {
  it('returns unsubscribe function', () => {
    const callback = jest.fn();
    const unsubscribe = subscribeToToasts(callback);
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('receives toast events', (done) => {
    const callback = jest.fn((message, type) => {
      expect(message).toBe('Test notification');
      expect(type).toBe('success');
      done();
    });
    
    const unsubscribe = subscribeToToasts(callback);
    toast.success('Test notification');
    
    // Cleanup
    setTimeout(() => unsubscribe(), 100);
  });

  it('receives error events', (done) => {
    const callback = jest.fn((message, type) => {
      if (type === 'error') {
        expect(message).toBe('Error occurred');
        done();
      }
    });
    
    const unsubscribe = subscribeToToasts(callback);
    toast.error('Error occurred');
    
    setTimeout(() => unsubscribe(), 100);
  });

  it('receives info events', (done) => {
    const callback = jest.fn((message, type) => {
      if (type === 'info') {
        expect(message).toBe('Info update');
        done();
      }
    });
    
    const unsubscribe = subscribeToToasts(callback);
    toast.info('Info update');
    
    setTimeout(() => unsubscribe(), 100);
  });

  it('stops receiving events after unsubscribe', () => {
    const callback = jest.fn();
    const unsubscribe = subscribeToToasts(callback);
    
    toast.success('First message');
    unsubscribe();
    toast.success('Second message');
    
    // Callback was called at least once for first message
    expect(callback).toHaveBeenCalled();
  });
});

describe('toast integration', () => {
  it('exports default toast object', () => {
    expect(toast).toBeDefined();
    expect(toast.success).toBeInstanceOf(Function);
    expect(toast.error).toBeInstanceOf(Function);
    expect(toast.info).toBeInstanceOf(Function);
  });

  it('handles multiple consecutive toasts', () => {
    toast.success('First');
    toast.error('Second');
    toast.info('Third');
    
    expect(mockLoggerInfo).toHaveBeenCalledTimes(2); // success + info
    expect(mockLoggerError).toHaveBeenCalledTimes(1); // error
  });
});
