import { logger } from '@/lib/logger';
import { type Address, createPublicClient, http, parseAbiItem, type Log } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { CONTRACT_ADDRESSES, ZERO_ADDRESS, isConfiguredContractAddress } from '@/lib/contracts';
import { query } from '@/lib/db';

const CHAIN = process.env.NEXT_PUBLIC_CHAIN_ID === '8453' ? base : baseSepolia;
const RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org';
const BATCH_SIZE = Number.parseInt(process.env.INDEXER_BATCH_SIZE || '2000', 10);
const INDEXER_CONFIRMATION_DEPTH = Number.parseInt(process.env.INDEXER_CONFIRMATION_DEPTH || '2', 10);
const INDEXER_REORG_REWIND_BLOCKS = Number.parseInt(process.env.INDEXER_REORG_REWIND_BLOCKS || '12', 10);

interface EventDef {
  contract: keyof typeof CONTRACT_ADDRESSES;
  address: Address;
  event: string;
  abi: string;
  handler: (log: Log, args: Record<string, unknown>) => Promise<void>;
}

function hasDatabaseConfig(): boolean {
  return Boolean(
    process.env.DATABASE_URL ||
    (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_DB === 'true')
  );
}

async function storeEvent(type: string, data: Record<string, unknown>): Promise<void> {
  if (!hasDatabaseConfig()) {
    return;
  }

  try {
    await query(
      `INSERT INTO indexed_events (event_type, data, tx_hash, block_number, indexed_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (tx_hash, event_type) DO NOTHING`,
      [
        type,
        JSON.stringify(data),
        (data.txHash as string | null | undefined) ?? null,
        Number(data.blockNumber ?? 0),
      ]
    );
  } catch (error) {
    logger.error(`[Indexer] Failed to store ${type} event:`, error);
  }
}

async function getLastIndexedBlock(): Promise<number> {
  if (!hasDatabaseConfig()) {
    return 0;
  }

  try {
    const stateResult = await query<{ value: string }>(
      `SELECT value FROM indexer_state WHERE key = 'last_block' LIMIT 1`
    );
    const stateValue = Number(stateResult.rows[0]?.value || 0);
    if (Number.isFinite(stateValue) && stateValue > 0) {
      return stateValue;
    }
  } catch {
    // Fall through to indexed_events fallback.
  }

  try {
    const eventsResult = await query<{ last_block: string | number | null }>(
      'SELECT MAX(block_number) AS last_block FROM indexed_events'
    );
    return Number(eventsResult.rows[0]?.last_block || 0);
  } catch {
    return 0;
  }
}

async function setLastIndexedBlock(block: number): Promise<void> {
  if (!hasDatabaseConfig()) {
    return;
  }

  try {
    await query(
      `INSERT INTO indexer_state (key, value, updated_at)
       VALUES ('last_block', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [block.toString()]
    );
  } catch (error) {
    logger.error('[Indexer] Failed to update last indexed block:', error);
  }
}

async function deleteIndexedEventsFromBlock(block: number): Promise<void> {
  if (!hasDatabaseConfig() || block <= 0) {
    return;
  }

  try {
    await query(
      'DELETE FROM indexed_events WHERE block_number >= $1',
      [block]
    );
  } catch (error) {
    logger.error('[Indexer] Failed to clear reorg window:', error);
  }
}

const INDEXED_EVENTS: EventDef[] = [
  {
    contract: 'VFIDEToken',
    address: CONTRACT_ADDRESSES.VFIDEToken,
    event: 'Transfer',
    abi: 'event Transfer(address indexed from, address indexed to, uint256 value)',
    handler: async (log, args) => {
      await storeEvent('transfer', {
        from: args.from as string,
        to: args.to as string,
        amount: (args.value as bigint).toString(),
        txHash: log.transactionHash,
        blockNumber: Number(log.blockNumber),
      });
    },
  },
  {
    contract: 'Seer',
    address: CONTRACT_ADDRESSES.Seer,
    event: 'ScoreUpdated',
    abi: 'event ScoreUpdated(address indexed subject, uint16 oldScore, uint16 newScore, address indexed by)',
    handler: async (log, args) => {
      await storeEvent('score_update', {
        subject: args.subject as string,
        oldScore: Number(args.oldScore),
        newScore: Number(args.newScore),
        by: args.by as string,
        txHash: log.transactionHash,
        blockNumber: Number(log.blockNumber),
      });
    },
  },
  {
    contract: 'SeerSocial',
    address: CONTRACT_ADDRESSES.SeerSocial,
    event: 'Endorsed',
    abi: 'event Endorsed(address indexed endorser, address indexed subject, string reason)',
    handler: async (log, args) => {
      await storeEvent('endorsement', {
        endorser: args.endorser as string,
        subject: args.subject as string,
        reason: args.reason as string,
        txHash: log.transactionHash,
        blockNumber: Number(log.blockNumber),
      });
    },
  },
  {
    contract: 'MerchantPortal',
    address: CONTRACT_ADDRESSES.MerchantPortal,
    event: 'PaymentProcessed',
    abi: 'event PaymentProcessed(address indexed customer, address indexed merchant, address token, uint256 amount, string orderId)',
    handler: async (log, args) => {
      await storeEvent('payment', {
        customer: args.customer as string,
        merchant: args.merchant as string,
        token: args.token as string,
        amount: (args.amount as bigint).toString(),
        orderId: args.orderId as string,
        txHash: log.transactionHash,
        blockNumber: Number(log.blockNumber),
      });
    },
  },
];

export async function pollEvents(): Promise<{ indexed: number; toBlock: number }> {
  if (!hasDatabaseConfig()) {
    return { indexed: 0, toBlock: 0 };
  }

  const client = createPublicClient({
    chain: CHAIN,
    transport: http(RPC_URL),
  });

  const currentBlock = Number(await client.getBlockNumber());
  const confirmedHead = currentBlock - INDEXER_CONFIRMATION_DEPTH;
  if (confirmedHead <= 0) {
    return { indexed: 0, toBlock: 0 };
  }

  const lastBlock = await getLastIndexedBlock();
  const rewindFrom = lastBlock > 0
    ? Math.max(0, lastBlock + 1 - INDEXER_REORG_REWIND_BLOCKS)
    : Math.max(0, confirmedHead - 1000);
  const fromBlock = BigInt(rewindFrom);
  const toBlock = BigInt(Math.min(confirmedHead, rewindFrom + BATCH_SIZE));

  if (fromBlock > toBlock) {
    return { indexed: 0, toBlock: confirmedHead };
  }

  await deleteIndexedEventsFromBlock(Number(fromBlock));

  let totalIndexed = 0;

  for (const eventDef of INDEXED_EVENTS) {
    if (!isConfiguredContractAddress(eventDef.address)) {
      continue;
    }

    try {
      const logs = await client.getLogs({
        address: eventDef.address,
        event: parseAbiItem(eventDef.abi) as never,
        fromBlock,
        toBlock,
      }) as Array<Log & { args?: Record<string, unknown> }>;

      for (const log of logs) {
        const args: Record<string, unknown> = log.args ? { ...log.args } : {};
        await eventDef.handler(log, args);
        totalIndexed += 1;
      }
    } catch (error) {
      logger.error(`[Indexer] Error polling ${eventDef.contract}.${eventDef.event}:`, error);
    }
  }

  await setLastIndexedBlock(Number(toBlock));
  return { indexed: totalIndexed, toBlock: Number(toBlock) };
}

export const INDEXER_MIGRATION = `
CREATE TABLE IF NOT EXISTS indexed_events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  block_number BIGINT NOT NULL,
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tx_hash, event_type)
);

CREATE INDEX IF NOT EXISTS idx_indexed_events_type ON indexed_events(event_type);
CREATE INDEX IF NOT EXISTS idx_indexed_events_block ON indexed_events(block_number);

CREATE TABLE IF NOT EXISTS indexer_state (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;
