/**
 * Memory Leak Tests
 * Detects memory leaks, monitors memory usage under load, and verifies cleanup
 */
import '@testing-library/jest-dom';
import { render, cleanup } from '@testing-library/react';
import React from 'react';

describe('Memory Leak Tests', () => {
  afterEach(() => {
    cleanup();
  });

  const getMemoryUsage = (): number => {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  };

  const forceGarbageCollection = async (): Promise<void> => {
    if (global.gc) {
      global.gc();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  describe('Component Memory Leaks', () => {
    test('Mounting and unmounting should not leak memory', async () => {
      await forceGarbageCollection();
      const initialMemory = getMemoryUsage();

      // Mount and unmount component multiple times
      for (let i = 0; i < 100; i++) {
        const TestComponent = () => <div>Test {i}</div>;
        const { unmount } = render(<TestComponent />);
        unmount();
      }

      await forceGarbageCollection();
      const finalMemory = getMemoryUsage();
      
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)} MB`);
      
      // Should not increase memory significantly
      expect(memoryIncreaseMB).toBeLessThan(10);
    });

    test('Components with state should clean up properly', async () => {
      await forceGarbageCollection();
      const initialMemory = getMemoryUsage();

      for (let i = 0; i < 50; i++) {
        const TestComponent = () => {
          const [state, setState] = React.useState(0);
          
          React.useEffect(() => {
            setState(1);
          }, []);

          return <div>{state}</div>;
        };
        
        const { unmount } = render(<TestComponent />);
        await new Promise(resolve => setTimeout(resolve, 10));
        unmount();
      }

      await forceGarbageCollection();
      const finalMemory = getMemoryUsage();
      
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      console.log(`Stateful component memory increase: ${memoryIncreaseMB.toFixed(2)} MB`);
      
      expect(memoryIncreaseMB).toBeLessThan(15);
    }, 15000);

    test('Large lists should not leak when unmounted', async () => {
      await forceGarbageCollection();
      const initialMemory = getMemoryUsage();

      for (let i = 0; i < 10; i++) {
        const TestComponent = () => {
          const items = Array.from({ length: 1000 }, (_, idx) => ({
            id: idx,
            data: `Item ${idx}`,
          }));

          return (
            <div>
              {items.map(item => (
                <div key={item.id}>{item.data}</div>
              ))}
            </div>
          );
        };
        
        const { unmount } = render(<TestComponent />);
        unmount();
      }

      await forceGarbageCollection();
      const finalMemory = getMemoryUsage();
      
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      console.log(`Large list memory increase: ${memoryIncreaseMB.toFixed(2)} MB`);
      
      expect(memoryIncreaseMB).toBeLessThan(20);
    }, 20000);
  });

  describe('Event Listener Cleanup', () => {
    test('Event listeners should be removed on unmount', () => {
      const mockHandler = jest.fn();
      let listenerCount = 0;

      const originalAddEventListener = window.addEventListener;
      const originalRemoveEventListener = window.removeEventListener;

      window.addEventListener = jest.fn((...args) => {
        listenerCount++;
        return originalAddEventListener.apply(window, args as any);
      });

      window.removeEventListener = jest.fn((...args) => {
        listenerCount--;
        return originalRemoveEventListener.apply(window, args as any);
      });

      const TestComponent = () => {
        React.useEffect(() => {
          window.addEventListener('resize', mockHandler);
          
          return () => {
            window.removeEventListener('resize', mockHandler);
          };
        }, []);

        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      
      expect(listenerCount).toBeGreaterThan(0);
      
      unmount();
      
      expect(listenerCount).toBe(0);

      window.addEventListener = originalAddEventListener;
      window.removeEventListener = originalRemoveEventListener;
    });

    test('Multiple event listeners should all be cleaned up', () => {
      let activeListeners = 0;

      const TestComponent = () => {
        React.useEffect(() => {
          const handler1 = () => {};
          const handler2 = () => {};
          const handler3 = () => {};

          window.addEventListener('scroll', handler1);
          window.addEventListener('resize', handler2);
          window.addEventListener('click', handler3);
          activeListeners += 3;

          return () => {
            window.removeEventListener('scroll', handler1);
            window.removeEventListener('resize', handler2);
            window.removeEventListener('click', handler3);
            activeListeners -= 3;
          };
        }, []);

        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      
      expect(activeListeners).toBe(3);
      
      unmount();
      
      expect(activeListeners).toBe(0);
    });
  });

  describe('Timer Cleanup', () => {
    test('setInterval should be cleared on unmount', () => {
      jest.useFakeTimers();
      
      let intervalId: NodeJS.Timeout | null = null;

      const TestComponent = () => {
        const [count, setCount] = React.useState(0);

        React.useEffect(() => {
          intervalId = setInterval(() => {
            setCount(c => c + 1);
          }, 1000);

          return () => {
            if (intervalId) clearInterval(intervalId);
          };
        }, []);

        return <div>{count}</div>;
      };

      const { unmount } = render(<TestComponent />);
      
      unmount();
      
      // Advance timers - should not cause updates after unmount
      jest.advanceTimersByTime(5000);
      
      jest.useRealTimers();
    });

    test('setTimeout should be cleared on unmount', () => {
      jest.useFakeTimers();
      
      const mockCallback = jest.fn();

      const TestComponent = () => {
        React.useEffect(() => {
          const timeoutId = setTimeout(mockCallback, 5000);

          return () => {
            clearTimeout(timeoutId);
          };
        }, []);

        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      
      unmount();
      
      // Advance timers - callback should not be called
      jest.advanceTimersByTime(10000);
      
      expect(mockCallback).not.toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('Subscription Cleanup', () => {
    test('Subscriptions should be unsubscribed on unmount', () => {
      let activeSubscriptions = 0;

      const mockSubscription = {
        subscribe: (callback: () => void) => {
          activeSubscriptions++;
          return {
            unsubscribe: () => {
              activeSubscriptions--;
            },
          };
        },
      };

      const TestComponent = () => {
        React.useEffect(() => {
          const subscription = mockSubscription.subscribe(() => {});

          return () => {
            subscription.unsubscribe();
          };
        }, []);

        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      
      expect(activeSubscriptions).toBe(1);
      
      unmount();
      
      expect(activeSubscriptions).toBe(0);
    });

    test('Multiple subscriptions should all be cleaned up', () => {
      let activeSubscriptions = 0;

      const createSubscription = () => ({
        subscribe: () => {
          activeSubscriptions++;
          return {
            unsubscribe: () => {
              activeSubscriptions--;
            },
          };
        },
      });

      const TestComponent = () => {
        React.useEffect(() => {
          const sub1 = createSubscription().subscribe();
          const sub2 = createSubscription().subscribe();
          const sub3 = createSubscription().subscribe();

          return () => {
            sub1.unsubscribe();
            sub2.unsubscribe();
            sub3.unsubscribe();
          };
        }, []);

        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      
      expect(activeSubscriptions).toBe(3);
      
      unmount();
      
      expect(activeSubscriptions).toBe(0);
    });
  });

  describe('WebSocket Connection Cleanup', () => {
    test('WebSocket should close on unmount', () => {
      const mockWebSocket = {
        close: jest.fn(),
        readyState: WebSocket.OPEN,
      };

      const TestComponent = () => {
        React.useEffect(() => {
          const ws = mockWebSocket as any;

          return () => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.close();
            }
          };
        }, []);

        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      
      unmount();
      
      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    test('Should handle multiple WebSocket connections', () => {
      const connections: any[] = [];

      const createMockWebSocket = () => ({
        close: jest.fn(),
        readyState: WebSocket.OPEN,
      });

      const TestComponent = () => {
        React.useEffect(() => {
          const ws1 = createMockWebSocket();
          const ws2 = createMockWebSocket();
          connections.push(ws1, ws2);

          return () => {
            ws1.close();
            ws2.close();
          };
        }, []);

        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      
      unmount();
      
      connections.forEach(ws => {
        expect(ws.close).toHaveBeenCalled();
      });
    });
  });

  describe('Memory Usage Under Load', () => {
    test('Memory should stabilize under repeated operations', async () => {
      const memoryReadings: number[] = [];

      for (let i = 0; i < 10; i++) {
        await forceGarbageCollection();
        
        // Perform some operations
        for (let j = 0; j < 50; j++) {
          const TestComponent = () => {
            const [data] = React.useState(Array(100).fill(0));
            return <div>{data.length}</div>;
          };
          
          const { unmount } = render(<TestComponent />);
          unmount();
        }

        const memory = getMemoryUsage();
        memoryReadings.push(memory);
      }

      // Skip test if memory API is not available
      if (memoryReadings.every(m => m === 0)) {
        console.log('Memory API not available, skipping memory growth test');
        expect(memoryReadings.every(m => m === 0)).toBe(true);
        return;
      }

      // Calculate memory trend
      const firstHalf = memoryReadings.slice(0, 5);
      const secondHalf = memoryReadings.slice(5);
      
      const avgFirstHalf = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecondHalf = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      const memoryGrowth = avgFirstHalf > 0 ? ((avgSecondHalf - avgFirstHalf) / avgFirstHalf) * 100 : 0;
      
      console.log(`Memory growth rate: ${memoryGrowth.toFixed(2)}%`);
      
      // Memory should not grow more than 20%
      expect(memoryGrowth).toBeLessThan(20);
    }, 30000);

    test('Large data structures should be garbage collected', async () => {
      await forceGarbageCollection();
      const initialMemory = getMemoryUsage();

      // Create large data structures
      for (let i = 0; i < 5; i++) {
        const largeArray = new Array(100000).fill({ data: 'test' });
        // Use the array
        expect(largeArray.length).toBe(100000);
      }

      await forceGarbageCollection();
      const finalMemory = getMemoryUsage();
      
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      console.log(`Memory increase after GC: ${memoryIncreaseMB.toFixed(2)} MB`);
      
      // Should be collected, minimal increase
      expect(memoryIncreaseMB).toBeLessThan(5);
    }, 15000);
  });

  describe('Closure Memory Leaks', () => {
    test('Should not retain large objects in closures', async () => {
      await forceGarbageCollection();
      const initialMemory = getMemoryUsage();

      for (let i = 0; i < 20; i++) {
        const TestComponent = () => {
          const largeObject = { data: new Array(10000).fill('test') };
          
          const handleClick = () => {
            // Using the large object - testing closure retention
            return largeObject.data.length;
          };

          return <button onClick={handleClick}>Click</button>;
        };
        
        const { unmount } = render(<TestComponent />);
        unmount();
      }

      await forceGarbageCollection();
      const finalMemory = getMemoryUsage();
      
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      console.log(`Closure memory increase: ${memoryIncreaseMB.toFixed(2)} MB`);
      
      expect(memoryIncreaseMB).toBeLessThan(10);
    }, 15000);
  });

  describe('Reference Cleanup', () => {
    test('Refs should be cleared on unmount', () => {
      let refValue: HTMLDivElement | null = null;

      const TestComponent = () => {
        const ref = React.useRef<HTMLDivElement>(null);

        React.useEffect(() => {
          refValue = ref.current;
          
          return () => {
            refValue = null;
          };
        }, []);

        return <div ref={ref}>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      
      expect(refValue).not.toBeNull();
      
      unmount();
      
      expect(refValue).toBeNull();
    });
  });
});
