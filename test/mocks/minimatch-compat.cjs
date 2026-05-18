/* eslint-disable @typescript-eslint/no-require-imports */
const minimatchModule = require('minimatch');

function minimatchCompat(...args) {
  if (typeof minimatchModule === 'function') {
    return minimatchModule(...args);
  }

  if (typeof minimatchModule.minimatch === 'function') {
    return minimatchModule.minimatch(...args);
  }

  throw new TypeError('minimatch compatibility shim: no callable export found');
}

Object.assign(minimatchCompat, minimatchModule);

module.exports = minimatchCompat;
