"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Camera } from "lucide-react";

interface ChartTicker {
  label: string;
  tradingViewSymbol: string;
  exchange?: string;
}

interface ChartsTabProps {
  chartTickers?: {
    watchlist: string[];
    tastytrade: string[];
  };
}

const CRYPTO_TICKERS: ChartTicker[] = [
  { label: "BTC", tradingViewSymbol: "COINBASE:BTCUSD", exchange: "COINBASE" },
  {
    label: "ETH/BTC",
    tradingViewSymbol: "BINANCE:ETHBTC",
    exchange: "BINANCE",
  },
  {
    label: "SOL/BTC",
    tradingViewSymbol: "BINANCE:SOLBTC",
    exchange: "BINANCE",
  },
];

const STOCK_TICKERS: ChartTicker[] = [
  { label: "HOOD", tradingViewSymbol: "NASDAQ:HOOD", exchange: "NASDAQ" },
  { label: "CRCL", tradingViewSymbol: "NASDAQ:CRCL", exchange: "NASDAQ" },
  { label: "COIN", tradingViewSymbol: "NASDAQ:COIN", exchange: "NASDAQ" },
  { label: "HODL", tradingViewSymbol: "NASDAQ:HODL", exchange: "NASDAQ" },
  { label: "NVDA", tradingViewSymbol: "NASDAQ:NVDA", exchange: "NASDAQ" },
  { label: "TSLA", tradingViewSymbol: "NASDAQ:TSLA", exchange: "NASDAQ" },
  { label: "MSTR", tradingViewSymbol: "NASDAQ:MSTR", exchange: "NASDAQ" },
];

const EXCHANGE_OVERRIDES: Record<string, string> = {
  NEE: "NYSE",
  CCJ: "NYSE",
  PWR: "NYSE",
  ETN: "NYSE",
  EME: "NYSE",
  VST: "NYSE",
  VRT: "NYSE",
  CEG: "NASDAQ",
  ANET: "NYSE",
  AMAT: "NASDAQ",
  ASML: "NASDAQ",
  LRCX: "NASDAQ",
  KLAC: "NASDAQ",
  SNPS: "NASDAQ",
  CDNS: "NASDAQ",
};

function toTradingViewStockTicker(symbol: string): ChartTicker {
  const upper = symbol.toUpperCase().trim();
  const exchange = EXCHANGE_OVERRIDES[upper] ?? "NASDAQ";
  return {
    label: upper,
    tradingViewSymbol: `${exchange}:${upper}`,
    exchange,
  };
}

function toChartTickers(symbols: string[] | undefined): ChartTicker[] {
  if (!symbols || symbols.length === 0) return [];
  return symbols
    .map((s) => s.toUpperCase().trim())
    .filter(Boolean)
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .map(toTradingViewStockTicker);
}

const INTERVALS = [
  { value: "1", label: "1m" },
  { value: "30", label: "30m" },
  { value: "60", label: "1h" },
  { value: "240", label: "4h" },
  { value: "D", label: "D" },
] as const;

function buildEmbedUrl(
  ticker: ChartTicker,
  interval: string,
  widgetId: string,
): string {
  return `https://s.tradingview.com/widgetembed/?frameElementId=${encodeURIComponent(widgetId)}&symbol=${encodeURIComponent(ticker.tradingViewSymbol)}&interval=${interval}&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=exchange&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%22header_widget%22%5D&locale=en&utm_source=www.tradingview.com&utm_medium=widget_new&utm_campaign=chart&utm_term=${encodeURIComponent(ticker.tradingViewSymbol)}`;
}

function ChartBlock({
  tickers,
  selectedTicker,
  onSelectTicker,
  interval,
  onIntervalChange,
  layoutId,
}: {
  tickers: ChartTicker[];
  selectedTicker: ChartTicker;
  onSelectTicker: (t: ChartTicker) => void;
  interval: string;
  onIntervalChange: (v: string) => void;
  layoutId: string;
}) {
  const ticker =
    tickers.find((t) => t.label === selectedTicker.label) ?? tickers[0];
  const embedUrl = buildEmbedUrl(
    ticker,
    interval,
    `tradingview_${layoutId}_${ticker.label}`,
  );

  return (
    <div className="w-full flex flex-col flex-1 min-h-0 rounded-xl border border-border/50 bg-black/40 overflow-hidden">
      <div className="flex items-center justify-between border-b border-yellow-500/20 px-4 flex-shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tickers.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelectTicker(item)}
              className={`relative py-3 px-2 text-sm font-medium whitespace-nowrap ${
                selectedTicker.label === item.label
                  ? "text-yellow-500"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
              {selectedTicker.label === item.label && (
                <motion.div
                  layoutId={layoutId}
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="p-2 text-muted-foreground hover:text-foreground"
          aria-label="Screenshot chart"
        >
          <Camera className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 min-h-[320px] w-full">
        <iframe
          key={ticker.label + interval}
          src={embedUrl}
          title={`TradingView chart ${ticker.label}`}
          className="w-full h-full min-h-[320px] border-0"
          id={`tradingview_${layoutId}_${ticker.label}`}
        />
      </div>
      <div className="flex items-center gap-2 p-2 border-t border-yellow-500/20 flex-shrink-0">
        {INTERVALS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => onIntervalChange(value)}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${
              interval === value
                ? "bg-yellow-500/20 text-yellow-500 font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">
          {ticker.exchange ?? "TradingView"}
        </span>
      </div>
    </div>
  );
}

export function ChartsTab({ chartTickers }: ChartsTabProps) {
  const [selectedCrypto, setSelectedCrypto] = useState<ChartTicker>(
    CRYPTO_TICKERS[0],
  );
  const [intervalCrypto, setIntervalCrypto] = useState<string>("240");
  const [selectedStock, setSelectedStock] = useState<ChartTicker>(
    STOCK_TICKERS[0],
  );
  const [intervalStock, setIntervalStock] = useState<string>("240");
  const watchlistTickers = toChartTickers(chartTickers?.watchlist);
  const tastytradeTickers = toChartTickers(chartTickers?.tastytrade);
  const [selectedWatchlist, setSelectedWatchlist] = useState<ChartTicker>(
    watchlistTickers[0] ?? STOCK_TICKERS[0],
  );
  const [intervalWatchlist, setIntervalWatchlist] = useState<string>("240");
  const [selectedTastytrade, setSelectedTastytrade] = useState<ChartTicker>(
    tastytradeTickers[0] ?? STOCK_TICKERS[0],
  );
  const [intervalTastytrade, setIntervalTastytrade] = useState<string>("240");

  return (
    <div className="flex flex-col gap-6 w-full min-h-0">
      {/* BTC & core pairs */}
      <div className="flex flex-col min-h-0 flex-1">
        <p className="text-sm font-medium text-muted-foreground mb-2">
          BTC & core pairs
        </p>
        <ChartBlock
          tickers={CRYPTO_TICKERS}
          selectedTicker={selectedCrypto}
          onSelectTicker={setSelectedCrypto}
          interval={intervalCrypto}
          onIntervalChange={setIntervalCrypto}
          layoutId="chartsCrypto"
        />
      </div>

      {/* Fav stocks */}
      <div className="flex flex-col min-h-0 flex-1">
        <p className="text-sm font-medium text-muted-foreground mb-2">
          Fav stocks
        </p>
        <ChartBlock
          tickers={STOCK_TICKERS}
          selectedTicker={selectedStock}
          onSelectTicker={setSelectedStock}
          interval={intervalStock}
          onIntervalChange={setIntervalStock}
          layoutId="chartsStocks"
        />
      </div>

      {/* Watchlist sleeve from portfolio_watchlist.json */}
      {watchlistTickers.length > 0 && (
        <div className="flex flex-col min-h-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Watchlist sleeve
          </p>
          <ChartBlock
            tickers={watchlistTickers}
            selectedTicker={selectedWatchlist}
            onSelectTicker={setSelectedWatchlist}
            interval={intervalWatchlist}
            onIntervalChange={setIntervalWatchlist}
            layoutId="chartsWatchlist"
          />
        </div>
      )}

      {/* Tastytrade sleeve from portfolio_tastytrade.json */}
      {tastytradeTickers.length > 0 && (
        <div className="flex flex-col min-h-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Tastytrade sleeve
          </p>
          <ChartBlock
            tickers={tastytradeTickers}
            selectedTicker={selectedTastytrade}
            onSelectTicker={setSelectedTastytrade}
            interval={intervalTastytrade}
            onIntervalChange={setIntervalTastytrade}
            layoutId="chartsTastytrade"
          />
        </div>
      )}
    </div>
  );
}
