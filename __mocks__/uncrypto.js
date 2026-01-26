// Mock for uncrypto module
// eslint-disable-next-line @typescript-eslint/no-require-imports
const crypto = require('crypto');

module.exports = {
  default: crypto.webcrypto || {
    getRandomValues: (arr) => {
      const bytes = crypto.randomBytes(arr.length);
      arr.set(bytes);
      return arr;
    },
    randomUUID: () => crypto.randomUUID(),
    subtle: {
      digest: async (algorithm, data) => {
        const hash = crypto.createHash(algorithm.replace('-', '').toLowerCase());
        hash.update(Buffer.from(data));
        return hash.digest();
      },
      encrypt: async () => Buffer.alloc(16),
      decrypt: async () => Buffer.alloc(16),
      sign: async () => Buffer.alloc(32),
      verify: async () => true,
    },
  },
  getRandomValues: (arr) => {
    const bytes = crypto.randomBytes(arr.length);
    arr.set(bytes);
    return arr;
  },
  randomUUID: () => crypto.randomUUID(),
  subtle: {
    digest: async (algorithm, data) => {
      const hash = crypto.createHash(algorithm.replace('-', '').toLowerCase());
      hash.update(Buffer.from(data));
      return hash.digest();
    },
    encrypt: async () => Buffer.alloc(16),
    decrypt: async () => Buffer.alloc(16),
    sign: async () => Buffer.alloc(32),
    verify: async () => true,
  },
};
