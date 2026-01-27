"use client";

import { useEffect } from "react";

export function MockServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    void import("@/mocks/browser").then(({ worker }) => {
      worker.start({
        onUnhandledRequest: "warn",
      });
    });
  }, []);

  return null;
}
