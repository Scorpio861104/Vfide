/**
 * Synchronous mock for next/dynamic used in Jest.
 * Resolves the imported module on the next microtask and renders once available.
 */
import React, { useEffect, useState } from 'react';

export default function dynamic(importFn, _options) {
  let resolvedComponent = null;

  void importFn()
    .then((mod) => {
      resolvedComponent = mod.default || mod;
    })
    .catch(() => {});

  function DynamicWrapper(props) {
    const [Comp, setComp] = useState(() => resolvedComponent);

    useEffect(() => {
      if (!Comp) {
        void importFn().then((mod) => {
          const component = mod.default || mod;
          setComp(() => component);
        });
      }
    }, [Comp]);

    if (!Comp) return null;
    return React.createElement(Comp, props);
  }

  DynamicWrapper.displayName = 'NextDynamic';
  return DynamicWrapper;
}
