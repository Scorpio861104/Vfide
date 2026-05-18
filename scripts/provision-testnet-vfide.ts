import { readFileSync } from 'node:fs'
import { createPublicClient, createWalletClient, encodeFunctionData, formatUnits, http, isAddress, parseUnits, zeroAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

type Address = `0x${string}`

const TOKEN_ABI = [
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

const VAULT_HUB_ABI = [
  {
    name: 'vaultOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner_', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'ensureVault',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'owner_', type: 'address' }],
    outputs: [{ name: 'vault', type: 'address' }],
  },
] as const

function getArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  if (i === -1) return undefined
  return process.argv[i + 1]
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function requireAddress(value: string | undefined, label: string): Address {
  if (!value || !isAddress(value)) {
    throw new Error(`Missing or invalid ${label}.`)
  }
  return value as Address
}

function requirePrivateKey(value: string | undefined): `0x${string}` {
  if (!value || value.trim().length === 0) {
    throw new Error('Missing PRIVATE_KEY (or --private-key).')
  }
  const normalized = value.startsWith('0x') ? value : `0x${value}`
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error('Invalid PRIVATE_KEY format. Expected 32-byte hex string.')
  }
  return normalized as `0x${string}`
}

function parsePositiveInt(value: string | undefined, label: string): number {
  if (!value) {
    throw new Error(`Missing ${label}.`)
  }
  const n = Number(value)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    throw new Error(`${label} must be a positive integer.`)
  }
  return n
}

function uniqueAddresses(values: string[]): Address[] {
  const out: Address[] = []
  const seen = new Set<string>()
  for (const raw of values) {
    const addr = raw.trim()
    if (!addr) continue
    if (!isAddress(addr)) {
      throw new Error(`Invalid tester address: ${raw}`)
    }
    const lower = addr.toLowerCase()
    if (!seen.has(lower)) {
      seen.add(lower)
      out.push(addr as Address)
    }
  }
  return out
}

function loadTesterAddresses(): Address[] {
  const csv = getArg('--testers') || process.env.TESTER_ADDRESSES
  const file = getArg('--testers-file') || process.env.TESTER_ADDRESSES_FILE

  const collected: string[] = []

  if (csv) {
    collected.push(...csv.split(','))
  }

  if (file) {
    const content = readFileSync(file, 'utf8')
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
    collected.push(...lines)
  }

  const testers = uniqueAddresses(collected)
  if (testers.length === 0) {
    throw new Error('Provide tester addresses via --testers, TESTER_ADDRESSES, --testers-file, or TESTER_ADDRESSES_FILE.')
  }

  return testers
}

async function main(): Promise<void> {
  const rpcUrl = getArg('--rpc-url') || process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL
  if (!rpcUrl) {
    throw new Error('Set RPC_URL or pass --rpc-url <url>.')
  }

  const token = requireAddress(
    getArg('--token') || process.env.VFIDE_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS,
    'VFIDE_TOKEN_ADDRESS / --token'
  )

  const vaultHub = requireAddress(
    getArg('--vault-hub') || process.env.VAULT_HUB_ADDRESS || process.env.NEXT_PUBLIC_VAULT_HUB_ADDRESS,
    'VAULT_HUB_ADDRESS / --vault-hub'
  )

  const amountInput = getArg('--amount') || process.env.TESTER_VFIDE_AMOUNT || '10000'
  const amountDecimalsInput = getArg('--decimals') || process.env.TESTER_VFIDE_DECIMALS
  const maxCountInput = getArg('--max')
  const dryRun = hasFlag('--dry-run')
  const forceTransfer = hasFlag('--force-transfer')

  const privateKeyInput = getArg('--private-key') || process.env.PRIVATE_KEY
  const fromAddressInput = getArg('--from') || process.env.DISTRIBUTOR_ADDRESS

  let accountAddress: Address
  let walletClient: ReturnType<typeof createWalletClient> | undefined

  if (privateKeyInput) {
    const privateKey = requirePrivateKey(privateKeyInput)
    const account = privateKeyToAccount(privateKey)
    accountAddress = account.address
    walletClient = createWalletClient({ account, transport: http(rpcUrl) })
  } else {
    if (!dryRun) {
      throw new Error('Missing PRIVATE_KEY (or --private-key).')
    }
    accountAddress = requireAddress(fromAddressInput, '--from or DISTRIBUTOR_ADDRESS (required for dry-run without PRIVATE_KEY)')
  }

  const publicClient = createPublicClient({ transport: http(rpcUrl) })

  const testers = loadTesterAddresses()
  const maxCount = maxCountInput ? parsePositiveInt(maxCountInput, '--max') : undefined
  const selectedTesters = maxCount ? testers.slice(0, maxCount) : testers

  const chainId = await publicClient.getChainId()
  const tokenDecimals = amountDecimalsInput
    ? parsePositiveInt(amountDecimalsInput, '--decimals')
    : Number(await publicClient.readContract({
        address: token,
        abi: TOKEN_ABI,
        functionName: 'decimals',
      }))
  const targetAmount = parseUnits(amountInput, tokenDecimals)

  if (targetAmount <= 0n) {
    throw new Error('--amount must be greater than zero.')
  }

  const distributorBalance = await publicClient.readContract({
    address: token,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: [accountAddress],
  }) as bigint

  let distributorVault = await publicClient.readContract({
    address: vaultHub,
    abi: VAULT_HUB_ABI,
    functionName: 'vaultOf',
    args: [accountAddress],
  }) as Address

  console.log('=== VFIDE Testnet Tester Provisioning ===')
  console.log(`Chain ID: ${chainId}`)
  console.log(`Distributor: ${accountAddress}`)
  console.log(`VFIDE Token: ${token}`)
  console.log(`VaultHub: ${vaultHub}`)
  console.log(`Target tester balance: ${amountInput} VFIDE`)
  console.log(`Tester count selected: ${selectedTesters.length}`)
  console.log(`Distributor VFIDE balance: ${formatUnits(distributorBalance, tokenDecimals)}`)
  if (distributorVault === zeroAddress) {
    console.log('Distributor vault: missing (required for vault-only transfer mode)')
  } else {
    console.log(`Distributor vault: ${distributorVault}`)
  }
  if (dryRun) {
    console.log('Mode: DRY-RUN (no transactions will be sent)')
  }
  console.log('')

  if (distributorVault === zeroAddress) {
    if (dryRun) {
      const callData = encodeFunctionData({
        abi: VAULT_HUB_ABI,
        functionName: 'ensureVault',
          args: [accountAddress],
      })
      console.log('Distributor missing vault -> ensureVault call required before live distribution')
      console.log(`  to:   ${vaultHub}`)
      console.log(`  data: ${callData}`)
      console.log('')
    } else {
      if (!walletClient) {
        throw new Error('Wallet client missing. Provide PRIVATE_KEY for live mode.')
      }
      const hash = await walletClient.writeContract({
        account: accountAddress,
        address: vaultHub,
        abi: VAULT_HUB_ABI,
        functionName: 'ensureVault',
        args: [accountAddress],
      } as any)
      await publicClient.waitForTransactionReceipt({ hash })
      distributorVault = await publicClient.readContract({
        address: vaultHub,
        abi: VAULT_HUB_ABI,
        functionName: 'vaultOf',
        args: [accountAddress],
      }) as Address
      if (distributorVault === zeroAddress) {
        throw new Error('Distributor vault could not be created; aborting distribution.')
      }
      console.log(`Distributor vault created: ${distributorVault} (${hash})`)
      console.log('')
    }
  }

  let totalTopUp = 0n

  for (const tester of selectedTesters) {
    let vault = await publicClient.readContract({
      address: vaultHub,
      abi: VAULT_HUB_ABI,
      functionName: 'vaultOf',
      args: [tester],
    }) as Address

    if (vault === zeroAddress) {
      if (dryRun) {
        const callData = encodeFunctionData({
          abi: VAULT_HUB_ABI,
          functionName: 'ensureVault',
          args: [tester],
        })
        console.log(`[${tester}] missing vault -> will call ensureVault`)
        console.log(`  to:   ${vaultHub}`)
        console.log(`  data: ${callData}`)
        console.log(`  note: run live mode to create vault before funding this tester`)
        continue
      } else {
        if (!walletClient) {
          throw new Error('Wallet client missing. Provide PRIVATE_KEY for live mode.')
        }
        const hash = await walletClient.writeContract({
          account: accountAddress,
          address: vaultHub,
          abi: VAULT_HUB_ABI,
          functionName: 'ensureVault',
          args: [tester],
        } as any)
        await publicClient.waitForTransactionReceipt({ hash })
        console.log(`[${tester}] vault created (${hash})`)
      }

      vault = await publicClient.readContract({
        address: vaultHub,
        abi: VAULT_HUB_ABI,
        functionName: 'vaultOf',
        args: [tester],
      }) as Address

      if (vault === zeroAddress) {
        throw new Error(`Vault resolution failed for tester ${tester}.`)
      }
    }

    const currentBalance = await publicClient.readContract({
      address: token,
      abi: TOKEN_ABI,
      functionName: 'balanceOf',
      args: [vault],
    }) as bigint

    const topUp = forceTransfer
      ? targetAmount
      : (currentBalance >= targetAmount ? 0n : targetAmount - currentBalance)

    if (topUp === 0n) {
      console.log(`[${tester}] vault=${vault} already funded (${formatUnits(currentBalance, tokenDecimals)} VFIDE)`)
      continue
    }

    totalTopUp += topUp

    if (dryRun) {
      const transferData = encodeFunctionData({
        abi: TOKEN_ABI,
        functionName: 'transfer',
        args: [vault, topUp],
      })
      console.log(`[${tester}] vault=${vault} top-up=${formatUnits(topUp, tokenDecimals)} VFIDE`)
      console.log(`  to:   ${token}`)
      console.log(`  data: ${transferData}`)
    } else {
      if (!walletClient) {
        throw new Error('Wallet client missing. Provide PRIVATE_KEY for live mode.')
      }
      const hash = await walletClient.writeContract({
        account: accountAddress,
        address: token,
        abi: TOKEN_ABI,
        functionName: 'transfer',
        args: [vault, topUp],
      } as any)
      await publicClient.waitForTransactionReceipt({ hash })
      console.log(`[${tester}] funded vault=${vault} amount=${formatUnits(topUp, tokenDecimals)} VFIDE (${hash})`)
    }
  }

  console.log('')
  console.log(`Total planned top-up: ${formatUnits(totalTopUp, tokenDecimals)} VFIDE`)

  if (!dryRun && totalTopUp > distributorBalance) {
    console.log('Warning: total top-up exceeded the distributor starting balance; some transfers may have reverted.')
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})