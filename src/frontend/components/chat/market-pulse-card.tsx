/**
 * Market Pulse card – LLM insight + optional dashboard sections from terminal data.
 * Fetches GET /api/agents/:agentId/plugins/vince/pulse and shows insight prominently.
 */

import { Card, CardContent } from "@/frontend/components/ui/card";
import { Loader2, ChevronDown, ChevronUp, BarChart2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  fetchPulse,
  type PulseResponse,
  PULSE_STALE_MS,
} from "@/frontend/lib/pulseApi";

/** Refetch pulse when stale and tab is visible */
function usePulseWithRefetch(agentId: string | undefined) {
  const [pulse, setPulse] = useState<PulseResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!agentId) {
      setPulse(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchPulse(agentId).then((data) => {
      setPulse(data ?? null);
      setLoading(false);
    });
  }, [agentId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!agentId || !pulse) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible")
        fetchPulse(agentId).then((data) => data && setPulse(data));
    }, PULSE_STALE_MS);
    return () => clearInterval(t);
  }, [agentId, pulse]);
  return { pulse, loading, refetch: load };
}

import { cn } from "@/frontend/lib/utils";

export function MarketPulseCard({ agentId }: { agentId: string | undefined }) {
  const { pulse, loading } = usePulseWithRefetch(agentId);
  const [expanded, setExpanded] = useState(false);

  if (!agentId) return null;
  if (loading) {
    return (
      <Card className="mb-4 border-border/80 bg-muted/30">
        <CardContent className="flex items-center gap-2 py-3 px-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Loading market pulse…
          </span>
        </CardContent>
      </Card>
    );
  }
  if (!pulse) return null;

  const sectionCount = Object.keys(pulse.sections ?? {}).length;
  const hasSections = sectionCount > 0;

  return (
    <Card className="mb-4 border-border/80 bg-muted/30 overflow-hidden">
      <CardContent className="p-0">
        <div className="px-4 py-3">
          <div className="flex items-start gap-2">
            <BarChart2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Market pulse
              </p>
              <p
                className={cn(
                  "text-sm font-medium text-foreground",
                  !pulse.insight && "italic text-muted-foreground",
                )}
              >
                {pulse.insight ||
                  "No insight available. Ask “gm” or “perps” for a full take."}
              </p>
              {pulse.updatedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Updated {new Date(pulse.updatedAt).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </div>
        {hasSections && (
          <>
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="w-full flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" /> Hide sections
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" /> {sectionCount} data
                  section{sectionCount !== 1 ? "s" : ""}
                </>
              )}
            </button>
            {expanded && (
              <div className="border-t border-border/60 px-4 py-3 space-y-2 max-h-48 overflow-y-auto">
                {Object.entries(pulse.sections).map(([key, section]) => (
                  <div key={key} className="text-xs">
                    <span className="font-medium text-foreground">
                      {section.label}:
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {section.summary}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
