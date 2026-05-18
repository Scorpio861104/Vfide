import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
  }),
}))

jest.mock('@/lib/presence', () => ({
  useBulkPresence: () => new Map(),
}))

jest.mock('@/hooks/useTransactionSounds', () => ({
  useTransactionSounds: () => ({
    playSuccess: jest.fn(),
    playNotification: jest.fn(),
    playError: jest.fn(),
  }),
}))

jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}))

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: () => ({ children, ...props }: any) => <div {...props}>{children}</div>,
  }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>
  return new Proxy({}, { get: () => Icon })
})

describe('social storage safety', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  it('renders FriendRequestsPanel when storage access throws', async () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable')
    })

    try {
      const { FriendRequestsPanel } = await import('../../components/social/FriendRequestsPanel')
      render(<FriendRequestsPanel onAccept={jest.fn()} onReject={jest.fn()} />)
      expect(screen.getByText(/Friend Requests/i)).toBeTruthy()
    } finally {
      getItemSpy.mockRestore()
    }
  })

  it('renders PrivacySettings when storage access throws', async () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable')
    })

    try {
      const { PrivacySettings } = await import('../../components/social/PrivacySettings')
      render(<PrivacySettings />)
      expect(screen.getByText(/Privacy & Safety/i)).toBeTruthy()
    } finally {
      getItemSpy.mockRestore()
    }
  })

  it('renders FriendsList when storage access throws', async () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable')
    })

    try {
      const { FriendsList } = await import('../../components/social/FriendsList')
      render(<FriendsList onSelectFriend={jest.fn()} />)
      expect(screen.getByRole('heading', { name: /Friends/i })).toBeTruthy()
    } finally {
      getItemSpy.mockRestore()
    }
  })

  it('renders GroupsManager when storage access throws', async () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable')
    })

    try {
      const { GroupsManager } = await import('../../components/social/GroupsManager')
      render(<GroupsManager friends={[]} onSelectGroup={jest.fn()} />)
      expect(screen.getByRole('heading', { name: /Groups/i })).toBeTruthy()
    } finally {
      getItemSpy.mockRestore()
    }
  })
})
