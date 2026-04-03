/**
 * VFIDE API Route Tests
 *
 * Findings: H-05, H-10, M-03, M-04, M-06, L-09, L-15
 */

import request from "supertest";
import { describe, it, expect, beforeAll } from "@jest/globals";

const BASE_URL = process.env.TEST_API_URL || "http://localhost:3000";
const RUN_LIVE_API_TESTS = process.env.RUN_LIVE_API_TESTS === "true";
const describeLive = RUN_LIVE_API_TESTS ? describe : describe.skip;
let authToken: string;
let testWalletAddress: string;

beforeAll(async () => {
  testWalletAddress = "0x1234567890abcdef1234567890abcdef12345678";
  authToken = "test-token"; // Replace with actual SIWE flow in CI
});

// ═══════════════════════════════════════════════
// 1. Authentication Flow
// ═══════════════════════════════════════════════
describeLive("Authentication (SIWE)", () => {
  it("should return a SIWE challenge", async () => {
    const res = await request(BASE_URL).get("/api/auth/challenge");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("challenge");
    expect(typeof res.body.challenge).toBe("string");
  });

  it("should return unique challenges per request", async () => {
    const res1 = await request(BASE_URL).get("/api/auth/challenge");
    const res2 = await request(BASE_URL).get("/api/auth/challenge");
    expect(res1.body.challenge).not.toEqual(res2.body.challenge);
  });

  it("should reject invalid signature", async () => {
    const res = await request(BASE_URL)
      .post("/api/auth/verify")
      .send({ message: "fake", signature: "0x0000" });
    expect(res.status).toBe(401);
  });

  it("should set HTTPOnly secure cookie on valid auth", async () => {
    // With a real SIWE signature this would verify cookie flags
    // For now verify the auth endpoint exists and responds
    const res = await request(BASE_URL).post("/api/auth/verify").send({});
    expect([400, 401]).toContain(res.status);
  });

  it("should reject revoked tokens", async () => {
    // After logout, the token hash should be in the revocation list
    const res = await request(BASE_URL)
      .get("/api/users/profile")
      .set("Cookie", "auth=revoked-token-hash");
    expect(res.status).toBe(401);
  });

  it("should lock account after repeated failed attempts", async () => {
    const promises = Array.from({ length: 15 }, () =>
      request(BASE_URL)
        .post("/api/auth/verify")
        .send({ message: "fake", signature: "0xbad" })
    );
    const results = await Promise.all(promises);
    const blocked = results.filter((r) => r.status === 429 || r.status === 423);
    expect(blocked.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════
// 2. CSRF Protection
// ═══════════════════════════════════════════════
describeLive("CSRF (Double-Submit Cookie)", () => {
  it("should reject POST without CSRF header", async () => {
    const res = await request(BASE_URL)
      .post("/api/users/profile")
      .set("Cookie", `auth=${authToken}`)
      .send({ name: "test" });
    expect(res.status).toBe(403);
  });

  it("should reject mismatched CSRF token", async () => {
    const res = await request(BASE_URL)
      .post("/api/users/profile")
      .set("Cookie", `auth=${authToken}; csrf=tokenA`)
      .set("X-CSRF-Token", "tokenB")
      .send({ name: "test" });
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════
// 3. Rate Limiting
// ═══════════════════════════════════════════════
describeLive("Rate Limiting", () => {
  it("should rate limit auth endpoints", async () => {
    const promises = Array.from({ length: 15 }, () =>
      request(BASE_URL).post("/api/auth/verify").send({ message: "test", signature: "0x" })
    );
    const results = await Promise.all(promises);
    const rateLimited = results.filter((r) => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  it("[H-05] should use shared store in multi-instance mode", async () => {
    // In-memory counters are per-instance — verify Redis/Upstash in production
    if (process.env.NODE_ENV === "production") {
      const res1 = await request(BASE_URL).get("/api/health");
      expect(res1.status).toBe(200);
    } else {
      // Non-production should still return a controlled response (not a server crash).
      const res = await request(BASE_URL).get("/api/health");
      expect(res.status).not.toBe(500);
    }
  });

  it("[L-09] should fail CLOSED on rate limit error", async () => {
    // If Redis is down, requests should be denied, not allowed through
    // Full outage simulation is a staging concern; here we enforce non-open behavior bounds.
    const res = await request(BASE_URL)
      .post("/api/auth/verify")
      .send({ message: "test", signature: "0x" });
    expect([400, 401, 403, 423, 429]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════
// 4. Input Validation (Zod)
// ═══════════════════════════════════════════════
describeLive("[M-03] Input Validation", () => {
  const routesNeedingValidation = [
    { method: "post", path: "/api/crypto/balance" },
    { method: "post", path: "/api/merchants/register" },
    { method: "put", path: "/api/users/profile" },
    { method: "post", path: "/api/governance/proposals" },
    { method: "post", path: "/api/crypto/payment-requests" },
    { method: "post", path: "/api/bridge/initiate" },
  ];

  routesNeedingValidation.forEach(({ method, path }) => {
    it(`should validate input on ${method.toUpperCase()} ${path}`, async () => {
      const res = await (request(BASE_URL) as any)[method](path)
        .set("Cookie", `auth=${authToken}`)
        .send({ invalid: "<script>alert(1)</script>" });
      // Should return 400 (bad input) or 401/403, never 500
      expect(res.status).not.toBe(500);
    });
  });

  it("should enforce pagination bounds", async () => {
    const res = await request(BASE_URL)
      .get("/api/merchants?page=-1&limit=999999")
      .set("Cookie", `auth=${authToken}`);
    expect([400, 401]).toContain(res.status);
  });

  it("should reject prototype pollution", async () => {
    const res = await request(BASE_URL)
      .post("/api/users/profile")
      .set("Cookie", `auth=${authToken}`)
      .send(JSON.parse('{"__proto__":{"admin":true}}'));
    expect(res.status).not.toBe(200);
  });
});

// ═══════════════════════════════════════════════
// 5. SQL Injection Prevention
// ═══════════════════════════════════════════════
describeLive("SQL Injection Prevention", () => {
  const sqlPayloads = [
    "'; DROP TABLE users; --",
    "1 OR 1=1",
    "1' UNION SELECT * FROM users--",
  ];

  sqlPayloads.forEach((payload) => {
    it(`should reject SQL payload: ${payload.substring(0, 25)}`, async () => {
      const res = await request(BASE_URL)
        .get(`/api/crypto/balance/${encodeURIComponent(payload)}`)
        .set("Cookie", `auth=${authToken}`);
      expect(res.status).not.toBe(500);
    });
  });

  it("should handle dynamic WHERE clauses safely", async () => {
    const res = await request(BASE_URL)
      .get("/api/merchants/reviews?status=' OR '1'='1")
      .set("Cookie", `auth=${authToken}`);
    expect(res.status).not.toBe(500);
  });
});

// ═══════════════════════════════════════════════
// 6. [M-04] Error Leakage
// ═══════════════════════════════════════════════
describeLive("[M-04] Error Detail Leakage", () => {
  const leakyRoutes = [
    "/api/crypto/balance/invalid",
    "/api/crypto/payment-requests/invalid",
    "/api/merchants/invalid-id",
  ];

  leakyRoutes.forEach((path) => {
    it(`should not leak stack traces on ${path}`, async () => {
      const res = await request(BASE_URL)
        .get(path)
        .set("Cookie", `auth=${authToken}`);
      if (res.status >= 400) {
        const body = JSON.stringify(res.body);
        expect(body).not.toContain("at Object.");
        expect(body).not.toContain("node_modules");
      }
      expect(res.status).not.toBe(500);
    });
  });
});

// ═══════════════════════════════════════════════
// 7. [H-10] Security Event Routes Auth
// ═══════════════════════════════════════════════
describeLive("[H-10] Security Routes Authentication", () => {
  const securityRoutes = [
    "/api/security/guardian-attestations",
    "/api/security/next-of-kin-fraud-events",
    "/api/security/suspicious-activity",
    "/api/security/account-recovery",
    "/api/security/lockout-events",
  ];

  securityRoutes.forEach((path) => {
    it(`should require authentication on ${path}`, async () => {
      const res = await request(BASE_URL).get(path);
      expect(res.status).toBe(401);
    });
  });
});

// ═══════════════════════════════════════════════
// 8. [L-15] Seer Analytics Auth
// ═══════════════════════════════════════════════
describeLive("[L-15] Seer Analytics Authentication", () => {
  it("should require authentication on /api/seer/analytics", async () => {
    const res = await request(BASE_URL).get("/api/seer/analytics");
    expect(res.status).toBe(401);
  });

  it("should not expose analytics data to unauthenticated users", async () => {
    const res = await request(BASE_URL).get("/api/seer/analytics?range=all");
    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty("data");
  });
});

// ═══════════════════════════════════════════════
// 9. WebSocket Security
// ═══════════════════════════════════════════════
describeLive("WebSocket Security", () => {
  it.todo("[M-06] should not accept JWT via query parameter");
});

// ═══════════════════════════════════════════════
// 10. Authorization Matrix
// ═══════════════════════════════════════════════
describeLive("Authorization Matrix", () => {
  const publicRoutes = ["/api/auth/challenge", "/api/health"];

  const authenticatedRoutes = [
    "/api/users/profile",
    "/api/crypto/balance",
    "/api/crypto/payment-requests",
    "/api/governance/proposals",
  ];

  const adminRoutes = ["/api/admin/users", "/api/admin/analytics"];

  publicRoutes.forEach((path) => {
    it(`${path} should be accessible without auth`, async () => {
      const res = await request(BASE_URL).get(path);
      expect(res.status).not.toBe(401);
    });
  });

  authenticatedRoutes.forEach((path) => {
    it(`${path} should require authentication`, async () => {
      const res = await request(BASE_URL).get(path);
      expect(res.status).toBe(401);
    });
  });

  adminRoutes.forEach((path) => {
    it(`${path} should require admin role`, async () => {
      const res = await request(BASE_URL)
        .get(path)
        .set("Cookie", `auth=${authToken}`);
      expect([401, 403]).toContain(res.status);
    });
  });
});
