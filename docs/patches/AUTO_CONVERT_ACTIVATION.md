// ═══════════════════════════════════════════════════════════════════════════
// AUTO-CONVERT STATUS: ALREADY FIXED
// ═══════════════════════════════════════════════════════════════════════════
//
// The `require(!enabled)` guard has been replaced with proper swap config
// checks in a previous iteration. The current code (MerchantPortal.sol ~line 672):
//
//   function setAutoConvert(bool enabled) external onlyMerchant {
//     if (enabled) {
//       require(address(swapRouter) != address(0), "MP: swap router not configured");
//       require(stablecoin != address(0), "MP: stablecoin not configured");
//     }
//     autoConvert[msg.sender] = enabled;
//     emit AutoConvertSet(msg.sender, enabled);
//   }
//
// AUTO-CONVERT ACTIVATION STEPS (deployment time):
//
// 1. Deploy MerchantPortal to Base
// 2. Call setSwapConfig(uniswapV3Router, usdcAddress) — DAO-only
// 3. Set swap paths: setSwapPath(vfideToken, [vfide, WETH, USDC])
//    or direct pair if VFIDE/USDC pool exists
// 4. Set minSwapOutput(9500) — 5% max slippage protection
// 5. Now merchants can call setAutoConvert(true)
//
// The internal _transferToMerchant (line 858) handles the swap:
//   if (autoConvert[merchant] && token != stablecoin &&
//       address(swapRouter) != address(0) && stablecoin != address(0))
//     → executes Uniswap V3 exactInputSingle swap
//     → merchant receives USDC in their vault instead of VFIDE
//
// UNISWAP V3 ROUTER ADDRESSES:
// Base Mainnet: 0x2626664c2603336E57B271c5C0b26F421741e481
// Polygon:      0xE592427A0AEce92De3Edee1F18E0157C05861564
// zkSync Era:   0x99c56385dB8B202517b7cb8a1E1Ca2279a2e2AA2
//
// USDC ADDRESSES:
// Base Mainnet: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
// Polygon:      0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
//
// ═══════════════════════════════════════════════════════════════════════════
