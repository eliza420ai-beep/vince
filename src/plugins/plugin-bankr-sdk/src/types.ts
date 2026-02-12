/**
 * Minimal types for plugin-bankr-sdk.
 * Full JobStatus/Transaction types come from @bankr/sdk.
 */
export type { JobStatus, Transaction } from "@bankr/sdk";

/** Local fallback if @bankr/sdk omits JobStatus (e.g. older or minimal build). */
export type JobStatusFallback = "pending" | "processing" | "completed" | "failed" | "cancelled";

/** Local fallback shape if @bankr/sdk omits Transaction. */
export interface TransactionFallback {
  type: string;
  metadata?: { chainId?: number; [key: string]: unknown };
}
