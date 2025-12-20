#!/usr/bin/env node
/*
 Differential scenario capture:
 - Deploy TestVestingVault (with withdraw)
 - Deploy VFIDEToken pointing to that vault (other args zero)
 - From vault, withdraw a small token amount to deployer
 - Record balances before/after and key metadata
 Writes: diff-out/<network>-scenario.json
*/

const fs = require('fs');
const path = require('path');

async function main() {
  const hre = require('hardhat');
  const netName = hre.network.name;
  const isZk = hre.network.config && hre.network.config.zksync === true;

  const outDir = path.join(process.cwd(), 'diff-out');
  fs.mkdirSync(outDir, { recursive: true });

  let deployerAddr;
  let vaultAddr;
  let tokenAddr;

  if (isZk) {
    const { Deployer } = require('@matterlabs/hardhat-zksync-deploy');
    const { Wallet } = require('zksync-ethers');
    const pk = process.env.PRIVATE_KEY;
    if (!pk) throw new Error('PRIVATE_KEY is required for zkSync scenario');
    const wallet = new Wallet(pk);
    const deployer = new Deployer(hre, wallet);
    deployerAddr = await wallet.getAddress();

    const vaultArtifact = await deployer.loadArtifact('TestVestingVault');
    const vault = await deployer.deploy(vaultArtifact, []);
    await vault.waitForDeployment();
    vaultAddr = await vault.getAddress();

    const tokenArtifact = await deployer.loadArtifact('VFIDEToken');
    const zero = hre.ethers.ZeroAddress;
    const token = await deployer.deploy(tokenArtifact, [vaultAddr, zero, zero, zero]);
    await token.waitForDeployment();
    tokenAddr = await token.getAddress();

    // Withdraw a small amount from the vault to deployer
    const tokenC = await hre.ethers.getContractAt('VFIDEToken', tokenAddr);
    const decimals = Number(await tokenC.decimals());
    const amount = BigInt(10) ** BigInt(Math.max(0, Math.min(18, decimals - 2)));
    const beforeDeployer = (await tokenC.balanceOf(deployerAddr)).toString();
    const beforeVault = (await tokenC.balanceOf(vaultAddr)).toString();

    const vaultC = await hre.ethers.getContractAt('TestVestingVault', vaultAddr);
    const tx = await vaultC.withdraw(tokenAddr, deployerAddr, amount);
    await tx.wait();

    const afterDeployer = (await tokenC.balanceOf(deployerAddr)).toString();
    const afterVault = (await tokenC.balanceOf(vaultAddr)).toString();

    writeOut(outDir, netName, {
      network: netName,
      token: tokenAddr,
      vault: vaultAddr,
      deployer: deployerAddr,
      decimals,
      moved: amount.toString(),
      before: { deployer: beforeDeployer, vault: beforeVault },
      after: { deployer: afterDeployer, vault: afterVault }
    });
  } else {
    const [signer] = await hre.ethers.getSigners();
    deployerAddr = await signer.getAddress();
    const Vault = await hre.ethers.getContractFactory('TestVestingVault');
    const vault = await Vault.deploy();
    await vault.deployed?.();
    vaultAddr = (await vault.getAddress?.()) || vault.address;

    const Token = await hre.ethers.getContractFactory('VFIDEToken');
    const zero = hre.ethers.ZeroAddress;
    const token = await Token.deploy(vaultAddr, zero, zero, zero);
    await token.deployed?.();
    tokenAddr = (await token.getAddress?.()) || token.address;

    const decimals = Number(await token.decimals());
    const amount = BigInt(10) ** BigInt(Math.max(0, Math.min(18, decimals - 2)));
    const beforeDeployer = (await token.balanceOf(deployerAddr)).toString();
    const beforeVault = (await token.balanceOf(vaultAddr)).toString();

    const vaultC = await hre.ethers.getContractAt('TestVestingVault', vaultAddr);
    const tx = await vaultC.withdraw(tokenAddr, deployerAddr, amount);
    await tx.wait?.();

    const afterDeployer = (await token.balanceOf(deployerAddr)).toString();
    const afterVault = (await token.balanceOf(vaultAddr)).toString();

    writeOut(outDir, netName, {
      network: netName,
      token: tokenAddr,
      vault: vaultAddr,
      deployer: deployerAddr,
      decimals,
      moved: amount.toString(),
      before: { deployer: beforeDeployer, vault: beforeVault },
      after: { deployer: afterDeployer, vault: afterVault }
    });
  }
}

function writeOut(outDir, net, obj) {
  const fp = path.join(outDir, `${net}-scenario.json`);
  fs.writeFileSync(fp, JSON.stringify(obj, null, 2));
  console.log(`[diff-scenario] wrote ${fp}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
