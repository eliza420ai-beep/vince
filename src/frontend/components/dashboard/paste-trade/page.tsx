"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { socketManager } from "@/frontend/lib/socketManager";
import {
  fetchPasteTradeHandoff,
  fetchPasteTradeRun,
  startPasteTradeRun,
  type PasteTradeOtakuHandoff,
  type PasteTradeRunRecord,
} from "@/frontend/lib/pasteTradeApi";

export interface PasteTradePageProps {
  agentId: string;
}

export default function PasteTradePage({ agentId }: PasteTradePageProps) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [runId, setRunId] = useState<string | null>(null);
  const [record, setRecord] = useState<PasteTradeRunRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [handoff, setHandoff] = useState<PasteTradeOtakuHandoff | null>(null);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    if (!runId) return;
    const r = await fetchPasteTradeRun(String(agentId), runId);
    if (r) setRecord(r);
  }, [agentId, runId]);

  useEffect(() => {
    if (!runId) return;
    const t = setInterval(() => void refresh(), 3000);
    return () => clearInterval(t);
  }, [runId, refresh]);

  useEffect(() => {
    if (!runId || !socketManager.isConnected()) return;
    const off = socketManager.onEvent(
      "paste_trade:event",
      (payload: {
        runId?: string;
        event_type?: string;
        data?: Record<string, unknown>;
      }) => {
        if (payload?.runId === runId) void refresh();
      },
    );
    return () => off();
  }, [runId, refresh]);

  const loadHandoff = useCallback(async () => {
    if (!runId) return;
    setHandoffError(null);
    const h = await fetchPasteTradeHandoff(String(agentId), runId);
    if (!h) {
      setHandoff(null);
      setHandoffError("Could not load handoff (run missing or API error).");
      return;
    }
    setHandoff(h);
  }, [agentId, runId]);

  useEffect(() => {
    if (!runId || !record) return;
    void loadHandoff();
  }, [
    runId,
    record?.status,
    record?.updatedAt,
    record?.lastSnapshot,
    loadHandoff,
  ]);

  const copyHandoff = async () => {
    if (!handoff?.message) return;
    try {
      await navigator.clipboard.writeText(handoff.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setHandoffError("Clipboard not available.");
    }
  };

  const onStart = async () => {
    setError(null);
    setBusy(true);
    try {
      const u = url.trim();
      const tx = text.trim();
      if (!u && !tx) {
        setError("Enter a URL or paste thesis text.");
        setBusy(false);
        return;
      }
      const res = await startPasteTradeRun(String(agentId), {
        url: u || undefined,
        text: tx || undefined,
      });
      if (!res?.runId) {
        setError(
          "Could not start run. Is PASTE_TRADE_KEY set and the VINCE agent loaded?",
        );
        setBusy(false);
        return;
      }
      setRunId(res.runId);
      setRecord(null);
      setHandoff(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const iframeSrc = record?.sourceUrl ?? null;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <div>
        <h1 className="text-2xl md:text-3xl font-display">Paste trade</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Extract a source, create a live paste.trade page, and save theses.
          Same pipeline as chat: <code className="text-xs">/trade</code> with
          VINCE.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4">
        <label className="text-xs uppercase text-muted-foreground">URL</label>
        <Input
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <label className="text-xs uppercase text-muted-foreground">
          Or thesis text
        </label>
        <textarea
          className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Typed directional view…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button onClick={() => void onStart()} disabled={busy}>
          {busy ? "Starting…" : "Run pipeline"}
        </Button>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {runId && (
          <p className="text-xs font-mono text-muted-foreground">
            runId: {runId}
          </p>
        )}
      </div>

      {record && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2 bg-muted/40 text-xs font-mono uppercase text-muted-foreground">
            Status: {record.status}
            {record.error ? ` — ${record.error}` : ""}
          </div>
          <div className="max-h-64 overflow-y-auto p-3 text-sm space-y-2">
            {record.events.length === 0 ? (
              <p className="text-muted-foreground">Waiting for events…</p>
            ) : (
              record.events.map((ev, i) => (
                <div
                  key={`${ev.t}-${i}`}
                  className="border-b border-border/50 pb-2"
                >
                  <span className="text-xs text-muted-foreground">
                    {new Date(ev.t).toISOString()}
                  </span>{" "}
                  <span className="font-medium">{ev.event_type}</span>
                  <pre className="text-xs mt-1 whitespace-pre-wrap break-all opacity-80">
                    {JSON.stringify(ev.data, null, 0)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {runId && (
        <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-display">Otaku handoff</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Copy this into an <strong>Otaku</strong> chat. Nothing executes
                automatically — you confirm size and risk with Otaku per the{" "}
                <span className="font-mono text-[10px]">
                  TRADING_RUNTIME_CONTRACT
                </span>
                .
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadHandoff()}
              >
                Refresh handoff
              </Button>
              <Button
                size="sm"
                onClick={() => void copyHandoff()}
                disabled={!handoff?.message}
              >
                {copied ? "Copied" : "Copy message"}
              </Button>
            </div>
          </div>
          {handoffError && (
            <p className="text-sm text-destructive">{handoffError}</p>
          )}
          {handoff && (
            <>
              <p className="text-xs">
                <span
                  className={
                    handoff.eligible
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }
                >
                  {handoff.eligible
                    ? "Hyperliquid / Polymarket picks detected — Otaku may be able to help execute after you confirm."
                    : (handoff.reason ??
                      "Review message below; routing may still be in progress or on an unsupported venue.")}
                </span>
              </p>
              {handoff.expressions.length > 0 && (
                <ul className="text-xs font-mono text-muted-foreground list-disc pl-4">
                  {handoff.expressions.map((e, i) => (
                    <li key={`${e.ticker}-${i}`}>
                      {e.platform ?? "?"} {e.ticker}
                      {e.direction ? ` ${e.direction}` : ""}
                    </li>
                  ))}
                </ul>
              )}
              <pre className="text-xs whitespace-pre-wrap break-words max-h-48 overflow-y-auto rounded-md border border-border bg-background p-3">
                {handoff.message}
              </pre>
            </>
          )}
        </div>
      )}

      {iframeSrc && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-display">Live source</h2>
          <div className="rounded-xl border border-border overflow-hidden h-[min(70vh,560px)]">
            <iframe
              title="paste.trade source"
              src={iframeSrc}
              className="w-full h-full bg-background"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
        </div>
      )}
    </div>
  );
}
