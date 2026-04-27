import { NextRequest } from 'next/server';
import { proxy } from '../../middleware';

describe('proxy cors origin restrictions', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('does not allow arbitrary .vercel.app origins in strict production', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      VERCEL_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'https://app.vfide.io',
    };

    const request = new NextRequest('http://localhost:3000/api/health', {
      method: 'GET',
      headers: {
        origin: 'https://evil-preview.vercel.app',
      },
    });

    const response = proxy(request);

    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('allows .vercel.app origins only for preview environment', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      VERCEL_ENV: 'preview',
      NEXT_PUBLIC_APP_URL: 'https://app.vfide.io',
    };

    const request = new NextRequest('http://localhost:3000/api/health', {
      method: 'GET',
      headers: {
        origin: 'https://vfide-feature.vercel.app',
      },
    });

    const response = proxy(request);

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://vfide-feature.vercel.app');
    expect(response.headers.get('Vary')).toContain('Origin');
  });
});
