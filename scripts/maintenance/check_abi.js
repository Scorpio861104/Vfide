const hre = require("hardhat");

async function main() {
  const artifact = await hre.artifacts.readArtifact("contracts-min/VFIDECommerce.sol:MerchantRegistry");
  const constructor = artifact.abi.find(x => x.type === "constructor");
  console.log(JSON.stringify(constructor, null, 2));
}

main().catch(console.error);
