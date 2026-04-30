import { middleware, config } from './middleware';

// Backward-compat entrypoint for legacy tests/tools that still import `proxy`.
export const proxy = middleware;
export { config };
