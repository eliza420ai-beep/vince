import type { ReactNode } from "react";

/**
 * Stub CDPReactProvider when @coinbase/cdp-react is not installed or VITE_USE_CDP is not set.
 * Renders children only; no CDP wallet/auth. Set VITE_USE_CDP=true and install @coinbase/cdp-react for real CDP.
 */
export function CDPReactProvider({
  children,
  config,
}: {
  children: ReactNode;
  config?: Record<string, unknown>;
}) {
  return <>{children}</>;
}
