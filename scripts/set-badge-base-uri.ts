import { createPublicClient, createWalletClient, encodeFunctionData, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { VFIDEBadgeNFTABI } from '../lib/abis'

type Address = `0x${string}`

type Hex = `0x${string}`

function getArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  if (i === -1) return undefined
  return process.argv[i + 1]
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function requireAddress(value: string | undefined, name: string): Address {
  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`Missing or invalid ${name}.`)
  }
  return value as Address
}

function requirePrivateKey(value: string): `0x${string}` {
  const normalized = value.startsWith('0x') ? value : `0x${value}`
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error('Invalid PRIVATE_KEY format. Expected 32-byte hex string.')
  }
  return normalized as `0x${string}`
}

function ensureBaseUri(value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    throw new Error('Missing --base-uri (or BADGE_BASE_URI environment variable).')
  }
  const normalized = value.trim()
  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error('Base URI must start with http:// or https://')
  }
  return normalized.endsWith('/') ? normalized : `${normalized}/`
}

async function main(): Promise<void> {
  const rpcUrl = getArg('--rpc-url') || process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL
  if (!rpcUrl) throw new Error('Set RPC_URL or pass --rpc-url <url>.')

  const badgeNft = requireAddress(
    getArg('--badge-nft') || process.env.BADGE_NFT_ADDRESS || process.env.NEXT_PUBLIC_BADGE_NFT_ADDRESS,
    'BADGE_NFT_ADDRESS / --badge-nft'
  )

  const baseUri = ensureBaseUri(
    getArg('--base-uri') || process.env.BADGE_BASE_URI
  )

  const privateKey = getArg('--private-key') || process.env.PRIVATE_KEY
  const dryRun = hasFlag('--dry-run')

  const callData = encodeFunctionData({
    abi: VFIDEBadgeNFTABI,
    functionName: 'setBaseURI',
    args: [baseUri],
  })

  console.log('=== VFIDE Badge Base URI Update ===')
  console.log(`Contract: ${badgeNft}`)
  console.log(`Base URI: ${baseUri}`)

  if (dryRun) {
    console.log('Mode: DRY-RUN (no transaction will be sent)')
    console.log(`to:   ${badgeNft}`)
    console.log(`data: ${callData}`)
    return
  }

  if (!privateKey) {
    throw new Error('Missing PRIVATE_KEY (or --private-key). Use --dry-run to preview without signing.')
  }

  const account = privateKeyToAccount(requirePrivateKey(privateKey))
  const publicClient = createPublicClient({ transport: http(rpcUrl) })
  const walletClient = createWalletClient({ account, transport: http(rpcUrl) })

  // Simulate first so owner/arg errors surface before sending.
  await publicClient.simulateContract({
    account,
    address: badgeNft,
    abi: VFIDEBadgeNFTABI,
    functionName: 'setBaseURI',
    args: [baseUri],
  })

  const hash = await walletClient.writeContract({
    account,
    address: badgeNft,
    abi: VFIDEBadgeNFTABI,
    functionName: 'setBaseURI',
    args: [baseUri],
  } as any)

  console.log(`Submitted: ${hash}`)
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log(`Confirmed in block ${receipt.blockNumber}`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
