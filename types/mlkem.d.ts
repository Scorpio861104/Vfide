declare module 'mlkem' {
  export class MlKem1024 {
    generateKeyPair(): Promise<[Uint8Array, Uint8Array]>;
    encap(publicKey: Uint8Array): Promise<[Uint8Array, Uint8Array]>;
    decap(ciphertext: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array>;
  }
}
