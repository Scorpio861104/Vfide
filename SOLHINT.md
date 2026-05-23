# Solhint Configuration Rationale

This document explains why specific `solhint:recommended` rules are disabled in `.solhint.json`. Each grouping documents an architectural or backwards-compatibility constraint that makes blanket auto-fixing inappropriate for this codebase.

## ABI-affecting style rules (disabled)

The following rules would require renaming public Solidity symbols. Any rename of a contract, interface, public state variable, or external function changes the on-chain ABI, breaking every external integration (the dApp frontend, off-chain indexers, partner contracts, audit tooling). The project deliberately uses these patterns:

- **`func-name-mixedcase`** — The owner / governance surface uses `category_action()` naming (`governance_setDelay`, `vault_setRule`, `multisig_propose`) so that block explorers and the admin UI can group calls by namespace. Renaming would lose that grouping and break every external caller.
- **`var-name-mixedcase`** — Public state variables generate ABI getters at the same name. Renaming changes the getter selector.
- **`const-name-snakecase`** — Same: public constants generate getters.
- **`immutable-vars-naming`** — Same: public immutables generate getters.
- **`contract-name-capwords`** — The `VFIDE*` family (`VFIDEBridge`, `VFIDEToken`, `VFIDETermLoan`) deliberately preserves the protocol acronym in caps. Renaming breaks every importer and changes contract bytecode hashes used by deployment / verification scripts.
- **`event-name-capwords`** — Same: events are part of the ABI.
- **`interface-starts-with-i`** — `AggregatorV3Interface` is the canonical Chainlink price-feed interface name. Renaming it would diverge from the upstream Chainlink convention that every Solidity engineer recognises.

## Behavior / boundary rules (disabled)

These rules would silently change the protocol's runtime behavior or developer / user experience:

- **`gas-custom-errors`** — Replacing `require(cond, "msg")` with `revert CustomError()` saves a small amount of gas but eliminates human-readable revert strings. The project values clear errors for users and developers tracing reverts in block explorers.
- **`gas-indexed-events`** — Adding `indexed` to event parameters changes the topic layout, breaking every off-chain indexer (subgraph, custom listeners, partner integrations) that filters by topic.
- **`gas-strict-inequalities`** — Suggests turning `<=` into `<`. These are deliberate inclusive boundaries (e.g. `if (block.timestamp <= deadline)`); changing them is a semantic boundary change.
- **`gas-small-strings`** — Wants every string literal under 32 bytes. Most of the relevant strings are revert messages where clarity is more valuable than gas.
- **`gas-struct-packing`** — Would reorder struct fields. **DANGEROUS:** field order is part of the storage layout. Reordering silently breaks upgrade compatibility and any external indexer reading slot layouts.
- **`gas-increment-by-one`** — Wave 1 cleared 411 of 433 instances safely. The remaining 22 use the post-increment **value** (`id = nextLoanId++`) where `++x` would change semantics.
- **`gas-calldata-parameters`** — Wants every memory parameter changed to calldata. Many of the flagged parameters are then passed to internal functions that themselves need memory.
- **`reason-string`** — Caps revert messages at 32 characters. Cuts useful diagnostic text.

## Idiomatic empty blocks (disabled)

- **`no-empty-blocks`** — Empty `try { ... } catch { ... }` bodies are an idiomatic Solidity pattern for "best-effort" external integration (e.g. `try seer.recordEvent(...) {} catch {}`). Empty no-op stubs in legacy / mock files are intentional placeholders. The rule produces only false positives on this codebase.

## Architectural-refactor rules (disabled)

- **`function-max-lines`** — Splitting large functions is a multi-week design effort, not a lint-driven cleanup. Tracked as technical debt elsewhere.
- **`max-states-count`** — Same: reducing state-variable counts in core contracts (Token, VaultHub) requires architectural redesign.
- **`one-contract-per-file`** — `SharedInterfaces.sol` deliberately bundles small interfaces and helper libraries to minimise import noise across 80+ contracts.
- **`no-complex-fallback`** — A single intentional fallback for the bridge.

## Tooling / convention rules (disabled)

- **`no-inline-assembly`** — Inline assembly is used intentionally in cryptographic primitives, EIP-712 domain-separator caching, and gas-critical paths. Each occurrence is comment-tagged with rationale.
- **`use-forbidden-name`** — Single-letter loop indices (`i`, `j`) are universal Solidity convention.

## Inline disables

The remaining `avoid-low-level-calls` flags (in SafeERC20-style helpers and `AdminMultiSig.executeProposal`) are addressed with inline `// solhint-disable-next-line avoid-low-level-calls` comments. Each is a deliberate `address.call()` to support non-standard ERC-20s (USDT) or to pass through a governance-approved arbitrary call. The rule remains `warn` (not `off`) so any *new* low-level call is flagged for review.
