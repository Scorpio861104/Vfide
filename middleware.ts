/**
 * Root Next.js middleware entrypoint.
 *
 * Security middleware logic lives in proxy.ts so CSP, CSRF, request-size
 * controls, and CORS policy remain centralized.
 */
export { proxy as middleware, config } from './proxy';
