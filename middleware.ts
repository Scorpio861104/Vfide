import { proxy, config } from './proxy';
import type { NextRequest } from 'next/server';

// Next.js executes this root middleware entrypoint; delegate to the hardened proxy implementation.
export function middleware(request: NextRequest) {
  return proxy(request);
}

export { config };
