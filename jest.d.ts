import '@testing-library/jest-dom'

declare module 'jest-axe' {
  export const axe: any
  export const toHaveNoViolations: any
}

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveClass(className: string): R
      toHaveAttribute(attr: string, value?: string): R
      toHaveTextContent(text: string | RegExp): R
      toBeDisabled(): R
      toBeEnabled(): R
      toBeVisible(): R
      toContainElement(element: HTMLElement | null): R
      toHaveValue(value: string | number | string[]): R
      toBeChecked(): R
      toHaveFocus(): R
      toHaveStyle(css: Record<string, unknown> | string): R
    }
  }
}
