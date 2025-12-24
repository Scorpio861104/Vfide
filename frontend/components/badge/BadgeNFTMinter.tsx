'use client'

import { useState } from 'react'
import { BadgeDisplay } from './BadgeDisplay'
import { useMintBadge, useCanMintBadge, useBadgeNFTs } from '@/lib/vfide-hooks'
import { getBadgeById } from '@/lib/badge-registry'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { devLog } from '@/lib/utils'

export interface BadgeNFTMinterProps {
  badgeId: `0x${string}`
  onSuccess?: () => void
}

export function BadgeNFTMinter({ badgeId, onSuccess }: BadgeNFTMinterProps) {
  const badge = getBadgeById(badgeId)
  const { canMint, reason, isLoading: checkingEligibility } = useCanMintBadge(badgeId)
  const { mintBadge, isMinting, isSuccess, txHash } = useMintBadge()
  const { refetch: refetchNFTs } = useBadgeNFTs()
  const { showToast } = useToast()
  
  const [showSuccess, setShowSuccess] = useState(false)
  
  if (!badge) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Badge not found</AlertDescription>
      </Alert>
    )
  }
  
  const handleMint = async () => {
    if (!canMint) return
    
    try {
      await mintBadge(badgeId)
      setShowSuccess(true)
      await refetchNFTs()
      showToast("Badge NFT minted successfully!", "success")
      onSuccess?.()
    } catch (error) {
      devLog.error('Failed to mint badge:', error)
      const errorMessage = error instanceof Error ? error.message : 'Transaction failed'
      showToast(`Failed to mint badge: ${errorMessage}`, "error")
    }
  }
  
  if (isSuccess || showSuccess) {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardHeader>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <CardTitle>Badge NFT Minted!</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <BadgeDisplay badgeId={badgeId} size="lg" showPoints showDescription />
          
          {txHash && (
            <a
              href={`https://explorer.zksync.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 text-sm text-primary hover:underline"
            >
              View transaction →
            </a>
          )}
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mint Badge NFT</CardTitle>
        <CardDescription>
          Convert your earned badge into a soulbound NFT
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <BadgeDisplay badgeId={badgeId} size="lg" showPoints showDescription />
        </div>
        
        {checkingEligibility ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : canMint ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              You&apos;re eligible to mint this badge as an NFT!
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{reason || 'You cannot mint this badge'}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Type:</span>
            <span className="font-medium">Soulbound NFT (ERC-721)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Transferable:</span>
            <span className="font-medium">No (can only burn)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Cost:</span>
            <span className="font-medium">Gas only</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button
          onClick={handleMint}
          disabled={!canMint || isMinting || checkingEligibility}
          className="w-full"
          size="lg"
        >
          {isMinting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Minting...
            </>
          ) : (
            'Mint Badge NFT'
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
