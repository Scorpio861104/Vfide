# Badge Artwork And Metadata Deployment

This completes the badge NFT presentation layer with generated SVG artwork and dynamic metadata.

## What Is Included

1. Artwork generator script: [scripts/generate-badge-artwork.ts](scripts/generate-badge-artwork.ts)
2. NFT metadata endpoint matching tokenURI contract format: [app/api/badges/metadata/[badge]/[tokenId]/route.ts](app/api/badges/metadata/[badge]/[tokenId]/route.ts)
3. Badge helpers for slug/path lookup: [lib/badge-registry.ts](lib/badge-registry.ts)

## Generate Badge Artwork

```bash
npm run badges:art:generate
```

This creates:
1. `public/badges/art/<badge_name_lowercase>.svg` for all 28 badges
2. `public/badges/art-manifest.json`

## Token Metadata URL Pattern

`VFIDEBadgeNFT.tokenURI(tokenId)` builds:

`<baseURI><badge_path>/<tokenId>.json`

Where badge path is lowercased badge key (example: `ACTIVE_TRADER` -> `active_trader`).

The implemented metadata API route serves this format at:

`/api/badges/metadata/<badge_path>/<tokenId>.json`

## Set On-Chain Base URI

Set `baseURI` in `VFIDEBadgeNFT` to:

`https://<your-domain>/api/badges/metadata/`

Trailing slash is required.

### One-command update script

Dry-run first (recommended):

```bash
export RPC_URL=<RPC_URL>
export NEXT_PUBLIC_BADGE_NFT_ADDRESS=<BADGE_NFT_ADDRESS>
npm run badges:set-base-uri:dry-run -- --base-uri https://<your-domain>/api/badges/metadata/
```

Apply on-chain update:

```bash
export RPC_URL=<RPC_URL>
export PRIVATE_KEY=<OWNER_PRIVATE_KEY>
export NEXT_PUBLIC_BADGE_NFT_ADDRESS=<BADGE_NFT_ADDRESS>
npm run badges:set-base-uri -- --base-uri https://<your-domain>/api/badges/metadata/
```

Direct args are also supported:

```bash
npm run badges:set-base-uri -- --rpc-url <RPC_URL> --badge-nft <BADGE_NFT_ADDRESS> --base-uri https://<your-domain>/api/badges/metadata/ --private-key <OWNER_PRIVATE_KEY>
```

## Quick Validation

After deployment and base URI update:

1. Open `https://<your-domain>/badges/art/active_trader.svg`
2. Open `https://<your-domain>/api/badges/metadata/active_trader/1.json`
3. Query `tokenURI(1)` on the BadgeNFT contract and confirm it resolves to JSON.

## Notes

1. Artwork is deterministic and generated from category + rarity themes.
2. Metadata is dynamic by token ID and includes badge attributes and image URL.
3. This keeps storage lightweight while preserving unique token naming (`BadgeName #tokenId`).