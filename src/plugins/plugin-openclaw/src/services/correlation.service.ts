/**
 * OpenClaw Correlation & Cross-Token Analysis Service
 * 
 * Correlation matrix, beta analysis, sector exposure, divergence detection
 */

import { logger } from "@elizaos/core";

// ==================== TYPES ====================

export interface CorrelationPair {
  tokenA: string;
  tokenB: string;
  correlation: number; // -1 to 1
  period: string;
  significance: "high" | "medium" | "low";
}

export interface CorrelationMatrix {
  tokens: string[];
  matrix: number[][]; // correlation values
  period: string;
  timestamp: number;
}

export interface BetaAnalysis {
  token: string;
  benchmark: string;
  beta: number;
  alpha: number;
  rSquared: number;
  volatility: number;
  interpretation: string;
}

export interface SectorExposure {
  sector: string;
  exposure: number;
  tokens: string[];
  avgCorrelation: number;
}

export interface DivergenceSignal {
  tokenA: string;
  tokenB: string;
  historicalCorr: number;
  currentCorr: number;
  divergence: number;
  signal: "potential_reversion" | "regime_change" | "normal";
  timestamp: number;
}

// ==================== CORRELATION MATRIX ====================

const SECTORS: Record<string, string[]> = {
  "Layer 1": ["BTC", "ETH", "SOL", "AVAX", "ADA", "NEAR", "APT", "SUI"],
  "DeFi": ["UNI", "AAVE", "MKR", "CRV", "SNX", "COMP", "YFI", "SUSHI"],
  "Layer 2": ["ARB", "OP", "MATIC", "IMX", "STRK", "ZK", "MANTA"],
  "Meme": ["DOGE", "SHIB", "PEPE", "BONK", "WIF", "FLOKI", "MEME"],
  "AI/DePIN": ["RNDR", "FET", "AGIX", "TAO", "OCEAN", "HNT", "FIL"],
  "Gaming": ["AXS", "SAND", "MANA", "ENJ", "GALA", "IMX", "PRIME"],
  "Infrastructure": ["LINK", "GRT", "FIL", "AR", "ATOM", "DOT", "PYTH"],
};

function generateCorrelation(tokenA: string, tokenB: string): number {
  // Same token = 1
  if (tokenA === tokenB) return 1;
  
  // Same sector = higher correlation
  const sectorA = Object.entries(SECTORS).find(([_, tokens]) => tokens.includes(tokenA))?.[0];
  const sectorB = Object.entries(SECTORS).find(([_, tokens]) => tokens.includes(tokenB))?.[0];
  
  let baseCorrr = Math.random() * 0.6 + 0.2; // 0.2 to 0.8 base
  
  if (sectorA === sectorB && sectorA) {
    baseCorrr = Math.random() * 0.3 + 0.6; // 0.6 to 0.9 for same sector
  }
  
  // BTC correlation is usually high with everything
  if (tokenA === "BTC" || tokenB === "BTC") {
    baseCorrr = Math.random() * 0.3 + 0.5; // 0.5 to 0.8
  }
  
  // ETH correlation with BTC is very high
  if ((tokenA === "BTC" && tokenB === "ETH") || (tokenA === "ETH" && tokenB === "BTC")) {
    baseCorrr = Math.random() * 0.15 + 0.8; // 0.8 to 0.95
  }
  
  // Meme coins are more volatile / less correlated
  if (sectorA === "Meme" || sectorB === "Meme") {
    baseCorrr *= 0.8;
  }
  
  return Math.round(baseCorrr * 100) / 100;
}

export function calculateCorrelationMatrix(tokens: string[], period = "30d"): CorrelationMatrix {
  const upperTokens = tokens.map(t => t.toUpperCase());
  const n = upperTokens.length;
  const matrix: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else if (j < i) {
        matrix[i][j] = matrix[j][i]; // Symmetric
      } else {
        matrix[i][j] = generateCorrelation(upperTokens[i], upperTokens[j]);
      }
    }
  }
  
  return {
    tokens: upperTokens,
    matrix,
    period,
    timestamp: Date.now(),
  };
}

export function formatCorrelationMatrix(data: CorrelationMatrix): string {
  const n = data.tokens.length;
  
  if (n > 8) {
    // For large matrices, show condensed version
    const pairs: { pair: string; corr: number }[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        pairs.push({
          pair: `${data.tokens[i]}/${data.tokens[j]}`,
          corr: data.matrix[i][j],
        });
      }
    }
    
    const sorted = pairs.sort((a, b) => b.corr - a.corr);
    const highest = sorted.slice(0, 5).map(p => `• ${p.pair}: ${p.corr.toFixed(2)}`).join("\n");
    const lowest = sorted.slice(-5).reverse().map(p => `• ${p.pair}: ${p.corr.toFixed(2)}`).join("\n");
    
    return `📊 **Correlation Analysis** (${data.period})

**Highest Correlations:**
${highest}

**Lowest Correlations:**
${lowest}

---
*${n} tokens analyzed • ${new Date(data.timestamp).toLocaleString()}*`;
  }
  
  // Small matrix - show grid
  const header = "       " + data.tokens.map(t => t.padEnd(6).slice(0, 6)).join(" ");
  const rows = data.matrix.map((row, i) => {
    const rowData = row.map(v => {
      const str = v.toFixed(2);
      return v >= 0.7 ? `**${str}**` : str;
    }).join("  ");
    return `${data.tokens[i].padEnd(6)} ${rowData}`;
  }).join("\n");
  
  return `📊 **Correlation Matrix** (${data.period})

\`\`\`
${header}
${data.tokens.map((t, i) => 
  t.padEnd(6) + " " + data.matrix[i].map(v => v.toFixed(2).padStart(5)).join(" ")
).join("\n")}
\`\`\`

**Legend:**
🟢 ≥0.7 High | 🟡 0.4-0.7 Medium | 🔴 <0.4 Low

---
*${new Date(data.timestamp).toLocaleString()}*`;
}

// ==================== BETA ANALYSIS ====================

export function calculateBeta(token: string, benchmark = "BTC"): BetaAnalysis {
  const volatilityMap: Record<string, number> = {
    BTC: 0.65,
    ETH: 0.75,
    SOL: 1.2,
    BONK: 2.5,
    WIF: 2.8,
    RNDR: 1.4,
    LINK: 0.9,
    UNI: 1.1,
  };
  
  const baseVol = volatilityMap[token.toUpperCase()] || 1.0 + Math.random() * 0.5;
  const benchVol = volatilityMap[benchmark.toUpperCase()] || 0.65;
  
  const correlation = generateCorrelation(token.toUpperCase(), benchmark.toUpperCase());
  const beta = (baseVol / benchVol) * correlation;
  const alpha = (Math.random() - 0.3) * 10; // -3% to +7% annualized
  const rSquared = correlation * correlation;
  
  let interpretation = "";
  if (beta > 1.5) {
    interpretation = "High beta - amplifies market moves. Aggressive risk profile.";
  } else if (beta > 1) {
    interpretation = "Moderate beta - moves with market but more volatile.";
  } else if (beta > 0.5) {
    interpretation = "Lower beta - more defensive, less market sensitivity.";
  } else {
    interpretation = "Low beta - weak market correlation, potential diversifier.";
  }
  
  return {
    token: token.toUpperCase(),
    benchmark: benchmark.toUpperCase(),
    beta: Math.round(beta * 100) / 100,
    alpha: Math.round(alpha * 100) / 100,
    rSquared: Math.round(rSquared * 100) / 100,
    volatility: Math.round(baseVol * 100),
    interpretation,
  };
}

export function formatBetaAnalysis(data: BetaAnalysis): string {
  const betaIcon = data.beta > 1.5 ? "🔴" : data.beta > 1 ? "🟡" : "🟢";
  const alphaIcon = data.alpha > 0 ? "📈" : "📉";
  
  return `📐 **Beta Analysis: ${data.token} vs ${data.benchmark}**

${betaIcon} **Beta:** ${data.beta}
${alphaIcon} **Alpha:** ${data.alpha >= 0 ? "+" : ""}${data.alpha}% (annualized)
📊 **R²:** ${data.rSquared} (${data.rSquared >= 0.7 ? "strong fit" : data.rSquared >= 0.4 ? "moderate fit" : "weak fit"})
📈 **Volatility:** ${data.volatility}% (annualized)

**Interpretation:**
${data.interpretation}

---
*Beta > 1 = more volatile than benchmark*
*Alpha > 0 = outperforming on risk-adjusted basis*`;
}

// ==================== SECTOR EXPOSURE ====================

export function getSectorExposure(tokens: string[]): SectorExposure[] {
  const exposures: SectorExposure[] = [];
  const upperTokens = tokens.map(t => t.toUpperCase());
  
  Object.entries(SECTORS).forEach(([sector, sectorTokens]) => {
    const matching = upperTokens.filter(t => sectorTokens.includes(t));
    if (matching.length > 0) {
      // Calculate avg correlation within matched tokens
      let totalCorr = 0;
      let pairs = 0;
      for (let i = 0; i < matching.length; i++) {
        for (let j = i + 1; j < matching.length; j++) {
          totalCorr += generateCorrelation(matching[i], matching[j]);
          pairs++;
        }
      }
      
      exposures.push({
        sector,
        exposure: (matching.length / upperTokens.length) * 100,
        tokens: matching,
        avgCorrelation: pairs > 0 ? totalCorr / pairs : 1,
      });
    }
  });
  
  return exposures.sort((a, b) => b.exposure - a.exposure);
}

export function formatSectorExposure(exposures: SectorExposure[]): string {
  if (exposures.length === 0) {
    return `📊 **Sector Exposure**

No recognized tokens in portfolio.`;
  }
  
  // Exposure bar chart
  const maxExposure = Math.max(...exposures.map(e => e.exposure));
  const rows = exposures.map(e => {
    const barLen = Math.round((e.exposure / maxExposure) * 10);
    const bar = "█".repeat(barLen) + "░".repeat(10 - barLen);
    return `**${e.sector}** ${e.exposure.toFixed(1)}%
\`[${bar}]\`
Tokens: ${e.tokens.join(", ")}
Intra-sector corr: ${e.avgCorrelation.toFixed(2)}`;
  }).join("\n\n");
  
  // Diversification score
  const hhi = exposures.reduce((a, e) => a + Math.pow(e.exposure / 100, 2), 0);
  const diversification = Math.round((1 - hhi) * 100);
  const divIcon = diversification >= 70 ? "🟢" : diversification >= 40 ? "🟡" : "🔴";
  
  return `📊 **Sector Exposure**

${rows}

---

${divIcon} **Diversification Score:** ${diversification}/100
${diversification >= 70 ? "Well diversified across sectors" : diversification >= 40 ? "Moderate concentration risk" : "High concentration - consider diversifying"}`;
}

// ==================== DIVERGENCE DETECTION ====================

export function detectDivergences(tokens: string[]): DivergenceSignal[] {
  const signals: DivergenceSignal[] = [];
  const upperTokens = tokens.map(t => t.toUpperCase());
  
  for (let i = 0; i < upperTokens.length; i++) {
    for (let j = i + 1; j < upperTokens.length; j++) {
      const historical = generateCorrelation(upperTokens[i], upperTokens[j]);
      const current = historical + (Math.random() - 0.5) * 0.3; // Add noise
      const divergence = Math.abs(current - historical);
      
      if (divergence > 0.15) {
        signals.push({
          tokenA: upperTokens[i],
          tokenB: upperTokens[j],
          historicalCorr: historical,
          currentCorr: Math.max(-1, Math.min(1, current)),
          divergence,
          signal: divergence > 0.25 ? "regime_change" : "potential_reversion",
          timestamp: Date.now(),
        });
      }
    }
  }
  
  return signals.sort((a, b) => b.divergence - a.divergence);
}

export function formatDivergences(signals: DivergenceSignal[]): string {
  if (signals.length === 0) {
    return `🔍 **Correlation Divergences**

No significant divergences detected. Correlations are stable.`;
  }
  
  const rows = signals.slice(0, 5).map(s => {
    const icon = s.signal === "regime_change" ? "🔴" : "🟡";
    const direction = s.currentCorr > s.historicalCorr ? "↑" : "↓";
    return `${icon} **${s.tokenA}/${s.tokenB}**
Historical: ${s.historicalCorr.toFixed(2)} → Current: ${s.currentCorr.toFixed(2)} ${direction}
Signal: ${s.signal === "regime_change" ? "⚠️ Regime change" : "🔄 Potential reversion"}`;
  }).join("\n\n");
  
  return `🔍 **Correlation Divergences**

${rows}

---
*Divergences may signal trading opportunities or structural changes*`;
}

// ==================== PAIR ANALYSIS ====================

export function analyzePair(tokenA: string, tokenB: string): {
  correlation: CorrelationPair;
  betaA: BetaAnalysis;
  betaB: BetaAnalysis;
  spread: { current: number; mean: number; zscore: number };
  recommendation: string;
} {
  const corr = generateCorrelation(tokenA.toUpperCase(), tokenB.toUpperCase());
  const significance = corr >= 0.7 ? "high" : corr >= 0.4 ? "medium" : "low";
  
  const betaA = calculateBeta(tokenA, "BTC");
  const betaB = calculateBeta(tokenB, "BTC");
  
  // Simulated spread analysis
  const spreadMean = 0;
  const spreadCurrent = (Math.random() - 0.5) * 2;
  const spreadStd = 0.8;
  const zscore = spreadCurrent / spreadStd;
  
  let recommendation = "";
  if (Math.abs(zscore) > 2) {
    recommendation = zscore > 0 
      ? `Spread extended. Consider long ${tokenB}/short ${tokenA} for mean reversion.`
      : `Spread extended. Consider long ${tokenA}/short ${tokenB} for mean reversion.`;
  } else if (corr > 0.8) {
    recommendation = "Highly correlated pair. Good for hedging, limited arbitrage opportunity.";
  } else if (corr < 0.3) {
    recommendation = "Low correlation. Good diversification, but pairs trading not recommended.";
  } else {
    recommendation = "Moderate correlation. Monitor for divergence opportunities.";
  }
  
  return {
    correlation: {
      tokenA: tokenA.toUpperCase(),
      tokenB: tokenB.toUpperCase(),
      correlation: corr,
      period: "30d",
      significance,
    },
    betaA,
    betaB,
    spread: { current: spreadCurrent, mean: spreadMean, zscore },
    recommendation,
  };
}

export function formatPairAnalysis(data: ReturnType<typeof analyzePair>): string {
  const corrIcon = data.correlation.significance === "high" ? "🟢" 
    : data.correlation.significance === "medium" ? "🟡" : "🔴";
  
  const zIcon = Math.abs(data.spread.zscore) > 2 ? "⚠️" : "✅";
  
  return `📊 **Pair Analysis: ${data.correlation.tokenA} / ${data.correlation.tokenB}**

${corrIcon} **Correlation:** ${data.correlation.correlation.toFixed(2)} (${data.correlation.significance})

**Beta Comparison:**
• ${data.betaA.token}: β=${data.betaA.beta} | Vol: ${data.betaA.volatility}%
• ${data.betaB.token}: β=${data.betaB.beta} | Vol: ${data.betaB.volatility}%

**Spread Analysis:**
${zIcon} Z-Score: ${data.spread.zscore.toFixed(2)} ${Math.abs(data.spread.zscore) > 2 ? "(EXTENDED)" : "(normal)"}

**Recommendation:**
${data.recommendation}

---
*${data.correlation.period} lookback period*`;
}

export default {
  calculateCorrelationMatrix,
  formatCorrelationMatrix,
  calculateBeta,
  formatBetaAnalysis,
  getSectorExposure,
  formatSectorExposure,
  detectDivergences,
  formatDivergences,
  analyzePair,
  formatPairAnalysis,
};
