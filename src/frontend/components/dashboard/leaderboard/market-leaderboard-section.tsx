/**
 * Reusable section for market leaderboards: Top Movers, Volume Leaders, one-liner.
 * Shows ALL data (no slicing). Optional categories for HIP-3 (Commodities, Indices, Stocks, AI/Tech).
 */

import DashboardCard from "@/frontend/components/dashboard/card";
import type { LeaderboardRow } from "@/frontend/lib/leaderboardsApi";
import { cn } from "@/frontend/lib/utils";
import { TrendingUp, BarChart3, Layers } from "lucide-react";

export function formatChange(change: number | undefined): string {
  if (change == null) return "—";
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

export function formatPrice(price: number | undefined): string {
  if (price == null || !Number.isFinite(price)) return "—";
  if (price >= 1e6) return `$${(price / 1e6).toFixed(2)}M`;
  if (price >= 1e3) return `$${(price / 1e3).toFixed(2)}K`;
  if (price >= 1) return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 0.0001) return `$${price.toFixed(4)}`;
  return `$${price.toExponential(2)}`;
}

interface CategoryBlock {
  label: string;
  rows: LeaderboardRow[];
}

interface MarketLeaderboardSectionProps {
  title: string;
  subtitle?: string;
  topMovers?: LeaderboardRow[];
  volumeLeaders?: LeaderboardRow[];
  oneLiner?: string;
  bias?: string;
  /** HIP-3 categories: full lists per sector (commodities, indices, stocks, aiTech) */
  categories?: CategoryBlock[];
  children?: React.ReactNode;
}

function MoversTable({ rows, showVolume = true }: { rows: LeaderboardRow[]; showVolume?: boolean }) {
  if (rows.length === 0) return null;
  const hasPrice = rows.some((r) => r.price != null && Number.isFinite(r.price));
  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left py-2 px-3 w-8">#</th>
            <th className="text-left py-2 px-3">Symbol</th>
            {hasPrice && <th className="text-right py-2 px-3">Price</th>}
            <th className="text-right py-2 px-3">Change</th>
            {showVolume && <th className="text-right py-2 px-3">Vol</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.symbol} className="border-t border-border/50 hover:bg-muted/20">
              <td className="py-1.5 px-3 text-muted-foreground">{row.rank ?? "—"}</td>
              <td className="py-1.5 px-3 font-medium">{row.symbol}</td>
              {hasPrice && (
                <td className="py-1.5 px-3 text-right font-mono tabular-nums text-muted-foreground">
                  {formatPrice(row.price)}
                </td>
              )}
              <td className={cn(
                "py-1.5 px-3 text-right font-mono tabular-nums",
                (row.change24h ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
              )}>
                {formatChange(row.change24h)}
              </td>
              {showVolume && (
                <td className="py-1.5 px-3 text-right text-muted-foreground">
                  {row.volumeFormatted ?? (row.volume != null ? `$${(row.volume / 1e6).toFixed(1)}M` : "—")}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VolumeTable({ rows }: { rows: LeaderboardRow[] }) {
  if (rows.length === 0) return null;
  const hasExtra = rows.some((r) => r.extra);
  const hasPrice = rows.some((r) => r.price != null && Number.isFinite(r.price));
  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left py-2 px-3 w-8">#</th>
            <th className="text-left py-2 px-3">Symbol</th>
            {hasPrice && <th className="text-right py-2 px-3">Price</th>}
            <th className="text-right py-2 px-3">Volume</th>
            {hasExtra && <th className="text-right py-2 px-3 hidden sm:table-cell">Extra</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.symbol} className="border-t border-border/50 hover:bg-muted/20">
              <td className="py-1.5 px-3 text-muted-foreground">{row.rank ?? "—"}</td>
              <td className="py-1.5 px-3 font-medium">{row.symbol}</td>
              {hasPrice && (
                <td className="py-1.5 px-3 text-right font-mono tabular-nums text-muted-foreground">
                  {formatPrice(row.price)}
                </td>
              )}
              <td className="py-1.5 px-3 text-right font-mono text-muted-foreground tabular-nums">
                {row.volumeFormatted ?? "—"}
              </td>
              {hasExtra && (
                <td className="py-1.5 px-3 text-right text-xs text-muted-foreground hidden sm:table-cell">
                  {row.extra}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MarketLeaderboardSection({
  title,
  subtitle,
  topMovers = [],
  volumeLeaders = [],
  oneLiner,
  bias,
  categories,
  children,
}: MarketLeaderboardSectionProps) {
  return (
    <DashboardCard title={title} subtitle={subtitle}>
      <div className="space-y-5">
        {oneLiner && (
          <p className="text-sm text-muted-foreground border-b border-border/60 pb-3">
            {oneLiner}
            {bias && (
              <span className={cn(
                "ml-2 font-medium",
                bias === "bullish" && "text-green-600 dark:text-green-400",
                bias === "bearish" && "text-red-600 dark:text-red-400",
                (bias === "neutral" || bias === "mixed") && "text-muted-foreground",
              )}>
                · {bias.toUpperCase()}
              </span>
            )}
          </p>
        )}

        {topMovers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              <TrendingUp className="w-3.5 h-3.5" />
              Top movers
            </div>
            <MoversTable rows={topMovers} />
          </div>
        )}

        {volumeLeaders.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              <BarChart3 className="w-3.5 h-3.5" />
              Volume leaders
            </div>
            <VolumeTable rows={volumeLeaders} />
          </div>
        )}

        {categories && categories.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Layers className="w-3.5 h-3.5" />
              By category (full lists)
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {categories.map(({ label, rows }) =>
                rows.length > 0 ? (
                  <div key={label}>
                    <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
                    <MoversTable rows={rows} />
                  </div>
                ) : null,
              )}
            </div>
          </div>
        )}

        {children}
      </div>
    </DashboardCard>
  );
}
