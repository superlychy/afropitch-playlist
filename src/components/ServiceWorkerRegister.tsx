"use client";

import { useEffect } from "react";

// Registers the service worker on a best-effort basis. Silent: any failure
// is swallowed so the app keeps working with or without it.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Register immediately on mount: waiting for window "load" delays
    // activation and can make PWA validators miss the service worker.
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // silent
    });
  }, []);

  return null;
}
