import { NextRequest } from 'next/server';
import { parsePaginationParams } from '@/lib/optimization/apiOptimization';

describe('parsePaginationParams', () => {
  it('parses valid page/limit values', () => {
    const request = new NextRequest('http://localhost:3000/api/users?page=3&limit=25');
    const result = parsePaginationParams(request);

    expect(result.page).toBe(3);
    expect(result.limit).toBe(25);
  });

  it('caps page and limit at configured maxima', () => {
    const request = new NextRequest('http://localhost:3000/api/users?page=999999&limit=999999');
    const result = parsePaginationParams(request);

    expect(result.page).toBe(1000);
    expect(result.limit).toBe(100);
  });

  it('falls back to defaults for malformed values', () => {
    const request = new NextRequest('http://localhost:3000/api/users?page=abc&limit=10abc');
    const result = parsePaginationParams(request);

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('falls back to defaults for zero and negative numbers', () => {
    const request = new NextRequest('http://localhost:3000/api/users?page=0&limit=-5');
    const result = parsePaginationParams(request);

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });
});
