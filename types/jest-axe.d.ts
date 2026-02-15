declare module 'jest-axe' {
  export const axe: (...args: unknown[]) => Promise<unknown>
  export const toHaveNoViolations: unknown
}
