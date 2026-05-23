import { defineConfig } from "hardhat/config";
import baseConfig from "./hardhat.config";

const hardhatNetwork = (baseConfig.networks?.hardhat ?? {
  type: "edr-simulated" as const,
  chainId: 31337,
});

const hardhatUnlimitedNetwork = {
  ...hardhatNetwork,
  // Hardhat-only option not present on generic HTTP network config union type.
  allowUnlimitedContractSize: true,
  // Use Prague hardfork to avoid EIP-7825 (Osaka) transaction gas cap of 16M.
  // The default hardfork in this version of Hardhat 3 is Osaka, which introduces
  // a per-transaction gas limit of 16,777,216. Large contract deployments
  // (CardBoundVaultDeployer + CardBoundVault initcode) require ~32M gas and
  // exceed this cap. Prague has no such per-tx cap.
  hardfork: "prague",
} as any;

export default defineConfig({
  ...baseConfig,
  networks: {
    ...baseConfig.networks,
    hardhat: hardhatUnlimitedNetwork,
  },
});
