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
} as any;

export default defineConfig({
  ...baseConfig,
  networks: {
    ...baseConfig.networks,
    hardhat: hardhatUnlimitedNetwork,
  },
});