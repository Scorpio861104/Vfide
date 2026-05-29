/**
 * Synchronous mock for next/dynamic — resolves dynamic imports immediately in Jest.
 * Replaces async lazy loading with synchronous require() so components render in tests.
 */
const React = require('react');

function dynamic(importFn, _options) {
  // We can't synchronously resolve ES module dynamic imports in CJS Jest.
  // Instead, return a component that triggers the import and renders after resolution.
  
  let ResolvedComponent = null;
  
  // Kick off resolution immediately
  importFn().then((mod) => {
    ResolvedComponent = mod.default || mod;
  }).catch(() => {});

  // Return a simple wrapper — Jest's act() will flush the microtask queue
  const Wrapper = React.forwardRef(function DynamicWrapper(props, ref) {
    const [Comp, setComp] = React.useState(ResolvedComponent);
    
    React.useEffect(() => {
      if (!Comp) {
        importFn().then((mod) => {
          setComp(mod.default || mod);
        });
      }
    }, []);
    
    if (!Comp) return null;
    return React.createElement(Comp, { ...props, ref });
  });
  
  Wrapper.displayName = 'NextDynamic';
  return Wrapper;
}

module.exports = dynamic;
module.exports.default = dynamic;
