'use client';

import { useEffect } from 'react';

type FetchInput = RequestInfo | URL;

type FetchInit = RequestInit | undefined;

declare global {
  interface Window {
    __vfideFetchPatched?: boolean;
  }
}

const getCsrfToken = (() => {
  let cachedToken: string | null = null;
  let inflight: Promise<string> | null = null;

  return async () => {
    if (cachedToken) return cachedToken;
    if (!inflight) {
      inflight = fetch('/api/csrf', { credentials: 'include' })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error('Failed to fetch CSRF token');
          }
          const data = await response.json();
          return typeof data?.token === 'string' ? data.token : '';
        })
        .then((token) => {
          cachedToken = token;
          inflight = null;
          return token;
        })
        .catch(() => {
          inflight = null;
          return '';
        });
    }
    return inflight;
  };
})();

const isWriteMethod = (method: string | undefined) => {
  if (!method) return false;
  const normalized = method.toUpperCase();
  return normalized === 'POST' || normalized === 'PUT' || normalized === 'PATCH' || normalized === 'DELETE';
};

const getRequestUrl = (input: FetchInput): string => {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
};

const isSameOrigin = (url: string): boolean => {
  if (url.startsWith('/')) return true;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
};

export function CsrfFetchProvider() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.__vfideFetchPatched) return;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: FetchInput, init?: FetchInit) => {
      const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
      const url = getRequestUrl(input);
      const sameOrigin = isSameOrigin(url);

      if (sameOrigin && isWriteMethod(method)) {
        const token = await getCsrfToken();
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));

        if (token && !headers.has('x-csrf-token')) {
          headers.set('x-csrf-token', token);
        }

        const nextInit: RequestInit = {
          ...init,
          headers,
          credentials: init?.credentials ?? 'include',
        };

        return originalFetch(input, nextInit);
      }

      return originalFetch(input, init);
    };

    window.__vfideFetchPatched = true;
  }, []);

  return null;
}
