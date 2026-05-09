/**
 * XCHAIN-4 FIX: chain-aware CardBoundVault address prediction.
 *
 * Background:
 *   Standard EVM CREATE2:
 *     address = keccak256(0xff || deployer || salt || keccak256(initCode))[12:]
 *   zkSync Era CREATE2:
 *     address = keccak256(zksyncCreate2Prefix || deployer || salt
 *               || bytecodeHash || keccak256(constructorInputs))[12:]
 *     where zksyncCreate2Prefix = keccak256("zksyncCreate2")
 *     and bytecodeHash is the EraVM artifact from zksolc.
 *
 * The zksolc-produced bytecodeHash is NOT keccak256 of creation code —
 * it's a 32-byte artifact with a specific structure (version || length
 * || hash) that's only available from compilation output.
 *
 * Therefore the on-chain `CardBoundVaultDeployer.predict()` cannot
 * compute zkSync addresses (the artifact isn't reachable from inside
 * Solidity). We do it off-chain instead, using:
 *   - The bytecodeHash captured at deployment time (see deploy script)
 *   - The salt (computed identically to on-chain logic)
 *   - The constructor inputs (encoded identically to deploy time)
 *
 * Usage:
 *   import { predictVaultAddress } from '@/lib/crypto/zkSyncAddress';
 *   const predicted = await predictVaultAddress({
 *     chainId,
 *     deployerAddress,
 *     hub, vfideToken, owner_, guardians, threshold, maxPerTransfer, dailyLimit, ledger,
 *   });
 *
 * The function detects the chain and routes:
 *   - chainId 8453 / 84532 / 137 / 80002 / 1 / etc. → standard EVM CREATE2
 *   - chainId 324 / 300 → zkSync formula
 *
 * For zkSync we read the bytecode hash from a pre-deployed
 * `bytecode-hashes.json` artifact that the deploy script writes after
 * `npx hardhat deploy --network zkSync*` completes.
 */

import { keccak256, encodePacked, encodeAbiParameters, parseAbiParameters, type Address } from 'viem';

interface PredictArgs {
  chainId: number;
  deployerAddress: Address;
  hub: Address;
  vfideToken: Address;
  owner_: Address;
  guardianThreshold: number;
  maxPerTransfer: bigint;
  dailyLimit: bigint;
  ledger: Address;
}

const ZKSYNC_CHAIN_IDS = new Set([324, 300]);
const ZKSYNC_CREATE2_PREFIX = keccak256(new TextEncoder().encode('zksyncCreate2'));

/**
 * Compute the salt the same way `CardBoundVaultDeployer._salt`
 * computes it. Must remain in sync with the contract's _salt
 * implementation — if the contract changes, change this.
 */
function computeSalt(args: PredictArgs): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters('address, address, address, uint256, uint256, address'),
      [args.owner_, args.hub, args.vfideToken, args.maxPerTransfer, args.dailyLimit, args.ledger],
    ),
  );
}

/**
 * Standard EVM CREATE2 prediction. This matches the on-chain
 * `CardBoundVaultDeployer.predict()` formula exactly.
 *
 * Caller must supply the keccak256 of the creation code (initCode +
 * constructor args). For Base/Polygon/etc. this is what the contract
 * computes via `keccak256(_creationCode(...))`. We accept it as a
 * parameter so the caller can pass either:
 *   (a) The actual computed creation-code hash if it has access to
 *       artifacts (typical from a hardhat-driven script), OR
 *   (b) A snapshot hash captured at deploy time and stored in env
 *       (typical from a frontend that doesn't ship the bytecode).
 */
export function predictEvmCreate2(
  deployer: Address,
  salt: `0x${string}`,
  creationCodeHash: `0x${string}`,
): Address {
  const packed = encodePacked(
    ['bytes1', 'address', 'bytes32', 'bytes32'],
    ['0xff', deployer, salt, creationCodeHash],
  );
  const hash = keccak256(packed);
  // Address is the lower 20 bytes of the 32-byte hash
  return `0x${hash.slice(26)}` as Address;
}

/**
 * zkSync Era CREATE2 prediction.
 *
 * The bytecodeHash and constructorInputHash are passed in because
 * neither is reachable from Solidity at runtime — they are
 * compile-time / deploy-time artifacts.
 *
 * See: https://docs.zksync.io/build/developer-reference/ethereum-differences/contract-deployment
 */
export function predictZkSyncCreate2(
  deployer: Address,
  salt: `0x${string}`,
  bytecodeHash: `0x${string}`,
  constructorInputs: `0x${string}`,
): Address {
  const constructorInputsHash = keccak256(constructorInputs);
  const packed = encodePacked(
    ['bytes32', 'address', 'bytes32', 'bytes32', 'bytes32'],
    [ZKSYNC_CREATE2_PREFIX, deployer, salt, bytecodeHash, constructorInputsHash],
  );
  const hash = keccak256(packed);
  return `0x${hash.slice(26)}` as Address;
}

/**
 * Convenience entry point. Routes to the correct formula based on
 * chain ID. For zkSync, requires the caller to supply the bytecode
 * hash + constructor inputs separately because they aren't derivable
 * from on-chain state.
 *
 * For standard EVM, requires the creation-code hash. The caller
 * typically captures this from the deploy artifact and stores it as
 * `NEXT_PUBLIC_VAULT_INIT_CODE_HASH_<chainId>` in the frontend env.
 */
export function predictVaultAddress(
  args: PredictArgs & {
    creationCodeHash?: `0x${string}`;
    bytecodeHash?: `0x${string}`;
    constructorInputs?: `0x${string}`;
  },
): Address {
  const salt = computeSalt(args);

  if (ZKSYNC_CHAIN_IDS.has(args.chainId)) {
    if (!args.bytecodeHash || !args.constructorInputs) {
      throw new Error(
        'predictVaultAddress: zkSync chain requires bytecodeHash and constructorInputs. ' +
          'These come from the zkSync deployment artifact (bytecode-hashes.json) — see XCHAIN-4 docs.',
      );
    }
    return predictZkSyncCreate2(args.deployerAddress, salt, args.bytecodeHash, args.constructorInputs);
  }

  if (!args.creationCodeHash) {
    throw new Error(
      'predictVaultAddress: standard EVM chain requires creationCodeHash. ' +
        'Capture this at deploy time and store as NEXT_PUBLIC_VAULT_INIT_CODE_HASH_<chainId>.',
    );
  }
  return predictEvmCreate2(args.deployerAddress, salt, args.creationCodeHash);
}

/**
 * Helper: encode constructor inputs for `CardBoundVault` matching
 * the contract's constructor signature. Use this to build the
 * `constructorInputs` parameter for the zkSync prediction path.
 */
export function encodeCardBoundVaultConstructorInputs(args: {
  hub: Address;
  vfideToken: Address;
  owner_: Address;
  ownerKey: Address;
  guardians: Address[];
  guardianThreshold: number;
  maxPerTransfer: bigint;
  dailyLimit: bigint;
  ledger: Address;
}): `0x${string}` {
  return encodeAbiParameters(
    parseAbiParameters(
      'address, address, address, address, address[], uint8, uint256, uint256, address',
    ),
    [
      args.hub,
      args.vfideToken,
      args.owner_,
      args.ownerKey,
      args.guardians,
      args.guardianThreshold,
      args.maxPerTransfer,
      args.dailyLimit,
      args.ledger,
    ],
  );
}
