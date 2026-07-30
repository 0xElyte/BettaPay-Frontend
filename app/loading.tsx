"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

/**
 * Maximum number of milliseconds the loading spinner is shown before
 * a "Still loading..." fallback message appears with a refresh button.
 */
const MAX_DISPLAY_MS = 10_000;

export default function RootLoading() {
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsStale(true), MAX_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background text-foreground z-50">
      <div className="flex flex-col items-center space-y-4">
        {/* Animated logo container */}
        <div className="relative w-16 h-16 bg-foreground rounded-2xl flex items-center justify-center shadow-md animate-pulse">
          <Image
            src="/logo.png"
            alt="BettaPay"
            width={40}
            height={40}
            priority={true}
            className="w-10 h-10 object-contain"
          />
        </div>

        {/* Brand name */}
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          BettaPay
        </h1>

        {isStale ? (
          /* Stale state — the page has been loading too long */
          <div className="flex flex-col items-center space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              Still loading&hellip; This is taking longer than expected.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              Refresh page
            </button>
          </div>
        ) : (
          /* Normal spinner */
          <div className="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
}
