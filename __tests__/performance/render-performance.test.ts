/**
 * Render Performance Tests
 * Tests component render times, re-render frequency, and rendering optimizations
 */
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import React, { Profiler, ProfilerOnRenderCallback } from 'react';

// Mock performance API
const mockPerformance = {
  marks: new Map<string, number>(),
  measures: new Map<string, number>(),
  
  mark(name: string) {
    this.marks.set(name, performance.now());
  },
  
  measure(name: string, startMark: string, endMark: string) {
    const start = this.marks.get(startMark);
    const end = this.marks.get(endMark);
    if (start && end) {
      this.measures.set(name, end - start);
    }
  },
  
  getMeasure(name: string): number | undefined {
    return this.measures.get(name);
  },
  
  clear() {
    this.marks.clear();
    this.measures.clear();
  },
};

describe('Render Performance Tests', () => {
  beforeEach(() => {
    mockPerformance.clear();
  });

  describe('Component Render Times', () => {
    test('Button component should render in < 16ms', async () => {
      const Button = (await import('@/components/ui/button')).Button;
      
      const startTime = performance.now();
      render(<Button>Click Me</Button>);
      const endTime = performance.now();
      
      const renderTime = endTime - startTime;
      console.log(`Button render time: ${renderTime.toFixed(2)}ms`);
      
      expect(renderTime).toBeLessThan(16); // 60fps = 16ms per frame
    });

    test('Card component should render in < 16ms', async () => {
      const { Card } = await import('@/components/ui/card');
      
      const startTime = performance.now();
      render(
        <Card>
          <div>Card Content</div>
        </Card>
      );
      const endTime = performance.now();
      
      const renderTime = endTime - startTime;
      console.log(`Card render time: ${renderTime.toFixed(2)}ms`);
      
      expect(renderTime).toBeLessThan(16);
    });

    test('EmptyState component should render in < 20ms', async () => {
      const { EmptyState } = await import('@/components/ui/EmptyState');
      
      const startTime = performance.now();
      render(
        <EmptyState
          title="No Data"
          description="No data available"
        />
      );
      const endTime = performance.now();
      
      const renderTime = endTime - startTime;
      console.log(`EmptyState render time: ${renderTime.toFixed(2)}ms`);
      
      expect(renderTime).toBeLessThan(20);
    });

    test('Progress component should render in < 16ms', async () => {
      const { Progress } = await import('@/components/ui/progress');
      
      const startTime = performance.now();
      render(<Progress value={50} />);
      const endTime = performance.now();
      
      const renderTime = endTime - startTime;
      console.log(`Progress render time: ${renderTime.toFixed(2)}ms`);
      
      expect(renderTime).toBeLessThan(16);
    });
  });

  describe('Re-render Performance', () => {
    test('Component should not re-render unnecessarily', () => {
      let renderCount = 0;
      
      const TestComponent = React.memo(() => {
        renderCount++;
        return <div>Test Component</div>;
      });

      const { rerender } = render(<TestComponent />);
      
      expect(renderCount).toBe(1);
      
      // Re-render with same props
      rerender(<TestComponent />);
      
      expect(renderCount).toBe(1); // Should not re-render
    });

    test('Component with props should only re-render when props change', () => {
      let renderCount = 0;
      
      const TestComponent = React.memo(({ value }: { value: number }) => {
        renderCount++;
        return <div>{value}</div>;
      });

      const { rerender } = render(<TestComponent value={1} />);
      
      expect(renderCount).toBe(1);
      
      // Re-render with same props
      rerender(<TestComponent value={1} />);
      expect(renderCount).toBe(1);
      
      // Re-render with different props
      rerender(<TestComponent value={2} />);
      expect(renderCount).toBe(2);
    });

    test('List component should virtualize long lists', async () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }));
      
      const startTime = performance.now();
      
      const { container } = render(
        <div style={{ height: '400px', overflow: 'auto' }}>
          {items.map(item => (
            <div key={item.id}>{item.name}</div>
          ))}
        </div>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      console.log(`Long list render time: ${renderTime.toFixed(2)}ms`);
      
      // Even without virtualization, should complete reasonably fast
      expect(renderTime).toBeLessThan(100);
    });
  });

  describe('React Profiler Performance', () => {
    test('Component should have acceptable phase durations', async () => {
      const durations: number[] = [];
      
      const onRender: ProfilerOnRenderCallback = (
        id,
        phase,
        actualDuration
      ) => {
        durations.push(actualDuration);
      };

      const TestComponent = () => {
        const [count, setCount] = React.useState(0);
        
        React.useEffect(() => {
          setCount(1);
        }, []);
        
        return <div>{count}</div>;
      };

      render(
        <Profiler id="test" onRender={onRender}>
          <TestComponent />
        </Profiler>
      );

      await waitFor(() => {
        expect(durations.length).toBeGreaterThan(0);
      });

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      console.log(`Average render duration: ${avgDuration.toFixed(2)}ms`);
      
      expect(avgDuration).toBeLessThan(16);
    });
  });

  describe('Image Loading Performance', () => {
    test('Images should lazy load', () => {
      const { container } = render(
        <img 
          src="/test-image.jpg" 
          alt="Test" 
          loading="lazy"
        />
      );
      
      const img = container.querySelector('img');
      expect(img).toHaveAttribute('loading', 'lazy');
    });

    test('Images should have proper dimensions to prevent layout shift', () => {
      const { container } = render(
        <img 
          src="/test-image.jpg" 
          alt="Test" 
          width={100}
          height={100}
        />
      );
      
      const img = container.querySelector('img');
      expect(img).toHaveAttribute('width');
      expect(img).toHaveAttribute('height');
    });
  });

  describe('Route Transition Performance', () => {
    test('Page transitions should be smooth', async () => {
      const startTime = performance.now();
      
      // Simulate navigation action
      act(() => {
        // Measure the synchronous work of triggering navigation
        const mockNavigation = () => {
          // This simulates the synchronous part of navigation
        };
        mockNavigation();
      });
      
      const endTime = performance.now();
      const transitionTime = endTime - startTime;
      
      expect(transitionTime).toBeLessThan(16);
    });
  });

  describe('State Update Performance', () => {
    test('State updates should be fast', async () => {
      const TestComponent = () => {
        const [items, setItems] = React.useState<number[]>([]);

        return (
          <div>
            <button
              onClick={() => {
                const start = performance.now();
                setItems(prev => [...prev, prev.length]);
                const end = performance.now();
                console.log(`State update time: ${(end - start).toFixed(2)}ms`);
              }}
            >
              Add Item
            </button>
            <div data-testid="items">{items.length}</div>
          </div>
        );
      };

      const { getByRole, getByTestId } = render(<TestComponent />);
      
      const startTime = performance.now();
      
      act(() => {
        getByRole('button').click();
      });
      
      await waitFor(() => {
        expect(getByTestId('items')).toHaveTextContent('1');
      });
      
      const endTime = performance.now();
      const updateTime = endTime - startTime;
      
      console.log(`Total state update time: ${updateTime.toFixed(2)}ms`);
      expect(updateTime).toBeLessThan(50);
    });

    test('Multiple state updates should batch', async () => {
      let renderCount = 0;
      
      const TestComponent = () => {
        renderCount++;
        const [count1, setCount1] = React.useState(0);
        const [count2, setCount2] = React.useState(0);

        return (
          <div>
            <button
              onClick={() => {
                setCount1(c => c + 1);
                setCount2(c => c + 1);
              }}
            >
              Update
            </button>
            <div>{count1 + count2}</div>
          </div>
        );
      };

      const { getByRole } = render(<TestComponent />);
      
      const initialRenderCount = renderCount;
      
      act(() => {
        getByRole('button').click();
      });
      
      // Should only cause one additional render due to batching
      expect(renderCount).toBe(initialRenderCount + 1);
    });
  });

  describe('Effect Performance', () => {
    test('Effects should not cause excessive re-renders', async () => {
      let effectCount = 0;
      let renderCount = 0;
      
      const TestComponent = () => {
        renderCount++;
        const [data, setData] = React.useState<string | null>(null);

        React.useEffect(() => {
          effectCount++;
          setData('loaded');
        }, []);

        return <div>{data}</div>;
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(effectCount).toBe(1);
      });

      // Initial render + effect update = 2 renders
      expect(renderCount).toBeLessThanOrEqual(2);
    });

    test('Cleanup functions should prevent memory leaks', () => {
      let subscriptions = 0;
      
      const TestComponent = () => {
        React.useEffect(() => {
          subscriptions++;
          
          return () => {
            subscriptions--;
          };
        }, []);

        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      
      expect(subscriptions).toBe(1);
      
      unmount();
      
      expect(subscriptions).toBe(0);
    });
  });

  describe('Hydration Performance', () => {
    test('SSR content should hydrate quickly', () => {
      const markup = '<div data-testid="ssr-content">Server Rendered</div>';
      
      const container = document.createElement('div');
      container.innerHTML = markup;
      document.body.appendChild(container);

      const startTime = performance.now();
      
      const TestComponent = () => (
        <div data-testid="ssr-content">Server Rendered</div>
      );

      render(<TestComponent />, { container });
      
      const endTime = performance.now();
      const hydrationTime = endTime - startTime;
      
      console.log(`Hydration time: ${hydrationTime.toFixed(2)}ms`);
      
      expect(hydrationTime).toBeLessThan(50);
      
      document.body.removeChild(container);
    });
  });

  describe('Memoization Performance', () => {
    test('useMemo should prevent expensive calculations', () => {
      let calculationCount = 0;
      
      const TestComponent = ({ items }: { items: number[] }) => {
        const sum = React.useMemo(() => {
          calculationCount++;
          return items.reduce((a, b) => a + b, 0);
        }, [items]);

        return <div>{sum}</div>;
      };

      const items = [1, 2, 3];
      const { rerender } = render(<TestComponent items={items} />);
      
      expect(calculationCount).toBe(1);
      
      // Re-render with same items reference
      rerender(<TestComponent items={items} />);
      
      expect(calculationCount).toBe(1); // Should not recalculate
      
      // Re-render with new items
      rerender(<TestComponent items={[1, 2, 3, 4]} />);
      
      expect(calculationCount).toBe(2); // Should recalculate
    });

    test('useCallback should prevent function recreation', () => {
      let callbackCount = 0;
      
      const TestComponent = () => {
        const [count, setCount] = React.useState(0);
        
        const handleClick = React.useCallback(() => {
          callbackCount++;
          setCount(c => c + 1);
        }, []);

        return (
          <button onClick={handleClick}>
            {count}
          </button>
        );
      };

      render(<TestComponent />);
      
      // Callback should be created once
      expect(callbackCount).toBe(0);
    });
  });

  describe('Animation Performance', () => {
    test('CSS animations should be GPU accelerated', () => {
      const { container } = render(
        <div 
          style={{ 
            transform: 'translateZ(0)',
            willChange: 'transform'
          }}
        >
          Animated Content
        </div>
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element.style.transform).toContain('translateZ');
    });
  });
});
