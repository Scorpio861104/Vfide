/** @type {import('@size-limit/preset-app').SizeLimitConfig} */
const config = [
  {
    name: 'Client-side bundle',
    path: '.next/static/**/*.js',
    limit: '300 KB',
    gzip: true,
  },
  {
    name: 'Main page bundle',
    path: '.next/static/chunks/pages/index*.js',
    limit: '150 KB',
    gzip: true,
  },
  {
    name: 'Crypto-social integration',
    path: '.next/static/chunks/pages/crypto-social*.js',
    limit: '100 KB',
    gzip: true,
  },
  {
    name: 'Social payments page',
    path: '.next/static/chunks/pages/social-payments*.js',
    limit: '80 KB',
    gzip: true,
  },
];

export default config;
