"use client";

import React, { useState, useEffect, memo } from "react";
import { Card, CardContent } from "@/frontend/components/ui/card";
import TVNoise from "@/frontend/components/ui/tv-noise";

const COINGECKO_BTC_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true";
const COINGECKO_HYPE_SOL_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=hyperliquid,solana&vs_currencies=usd";
const BTC_POLL_MS = 60_000;
const HYPE_SOL_POLL_MS = 60_000;

function formatBtcPrice(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000) return `$${usd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `$${usd.toFixed(2)}`;
}

/** Whole-number price for HYPE/SOL (e.g. $32, $86). */
function formatWholePrice(usd: number): string {
  return `$${Math.round(usd)}`;
}

/** Full trading session description with UTC range (matches plugin-vince sessionFilters). */
function getTradingSessionFull(date: Date): string {
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return "Weekend – Saturday/Sunday";
  const hour = date.getUTCHours();
  if (hour >= 13 && hour < 16) return "Eu Us Overlap – 13:00–15:59 UTC";
  if (hour >= 16 && hour < 22) return "Us – 16:00–21:59 UTC";
  if (hour >= 7 && hour < 13) return "Europe – 07:00–12:59 UTC";
  if (hour >= 0 && hour < 7) return "Asia – 00:00–06:59 UTC";
  return "Off Hours – 22:00–23:59 UTC";
}

// Memoize Widget to prevent re-renders of parent components
function Widget() {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const [btcChange24h, setBtcChange24h] = useState<number | null>(null);
  const [hypePrice, setHypePrice] = useState<number | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);

  // Update date once per minute (for day/date row)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Fetch BTC price on mount and periodically (with 24h change)
  useEffect(() => {
    const fetchBtc = async () => {
      try {
        const res = await fetch(COINGECKO_BTC_URL);
        const data = await res.json();
        if (data?.bitcoin?.usd != null) {
          setBtcPrice(data.bitcoin.usd);
          setBtcChange24h(data.bitcoin.usd_24h_change ?? null);
        }
      } catch (e) {
        console.error("Error fetching BTC price:", e);
      }
    };
    fetchBtc();
    const interval = setInterval(fetchBtc, BTC_POLL_MS);
    return () => clearInterval(interval);
  }, []);

  // Fetch HYPE and SOL prices
  useEffect(() => {
    const fetchHypeSol = async () => {
      try {
        const res = await fetch(COINGECKO_HYPE_SOL_URL);
        const data = await res.json();
        if (data?.hyperliquid?.usd != null) setHypePrice(data.hyperliquid.usd);
        if (data?.solana?.usd != null) setSolPrice(data.solana.usd);
      } catch (e) {
        console.error("Error fetching HYPE/SOL price:", e);
      }
    };
    fetchHypeSol();
    const interval = setInterval(fetchHypeSol, HYPE_SOL_POLL_MS);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (date: Date) => {
    const dayOfWeek = date.toLocaleDateString("en-US", {
      weekday: "long",
    });
    const restOfDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return { dayOfWeek, restOfDate };
  };

  const dateInfo = formatDate(currentTime);

  const formatBtcDisplay = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

  return (
    <Card className="w-full aspect-[2] relative overflow-hidden">
      <TVNoise opacity={0.3} intensity={0.2} speed={40} />
      <CardContent className="bg-accent/30 flex-1 flex flex-col justify-between text-sm font-medium uppercase relative z-20">
        <div className="flex justify-between items-center">
          <span className="opacity-50">{dateInfo.dayOfWeek}</span>
          <span>{dateInfo.restOfDate}</span>
        </div>
        <div className="text-center">
          <div className="text-5xl font-display" suppressHydrationWarning>
            {btcPrice != null ? (
              <>
                {formatBtcDisplay(btcPrice)}
                {btcChange24h != null && (
                  <span
                    className={`block text-base font-normal mt-1 ${
                      btcChange24h >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {btcChange24h >= 0 ? "+" : ""}
                    {btcChange24h.toFixed(2)}% 24h
                  </span>
                )}
              </>
            ) : (
              "…"
            )}
          </div>
          <div className="text-xs uppercase opacity-60 mt-0.5">BTC</div>
        </div>

        <div className="grid grid-cols-3 gap-2 items-center">
          <div className="text-left">
            <span className="opacity-50 uppercase block whitespace-nowrap">HYPE</span>
            <span className="block font-mono">
              {hypePrice != null ? formatWholePrice(hypePrice) : "…"}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center min-w-0 px-1 text-center">
            <span className="opacity-50 uppercase whitespace-nowrap">Trading Session</span>
            <span className="font-normal normal-case whitespace-nowrap text-center">
              {getTradingSessionFull(currentTime)}
            </span>
          </div>
          <div className="text-right">
            <span className="opacity-50 uppercase block whitespace-nowrap">SOL</span>
            <span className="block font-mono">
              {solPrice != null ? formatWholePrice(solPrice) : "…"}
            </span>
          </div>
        </div>

        <div className="absolute inset-0 -z-1">
          <img
            src="/assets/pc_blueprint.gif"
            alt="logo"
            className="size-full object-contain"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Export memoized version to prevent parent re-renders
export default memo(Widget);
