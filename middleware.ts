import { NextRequest } from 'next/server';
import { config as proxyConfig, proxy } from './proxy';

export function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = proxyConfig;