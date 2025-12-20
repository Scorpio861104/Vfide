// Skip archive tests automatically in FAST mode without touching each file.
// Activates only when FAST_TESTS=1.

if (process.env.FAST_TESTS) {
  try {
    const pathSep = require('path').sep;
    const isArchiveFile = () => {
      const err = new Error();
      const stack = (err.stack || '').split('\n');
      for (const line of stack) {
        // Typical frame: at Object.<anonymous> (/workspaces/Vfide/test/archive/foo.test.js:10:1)
        const m = line.match(/\(([^)]+)\)/) || line.match(/at (\S+\.test\.js)/);
        if (m && m[1] && typeof m[1] === 'string') {
          const p = m[1];
          if (p.includes([pathSep, 'test', pathSep, 'archive', pathSep].join(''))) {
            return true;
          }
        }
      }
      return false;
    };

    const origDescribe = global.describe;
    if (typeof origDescribe === 'function') {
      const wrapped = function(title, fn) {
        if (isArchiveFile()) {
          return origDescribe.skip(title, fn);
        }
        return origDescribe(title, fn);
      };
      // Preserve Mocha DSL helpers
      wrapped.only = function(title, fn) {
        if (isArchiveFile()) {
          return origDescribe.skip(title, fn);
        }
        return origDescribe.only(title, fn);
      };
      wrapped.skip = origDescribe.skip.bind(origDescribe);
      wrapped.each = origDescribe.each ? origDescribe.each.bind(origDescribe) : undefined;
      global.describe = wrapped;
    }
  } catch (e) {
    // Non-fatal; if anything goes wrong, fall back to normal behavior.
  }
}
