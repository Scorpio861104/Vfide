#!/usr/bin/env node
/*
 Capture VFIDEToken baseline state for differential testing.
 - On EVM (hardhat): uses ethers signer
 - On zkSync: uses Deployer + zksync-ethers Wallet
 Writes JSON to diff-out/<network>.json
*/

const fs = require('fs');
const path = require('path');

async function main() {
  const hre = require('hardhat');
  const netName = hre.network.name;
  const isZk = hre.network.config && hre.network.config.zksync === true;

  // Ensure output dir
  const outDir = path.join(process.cwd(), 'diff-out');
  fs.mkdirSync(outDir, { recursive: true });

  let tokenAddr;
  let vaultAddr;
  let deployerAddr;

  if (isZk) {
    const { Deployer } = require('@matterlabs/hardhat-zksync-deploy');
    const { Wallet } = require('zksync-ethers');
    const pk = process.env.PRIVATE_KEY;
    if (!pk) throw new Error('PRIVATE_KEY is required for zkSync capture');
    const wallet = new Wallet(pk);
    const deployer = new Deployer(hre, wallet);
    deployerAddr = await wallet.getAddress();

    const vaultArtifact = await deployer.loadArtifact('VestingVault');
    const vault = await deployer.deploy(vaultArtifact, []);
    await vault.waitForDeployment();
    vaultAddr = await vault.getAddress();

    const tokenArtifact = await deployer.loadArtifact('VFIDEToken');
    const zero = hre.ethers.ZeroAddress;
    const token = await deployer.deploy(tokenArtifact, [vaultAddr, zero, zero, zero]);
    await token.waitForDeployment();
    tokenAddr = await token.getAddress();
  } else {
    const [signer] = await hre.ethers.getSigners();
    deployerAddr = await signer.getAddress();
    const Vault = await hre.ethers.getContractFactory('VestingVault');
    const vault = await Vault.deploy();
    await vault.deployed?.(); // ethers v5 pattern; harmless if v6
    vaultAddr = await vault.getAddress?.() || vault.address;

    const Token = await hre.ethers.getContractFactory('VFIDEToken');
    const zero = hre.ethers.ZeroAddress;
    const token = await Token.deploy(vaultAddr, zero, zero, zero);
    await token.deployed?.();
    tokenAddr = await token.getAddress?.() || token.address;
  }

  // Reattach via standard ethers interface to read state
  const token = await hre.ethers.getContractAt('VFIDEToken', tokenAddr);
  const name = await token.name();
  const symbol = await token.symbol();
  const decimals = Number(await token.decimals());
  const totalSupply = (await token.totalSupply()).toString();
  const devVaultBal = (await token.balanceOf(vaultAddr)).toString();
  const chainId = (await hre.ethers.provider.getNetwork()).chainId?.toString?.() || 'unknown';

  const result = {
    network: netName,
    chainId: chainId,
    deployer: deployerAddr,
    vestingVault: vaultAddr,
    token: tokenAddr,
    name,
    symbol,
    decimals,
    totalSupply,
    devVaultBalance: devVaultBal
  };

  const outPath = path.join(outDir, `${netName}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`[diff] wrote ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
