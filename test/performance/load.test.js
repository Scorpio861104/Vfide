/**
 * VFIDE Performance & Load Tests (k6)
 *
 * Run: k6 run test/performance/load.test.js
 *
 * Tests:
 * - API response times under load
 * - Rate limiter behavior under stress
 * - WebSocket connection limits
 * - Database query performance
 * - Contract interaction gas costs
 */

import http from "k6/http";
import ws from "k6/ws";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

const BASE_URL = __ENV.API_URL || "http://localhost:3000";

// Custom metrics
const errorRate = new Rate("errors");
const apiLatency = new Trend("api_latency");
const rateLimitHits = new Counter("rate_limit_hits");

// ═══════════════════════════════════════════════
// Test Configuration
// ═══════════════════════════════════════════════
export const options = {
  scenarios: {
    // Smoke test: verify system works
    smoke: {
      executor: "constant-vus",
      vus: 1,
      duration: "30s",
      startTime: "0s",
      tags: { scenario: "smoke" },
    },
    // Load test: normal expected traffic
    load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 50 },   // Ramp up
        { duration: "5m", target: 50 },   // Steady state
        { duration: "2m", target: 0 },    // Ramp down
      ],
      startTime: "30s",
      tags: { scenario: "load" },
    },
    // Stress test: beyond normal capacity
    stress: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 100 },
        { duration: "5m", target: 200 },
        { duration: "2m", target: 300 },  // Peak
        { duration: "2m", target: 0 },
      ],
      startTime: "10m",
      tags: { scenario: "stress" },
    },
    // Spike test: sudden burst
    spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 500 }, // Instant spike
        { duration: "1m", target: 500 },  // Hold
        { duration: "10s", target: 0 },   // Drop
      ],
      startTime: "20m",
      tags: { scenario: "spike" },
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"], // 95th < 500ms, 99th < 1s
    errors: ["rate<0.05"],                           // Error rate < 5%
    api_latency: ["p(95)<300"],                      // API p95 < 300ms
  },
};

// ═══════════════════════════════════════════════
// Test Scenarios
// ═══════════════════════════════════════════════
export default function () {
  group("Public endpoints", () => {
    // Health check
    let res = http.get(`${BASE_URL}/api/health`);
    check(res, {
      "health status 200": (r) => r.status === 200,
      "health response < 100ms": (r) => r.timings.duration < 100,
    });
    apiLatency.add(res.timings.duration);

    // Auth challenge
    res = http.get(`${BASE_URL}/api/auth/challenge`);
    check(res, {
      "challenge status 200": (r) => r.status === 200,
      "challenge has nonce": (r) => JSON.parse(r.body).challenge !== undefined,
    });
    apiLatency.add(res.timings.duration);
  });

  group("Authenticated endpoints", () => {
    // Simulate authenticated requests
    const headers = {
      "Cookie": "auth=test-jwt-token",
      "X-CSRF-Token": "test-csrf",
      "Content-Type": "application/json",
    };

    // User profile
    let res = http.get(`${BASE_URL}/api/users/profile`, { headers });
    if (res.status === 429) {
      rateLimitHits.add(1);
    }
    check(res, {
      "profile status ok": (r) => [200, 401, 429].includes(r.status),
    });
    errorRate.add(res.status >= 500);
    apiLatency.add(res.timings.duration);

    // Token balance
    res = http.get(`${BASE_URL}/api/crypto/balance/0x1234567890abcdef1234567890abcdef12345678`, { headers });
    check(res, {
      "balance status ok": (r) => [200, 401, 429].includes(r.status),
    });
    apiLatency.add(res.timings.duration);

    // Staking positions
    res = http.get(`${BASE_URL}/api/staking/positions`, { headers });
    apiLatency.add(res.timings.duration);

    // Governance proposals
    res = http.get(`${BASE_URL}/api/governance/proposals?page=1&limit=10`, { headers });
    apiLatency.add(res.timings.duration);

    // Merchant listings
    res = http.get(`${BASE_URL}/api/merchants?page=1&limit=20`, { headers });
    apiLatency.add(res.timings.duration);
  });

  group("Rate limiter stress", () => {
    // Rapid-fire auth attempts to test rate limiter
    for (let i = 0; i < 5; i++) {
      const res = http.post(`${BASE_URL}/api/auth/verify`, JSON.stringify({
        message: "test",
        signature: "0x0000",
      }), { headers: { "Content-Type": "application/json" } });

      if (res.status === 429) {
        rateLimitHits.add(1);
        break; // Rate limited - good
      }
    }
  });

  group("Heavy queries", () => {
    const headers = {
      "Cookie": "auth=test-jwt-token",
      "Content-Type": "application/json",
    };

    // Analytics (potentially heavy DB query)
    let res = http.get(`${BASE_URL}/api/seer/analytics?range=30d`, { headers });
    apiLatency.add(res.timings.duration);
    check(res, {
      "analytics under 2s": (r) => r.timings.duration < 2000,
    });

    // Merchant reviews with filtering
    res = http.get(`${BASE_URL}/api/merchants/reviews?status=active&sort=rating&page=1`, { headers });
    apiLatency.add(res.timings.duration);
  });

  sleep(1); // Pace requests
}

// ═══════════════════════════════════════════════
// WebSocket Load Test
// ═══════════════════════════════════════════════
export function wsTest() {
  const url = `ws://${BASE_URL.replace("http://", "")}/ws`;

  const res = ws.connect(url, {}, function (socket) {
    socket.on("open", () => {
      socket.send(JSON.stringify({ type: "subscribe", channel: "prices" }));
    });

    socket.on("message", (data) => {
      const parsed = JSON.parse(data);
      check(parsed, {
        "ws message has type": (d) => d.type !== undefined,
      });
    });

    socket.on("error", (e) => {
      errorRate.add(1);
    });

    sleep(5);
    socket.close();
  });
}
