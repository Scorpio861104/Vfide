import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

const mockWriteContractAsync = jest.fn()
const mockRefetchVfide = jest.fn(async () => ({ data: 0n }))
const mockRefetchStablecoin = jest.fn(async () => ({ data: 0n }))
const mockShowToast = jest.fn()

jest.mock('wagmi', () => ({
  useReadContract: jest.fn((params?: { functionName?: string; address?: string }) => {
    if (params?.functionName === 'dailyTransferLimit') {
      return { data: 123n }
    }
    if (params?.functionName === 'allowance' && params?.address === '0x1000000000000000000000000000000000000001') {
      return { data: 0n, refetch: mockRefetchVfide }
    }
    if (params?.functionName === 'allowance') {
      return { data: 0n, refetch: mockRefetchStablecoin }
    }
    return { data: undefined }
  }),
  useWriteContract: jest.fn(() => ({
    writeContractAsync: mockWriteContractAsync,
  })),
}))

jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}))

jest.mock('@/components/ui/GlassCard', () => ({
  GlassCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    MerchantPortal: '0x2000000000000000000000000000000000000002',
    VFIDEToken: '0x1000000000000000000000000000000000000001',
  },
  CARD_BOUND_VAULT_ABI: [],
  ERC20ABI: [],
  isConfiguredContractAddress: (address?: string | null) =>
    typeof address === 'string' && address.startsWith('0x') && address.length === 42,
}))

const loadMerchantApprovalPanel = () =>
  require('@/app/vault/components/MerchantApprovalPanel').MerchantApprovalPanel as React.ComponentType<{
    cardBoundMode: boolean;
    vaultAddress: `0x${string}` | null | undefined;
  }>

describe('MerchantApprovalPanel', () => {
  beforeEach(() => {
    mockWriteContractAsync.mockReset()
    mockRefetchVfide.mockClear()
    mockRefetchStablecoin.mockClear()
    mockShowToast.mockClear()
    mockWriteContractAsync.mockResolvedValue('0xabc123')
  })

  it('uses dailyTransferLimit amount for VFIDE approval', async () => {
    const MerchantApprovalPanel = loadMerchantApprovalPanel()
    render(
      <MerchantApprovalPanel
        cardBoundMode
        vaultAddress={'0x3000000000000000000000000000000000000003'}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Approve VFIDE/i }))

    await waitFor(() => {
      expect(mockWriteContractAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'approveVFIDE',
          args: ['0x2000000000000000000000000000000000000002', 123n],
        })
      )
    })
  })

  it('uses dailyTransferLimit amount for stablecoin approval', async () => {
    const MerchantApprovalPanel = loadMerchantApprovalPanel()
    render(
      <MerchantApprovalPanel
        cardBoundMode
        vaultAddress={'0x3000000000000000000000000000000000000003'}
      />
    )

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '0x4000000000000000000000000000000000000004' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Approve Stablecoin/i }))

    await waitFor(() => {
      expect(mockWriteContractAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'approveERC20',
          args: [
            '0x4000000000000000000000000000000000000004',
            '0x2000000000000000000000000000000000000002',
            123n,
          ],
        })
      )
    })
  })

  it('blocks approvals when dailyTransferLimit is zero', async () => {
    const { useReadContract } = await import('wagmi')
    const mockUseReadContract = useReadContract as unknown as jest.Mock

    mockUseReadContract.mockImplementation((params?: { functionName?: string; address?: string }) => {
      if (params?.functionName === 'dailyTransferLimit') {
        return { data: 0n }
      }
      if (params?.functionName === 'allowance' && params?.address === '0x1000000000000000000000000000000000000001') {
        return { data: 0n, refetch: mockRefetchVfide }
      }
      if (params?.functionName === 'allowance') {
        return { data: 0n, refetch: mockRefetchStablecoin }
      }
      return { data: undefined }
    })

    const MerchantApprovalPanel = loadMerchantApprovalPanel()
    render(
      <MerchantApprovalPanel
        cardBoundMode
        vaultAddress={'0x3000000000000000000000000000000000000003'}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Approve VFIDE/i }))

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Vault daily transfer limit not loaded. Please wait and retry.',
        'error'
      )
    })

    expect(mockWriteContractAsync).not.toHaveBeenCalled()
  })
})
