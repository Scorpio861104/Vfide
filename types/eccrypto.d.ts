/**
 * Type declarations for @toruslabs/eccrypto
 * Fixes ArrayBuffer type compatibility issues
 */

declare module '@toruslabs/eccrypto' {
  export interface Ecies {
    iv: Buffer;
    ephemPublicKey: Buffer;
    ciphertext: Buffer;
    mac: Buffer;
  }

  export function encrypt(
    publicKeyTo: Buffer,
    msg: Buffer,
    opts?: { iv?: Buffer; ephemPrivateKey?: Buffer }
  ): Promise<Ecies>;

  export function decrypt(privateKey: Buffer, encrypted: Ecies): Promise<Buffer>;

  export function sign(privateKey: Buffer, msg: Buffer): Promise<Buffer>;

  export function verify(
    publicKey: Buffer,
    msg: Buffer,
    signature: Buffer
  ): Promise<null>;

  export function getPublic(privateKey: Buffer): Buffer;

  export function derive(privateKeyA: Buffer, publicKeyB: Buffer): Promise<Buffer>;
}
