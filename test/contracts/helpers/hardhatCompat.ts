import { network } from "hardhat";
import { MaxUint256, Wallet, ZeroAddress, hexlify, parseEther, toUtf8Bytes } from "ethers";

type ConnectedEthers = Awaited<ReturnType<typeof network.connect>>["ethers"];
type NetworkConnection = Awaited<ReturnType<typeof network.connect>>;

let connectionPromise: Promise<NetworkConnection> | null = null;

async function getConnection(): Promise<NetworkConnection> {
  if (!connectionPromise) {
    connectionPromise = network.connect();
  }
  return connectionPromise;
}

const artifactAliases: Record<string, string> = {
  MockERC20: "test/contracts/mocks/MockContracts.sol:MockERC20",
};

export type SignerWithAddress = Awaited<ReturnType<ConnectedEthers["getSigners"]>>[number] & {
  address: string;
};

async function withAddress<T extends { getAddress(): Promise<string> }>(signer: T): Promise<T & { address: string }> {
  const address = await signer.getAddress();
  return Object.assign(signer, { address });
}

function wrapContract<T extends object>(contract: T): T & { address: string; deployed(): Promise<T> } {
  let proxy: T & { address: string; deployed(): Promise<T> };

  proxy = new Proxy(contract as T, {
    get(target, prop, receiver) {
      if (prop === "address") {
        const deployedAddress = Reflect.get(target as object, "target", receiver);
        return typeof deployedAddress === "string" ? deployedAddress : undefined;
      }

      if (prop === "deployed") {
        return async () => {
          await (target as { waitForDeployment(): Promise<unknown> }).waitForDeployment();
          return proxy;
        };
      }

      if (prop === "connect") {
        return (signer: unknown) =>
          wrapContract((target as { connect(arg: unknown): T }).connect(signer));
      }

      const value = Reflect.get(target as object, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as T & { address: string; deployed(): Promise<T> };

  return proxy;
}

function wrapFactory<T extends object>(factory: T): T {
  return new Proxy(factory, {
    get(target, prop, receiver) {
      if (prop === "deploy") {
        return async (...args: unknown[]) =>
          wrapContract(await (target as { deploy(...deployArgs: unknown[]): Promise<object> }).deploy(...args));
      }

      const value = Reflect.get(target as object, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

export const ethers = {
  Wallet,
  constants: {
    AddressZero: ZeroAddress,
    MaxUint256,
  },
  provider: {
    async getBalance(address: string) {
      const { ethers: connectedEthers } = await getConnection();
      return connectedEthers.provider.getBalance(address);
    },
  },
  utils: {
    parseEther,
    hexlify,
    toUtf8Bytes,
  },
  async getSigners(): Promise<SignerWithAddress[]> {
    const { ethers: connectedEthers } = await getConnection();
    return Promise.all((await connectedEthers.getSigners()).map((signer) => withAddress(signer)));
  },
  async getContractFactory(name: string) {
    const { ethers: connectedEthers } = await getConnection();
    return wrapFactory(await connectedEthers.getContractFactory(artifactAliases[name] ?? name));
  },
};

export async function loadFixture<T>(fixture: () => Promise<T>): Promise<T> {
  const { networkHelpers } = await getConnection();
  return networkHelpers.loadFixture(fixture);
}

export const time = {
  async increase(seconds: number | bigint) {
    const { networkHelpers } = await getConnection();
    await networkHelpers.time.increase(seconds);
  },
};