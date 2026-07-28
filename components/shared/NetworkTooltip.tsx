"use client";

/**
 * NetworkTooltip
 *
 * Conditionally wraps its child in a Tooltip that explains why an action is
 * unavailable while the user is offline.
 *
 * Usage:
 *   <NetworkTooltip isOnline={isOnline} message="Export unavailable while offline.">
 *     <Button disabled={!isOnline}>Export CSV</Button>
 *   </NetworkTooltip>
 *
 * Design notes:
 * - HTML's `disabled` attribute suppresses all pointer and focus events, so a
 *   tooltip placed directly on a disabled <button> never fires. This component
 *   uses @base-ui's `render` prop on TooltipTrigger to substitute the default
 *   <button> trigger with a focusable <span>, which receives hover/focus events
 *   and renders the disabled button as its child.
 * - When online the component is a transparent passthrough (no tooltip, no
 *   wrapping span) so it has zero impact on the online code path.
 */

import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface NetworkTooltipProps {
  /** Pass the return value of `useOnlineStatus()`. */
  isOnline: boolean;
  /** Tooltip message shown when offline. */
  message?: string;
  /** The interactive element to wrap (typically a disabled Button). */
  children: React.ReactNode;
}

export const OFFLINE_MESSAGE = "Export unavailable while offline.";

export function NetworkTooltip({
  isOnline,
  message = OFFLINE_MESSAGE,
  children,
}: NetworkTooltipProps) {
  // When online, render children directly — zero tooltip overhead.
  if (isOnline) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        {/*
         * Use @base-ui's `render` prop to swap the default <button> trigger
         * for a focusable <span>. A disabled <button> suppresses all pointer
         * events; the span intercepts hover and Tab-focus so the tooltip can
         * show. The disabled button is rendered as a child inside the span.
         */}
        <TooltipTrigger
          render={
            <span
              tabIndex={0}
              aria-label={message}
              data-testid="network-tooltip-trigger"
              style={{ display: "inline-flex" }}
            />
          }
        >
          {children}
        </TooltipTrigger>
        <TooltipContent data-testid="network-tooltip-content">
          {message}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
