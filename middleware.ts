// This file re-exports the security middleware from proxy.ts.
// proxy.ts is the single source of truth for CSP, CSRF, request-size enforcement,
// and content-type validation. Keeping the logic there (rather than here) keeps
// the file at a manageable size and lets the validate-deployment check confirm
// the delegation pattern is intact.
export { proxy as middleware, config } from './proxy';
