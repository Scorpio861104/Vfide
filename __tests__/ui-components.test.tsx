import { describe, it, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react'

// Simple smoke tests for UI components
describe('UI Components Smoke Tests', () => {
  describe('button component', () => {
    it('exports Button', async () => {
      const { Button } = await import('@/components/ui/button')
      expect(Button).toBeDefined()
    })
  })

  describe('card component', () => {
    it('exports Card components', async () => {
      const { Card, CardHeader, CardTitle, CardContent } = await import('@/components/ui/card')
      expect(Card).toBeDefined()
      expect(CardHeader).toBeDefined()
      expect(CardTitle).toBeDefined()
      expect(CardContent).toBeDefined()
    })
  })

  describe('alert component', () => {
    it('exports Alert components', async () => {
      const { Alert, AlertTitle, AlertDescription } = await import('@/components/ui/alert')
      expect(Alert).toBeDefined()
      expect(AlertTitle).toBeDefined()
      expect(AlertDescription).toBeDefined()
    })
  })

  describe('progress component', () => {
    it('exports Progress', async () => {
      const { Progress } = await import('@/components/ui/progress')
      expect(Progress).toBeDefined()
    })
  })

  describe('dialog component', () => {
    it('exports Dialog components', async () => {
      const { Dialog, DialogTrigger, DialogContent } = await import('@/components/ui/dialog')
      expect(Dialog).toBeDefined()
      expect(DialogTrigger).toBeDefined()
      expect(DialogContent).toBeDefined()
    })
  })

  describe('tabs component', () => {
    it('exports Tabs components', async () => {
      const { Tabs, TabsList, TabsTrigger, TabsContent } = await import('@/components/ui/tabs')
      expect(Tabs).toBeDefined()
      expect(TabsList).toBeDefined()
      expect(TabsTrigger).toBeDefined()
      expect(TabsContent).toBeDefined()
    })
  })
})
