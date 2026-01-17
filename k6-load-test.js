import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],    // Less than 1% of requests should fail
    errors: ['rate<0.1'],               // Less than 10% error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Test homepage
  let res = http.get(`${BASE_URL}/`);
  check(res, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);

  sleep(1);

  // Test API health check
  res = http.get(`${BASE_URL}/api/health`);
  check(res, {
    'health check status is 200': (r) => r.status === 200,
    'health check has status': (r) => JSON.parse(r.body).status === 'healthy',
  }) || errorRate.add(1);

  sleep(1);

  // Test transfer page
  res = http.get(`${BASE_URL}/transfer`);
  check(res, {
    'transfer page status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // Test stake page
  res = http.get(`${BASE_URL}/stake`);
  check(res, {
    'stake page status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(2);
}

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const colors = options.enableColors;
  
  let summary = `\n${indent}Load Test Summary:\n`;
  summary += `${indent}==================\n\n`;
  
  // Requests
  const httpReqs = data.metrics.http_reqs?.values;
  if (httpReqs) {
    summary += `${indent}Total Requests: ${httpReqs.count}\n`;
    summary += `${indent}Request Rate: ${httpReqs.rate.toFixed(2)}/s\n\n`;
  }
  
  // Response Times
  const httpReqDuration = data.metrics.http_req_duration?.values;
  if (httpReqDuration) {
    summary += `${indent}Response Times:\n`;
    summary += `${indent}  avg: ${httpReqDuration.avg.toFixed(2)}ms\n`;
    summary += `${indent}  min: ${httpReqDuration.min.toFixed(2)}ms\n`;
    summary += `${indent}  max: ${httpReqDuration.max.toFixed(2)}ms\n`;
    summary += `${indent}  p(95): ${httpReqDuration['p(95)'].toFixed(2)}ms\n\n`;
  }
  
  // Error Rate
  const httpReqFailed = data.metrics.http_req_failed?.values;
  if (httpReqFailed) {
    const failRate = (httpReqFailed.rate * 100).toFixed(2);
    summary += `${indent}Failed Requests: ${failRate}%\n`;
  }
  
  return summary;
}
