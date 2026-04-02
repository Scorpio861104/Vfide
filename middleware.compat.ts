/**
 * Root middleware compatibility shim.
 *
 * The request security implementation lives in `proxy.ts` so CSP and CSRF
 * enforcement stay defined in one place.
 */
export { proxy as middleware, config } from './proxy';
