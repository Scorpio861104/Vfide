'use client';

/**
 * PieMenuContext — extracted from PieMenu.tsx in R13.B (2026-05-17).
 *
 * Before: LiveProofScoreProvider imported `PieMenuContextProvider` from
 * PieMenu.tsx (945 LOC). The bundler had to pull in the entire PieMenu
 * file — framer-motion, lucide icons, router hooks, the full slide-out
 * UI — just to use a 19-line React.createContext wrapper.
 *
 * After: the context lives here on its own. PieMenu.tsx re-exports the
 * same names from this module to keep the public API stable.
 */

import React from 'react';

/** Default neutral / amber ProofScore for users without a known score. */
const DEFAULT_SCORE = 5000;

export const PieMenuScoreContext = React.createContext<number>(DEFAULT_SCORE);

export function PieMenuContextProvider({
  score,
  children,
}: {
  score: number;
  children: React.ReactNode;
}) {
  return (
    <PieMenuScoreContext.Provider value={score}>
      {children}
    </PieMenuScoreContext.Provider>
  );
}

export function usePieMenuScore(): number {
  return React.useContext(PieMenuScoreContext);
}
