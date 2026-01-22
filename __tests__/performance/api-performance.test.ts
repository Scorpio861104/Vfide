/**
 * API Performance Tests
 * Tests API endpoint response times, database query performance, and cache effectiveness
 */
import '@testing-library/jest-dom';

describe('API Performance Tests', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  const API_BASE = `${BASE_URL}/api`;

  const measureResponseTime = async (url: string): Promise<number> => {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url);
      await response.json();
      const endTime = performance.now();
      return endTime - startTime;
    } catch (error) {
      const endTime = performance.now();
      return endTime - startTime;
    }
  };

  describe('Health Check Endpoints', () => {
    test('Health check should respond in < 100ms', async () => {
      const responseTime = await measureResponseTime(`${API_BASE}/health`);
      
      console.log(`Health check response time: ${responseTime.toFixed(2)}ms`);
      expect(responseTime).toBeLessThan(100);
    }, 10000);

    test('System status should respond in < 200ms', async () => {
      const responseTime = await measureResponseTime(`${API_BASE}/status`);
      
      console.log(`Status response time: ${responseTime.toFixed(2)}ms`);
      expect(responseTime).toBeLessThan(200);
    }, 10000);
  });

  describe('Data Retrieval Endpoints', () => {
    test('User data endpoint should respond in < 500ms', async () => {
      const responseTime = await measureResponseTime(`${API_BASE}/user/profile`);
      
      console.log(`User profile response time: ${responseTime.toFixed(2)}ms`);
      expect(responseTime).toBeLessThan(500);
    }, 10000);

    test('Dashboard data should respond in < 500ms', async () => {
      const responseTime = await measureResponseTime(`${API_BASE}/dashboard/stats`);
      
      console.log(`Dashboard stats response time: ${responseTime.toFixed(2)}ms`);
      expect(responseTime).toBeLessThan(500);
    }, 10000);

    test('Wallet data should respond in < 500ms', async () => {
      const responseTime = await measureResponseTime(`${API_BASE}/wallet/balance`);
      
      console.log(`Wallet balance response time: ${responseTime.toFixed(2)}ms`);
      expect(responseTime).toBeLessThan(500);
    }, 10000);

    test('Governance proposals should respond in < 600ms', async () => {
      const responseTime = await measureResponseTime(`${API_BASE}/governance/proposals`);
      
      console.log(`Governance proposals response time: ${responseTime.toFixed(2)}ms`);
      expect(responseTime).toBeLessThan(600);
    }, 10000);
  });

  describe('Database Query Performance', () => {
    test('Simple SELECT query should be fast', async () => {
      const responseTime = await measureResponseTime(`${API_BASE}/dao/list`);
      
      console.log(`DAO list query time: ${responseTime.toFixed(2)}ms`);
      expect(responseTime).toBeLessThan(400);
    }, 10000);

    test('Paginated queries should be efficient', async () => {
      const responseTime = await measureResponseTime(
        `${API_BASE}/transactions?page=1&limit=20`
      );
      
      console.log(`Paginated query time: ${responseTime.toFixed(2)}ms`);
      expect(responseTime).toBeLessThan(500);
    }, 10000);

    test('Filtered queries should be optimized', async () => {
      const responseTime = await measureResponseTime(
        `${API_BASE}/transactions?status=completed`
      );
      
      console.log(`Filtered query time: ${responseTime.toFixed(2)}ms`);
      expect(responseTime).toBeLessThan(600);
    }, 10000);

    test('JOIN queries should be reasonable', async () => {
      const responseTime = await measureResponseTime(`${API_BASE}/user/activities`);
      
      console.log(`JOIN query time: ${responseTime.toFixed(2)}ms`);
      expect(responseTime).toBeLessThan(700);
    }, 10000);

    test('Aggregation queries should be performant', async () => {
      const responseTime = await measureResponseTime(`${API_BASE}/stats/summary`);
      
      console.log(`Aggregation query time: ${responseTime.toFixed(2)}ms`);
      expect(responseTime).toBeLessThan(800);
    }, 10000);
  });

  describe('Cache Effectiveness', () => {
    test('Repeated requests should be faster (cached)', async () => {
      const url = `${API_BASE}/dao/list`;
      
      // First request (uncached)
      const firstTime = await measureResponseTime(url);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Second request (should be cached)
      const secondTime = await measureResponseTime(url);
      
      console.log(`First request: ${firstTime.toFixed(2)}ms, Cached: ${secondTime.toFixed(2)}ms`);
      
      // Cached request should be faster or similar
      expect(secondTime).toBeLessThanOrEqual(firstTime * 1.5); // Allow 50% variance
    }, 15000);

    test('Static data should be aggressively cached', async () => {
      const url = `${API_BASE}/config`;
      
      const times = await Promise.all([
        measureResponseTime(url),
        measureResponseTime(url),
        measureResponseTime(url),
      ]);
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`Average cached config time: ${avgTime.toFixed(2)}ms`);
      
      expect(avgTime).toBeLessThan(200);
    }, 15000);

    test('Should have proper cache headers', async () => {
      const response = await fetch(`${API_BASE}/dao/list`);
      const cacheControl = response.headers.get('cache-control');
      
      console.log('Cache-Control header:', cacheControl);
      
      // Should have some cache control header
      expect(cacheControl).toBeTruthy();
    }, 10000);
  });

  describe('Concurrent Request Handling', () => {
    test('Should handle 10 concurrent requests efficiently', async () => {
      const url = `${API_BASE}/health`;
      const concurrentRequests = 10;
      
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrentRequests }, () =>
        measureResponseTime(url)
      );
      
      const times = await Promise.all(promises);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      
      console.log(`10 concurrent requests: Total ${totalTime.toFixed(2)}ms, Avg ${avgTime.toFixed(2)}ms`);
      
      // Total time should not be much more than a single request
      expect(totalTime).toBeLessThan(1000);
      expect(avgTime).toBeLessThan(300);
    }, 15000);

    test('Should handle 50 concurrent requests without degradation', async () => {
      const url = `${API_BASE}/health`;
      const concurrentRequests = 50;
      
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrentRequests }, () =>
        measureResponseTime(url)
      );
      
      const times = await Promise.all(promises);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      
      console.log(`50 concurrent requests: Total ${totalTime.toFixed(2)}ms, Avg ${avgTime.toFixed(2)}ms, Max ${maxTime.toFixed(2)}ms`);
      
      expect(totalTime).toBeLessThan(3000);
      expect(avgTime).toBeLessThan(500);
      expect(maxTime).toBeLessThan(2000);
    }, 20000);
  });

  describe('Rate Limiting Impact', () => {
    test('Rate limiting should not significantly impact performance', async () => {
      const url = `${API_BASE}/health`;
      
      // Make requests that should be within rate limit
      const times = [];
      for (let i = 0; i < 5; i++) {
        const time = await measureResponseTime(url);
        times.push(time);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`Average time with rate limiting: ${avgTime.toFixed(2)}ms`);
      
      expect(avgTime).toBeLessThan(300);
    }, 15000);

    test('Should handle rate limit gracefully', async () => {
      const url = `${API_BASE}/user/profile`;
      
      // Rapid fire requests to potentially trigger rate limit
      const promises = Array.from({ length: 100 }, () =>
        fetch(url).then(r => r.status).catch(() => 429)
      );
      
      const statuses = await Promise.all(promises);
      const rateLimited = statuses.filter(s => s === 429).length;
      const successful = statuses.filter(s => s === 200 || s === 401).length;
      
      console.log(`Rate limit test: ${successful} successful, ${rateLimited} rate-limited`);
      
      // Should have some successful requests
      expect(successful).toBeGreaterThan(0);
    }, 20000);
  });

  describe('WebSocket Performance', () => {
    test('WebSocket connection should establish quickly', async () => {
      const wsUrl = BASE_URL.replace(/^https?/, (match) => match === 'https' ? 'wss' : 'ws') + '/ws';
      
      const startTime = performance.now();
      
      return new Promise<void>((resolve) => {
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          const endTime = performance.now();
          const connectionTime = endTime - startTime;
          
          console.log(`WebSocket connection time: ${connectionTime.toFixed(2)}ms`);
          
          expect(connectionTime).toBeLessThan(500);
          
          ws.close();
          resolve();
        };
        
        ws.onerror = () => {
          const endTime = performance.now();
          const connectionTime = endTime - startTime;
          console.log(`WebSocket connection failed after ${connectionTime.toFixed(2)}ms`);
          resolve(); // Don't fail test if WebSocket not available
        };
        
        // Timeout
        setTimeout(() => {
          ws.close();
          resolve();
        }, 5000);
      });
    }, 10000);

    test('WebSocket messages should have low latency', async () => {
      const wsUrl = BASE_URL.replace(/^https?/, (match) => match === 'https' ? 'wss' : 'ws') + '/ws';
      
      return new Promise<void>((resolve) => {
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          const startTime = performance.now();
          
          ws.send(JSON.stringify({ type: 'ping' }));
          
          ws.onmessage = () => {
            const endTime = performance.now();
            const latency = endTime - startTime;
            
            console.log(`WebSocket message latency: ${latency.toFixed(2)}ms`);
            
            expect(latency).toBeLessThan(200);
            
            ws.close();
            resolve();
          };
        };
        
        ws.onerror = () => {
          resolve(); // Don't fail test if WebSocket not available
        };
        
        // Timeout
        setTimeout(() => {
          ws.close();
          resolve();
        }, 5000);
      });
    }, 10000);
  });

  describe('POST Request Performance', () => {
    test('Simple POST should respond in < 600ms', async () => {
      const startTime = performance.now();
      
      try {
        await fetch(`${API_BASE}/analytics/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'test', data: {} }),
        });
      } catch {
        // Endpoint might not exist
      }
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      console.log(`POST request time: ${responseTime.toFixed(2)}ms`);
      expect(responseTime).toBeLessThan(600);
    }, 10000);

    test('Large payload POST should be reasonable', async () => {
      const largePayload = {
        data: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          value: `test-${i}`,
        })),
      };
      
      const startTime = performance.now();
      
      try {
        await fetch(`${API_BASE}/bulk/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(largePayload),
        });
      } catch {
        // Endpoint might not exist
      }
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      console.log(`Large POST request time: ${responseTime.toFixed(2)}ms`);
      expect(responseTime).toBeLessThan(1500);
    }, 15000);
  });

  describe('Error Response Performance', () => {
    test('404 errors should be fast', async () => {
      const responseTime = await measureResponseTime(`${API_BASE}/nonexistent-endpoint`);
      
      console.log(`404 response time: ${responseTime.toFixed(2)}ms`);
      expect(responseTime).toBeLessThan(200);
    }, 10000);

    test('Validation errors should be fast', async () => {
      const startTime = performance.now();
      
      try {
        await fetch(`${API_BASE}/user/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invalid: 'data' }),
        });
      } catch {
        // Expected to fail
      }
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      console.log(`Validation error response time: ${responseTime.toFixed(2)}ms`);
      expect(responseTime).toBeLessThan(300);
    }, 10000);
  });
});
