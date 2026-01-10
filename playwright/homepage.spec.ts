import { test, expect } from '@playwright/test'

test.describe('E2E Smoke', () => {
  test('health endpoint responds', async ({ request, baseURL }) => {
    const response = await request.get(`${baseURL}/api/health`)
    expect(response.ok()).toBe(true)

    const body = (await response.json()) as { ok?: boolean }
    expect(body.ok).toBe(true)
  })
})
