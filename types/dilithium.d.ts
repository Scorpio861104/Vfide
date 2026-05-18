declare module '@theqrl/dilithium5' {
  export interface Dilithium {
    generateKeyPair(): { publicKey: Uint8Array; privateKey: Uint8Array };
    sign(message: Uint8Array, privateKey: Uint8Array): Uint8Array;
    verify(
      signature: Uint8Array,
      message: Uint8Array,
      publicKey: Uint8Array
    ): boolean;
  }

  const dilithium: Dilithium;
  export default dilithium;
}
