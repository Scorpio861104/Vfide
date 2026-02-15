const CSRF_HEADER_NAME = 'x-csrf-token';

let cachedToken: string | null = null;
let inflight: Promise<string> | null = null;

const isWriteMethod = (method?: string): boolean => {
  if (!method) return false;
  const normalized = method.toUpperCase();
  return normalized === 'POST' || normalized === 'PUT' || normalized === 'PATCH' || normalized === 'DELETE';
};

export async function getCsrfToken(): Promise<string> {
  if (typeof window === 'undefined') return '';
  if (cachedToken) return cachedToken;
  if (!inflight) {
    inflight = fetch('/api/csrf', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) return '';
        // VULN-01 Fix: Read token from response header, not JSON body
        const headerToken = response.headers.get('X-CSRF-Token');
        return headerToken ?? '';
      })
      .then((token) => {
        cachedToken = token || null;
        inflight = null;
        return token;
      })
      .catch(() => {
        inflight = null;
        return '';
      });
  }

  return inflight;
}

export async function buildCsrfHeaders(
  headers?: HeadersInit,
  method?: string
): Promise<HeadersInit> {
  if (!isWriteMethod(method)) {
    return headers ?? {};
  }

  const token = await getCsrfToken();
  const nextHeaders = new Headers(headers ?? undefined);

  if (token && !nextHeaders.has(CSRF_HEADER_NAME)) {
    nextHeaders.set(CSRF_HEADER_NAME, token);
  }

  return nextHeaders;
}
