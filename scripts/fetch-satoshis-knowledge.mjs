#!/usr/bin/env node
/**
 * One-time script: fetch IkigaiLabsETH/satoshis knowledge/ into knowledge/kelly-btc/satoshis-knowledge/
 * Run from repo root: node scripts/fetch-satoshis-knowledge.mjs
 */
import fs from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const BASE = 'https://raw.githubusercontent.com/IkigaiLabsETH/satoshis/main/knowledge';
const OUT = 'knowledge/kelly-btc/satoshis-knowledge';

const PATHS = [
  'microstrategy.md',
  'strk-strf.md',
  'assets/1k-grind-challenge-microcap-strategy.md',
  'assets/altcoins-vs-bitcoin-cycle-analysis.md',
  'assets/crypto-experiments-lightning-network-evolution.md',
  'assets/crypto-related-equities.md',
  'assets/dogecoin-comprehensive-analysis.md',
  'assets/early-stage-growth-stocks.md',
  'assets/ethereum-digital-oil-thesis.md',
  'assets/financial-instruments.md',
  'assets/generational-wealth-transfer.md',
  'assets/gold-vs-bitcoin-hard-money-analysis.md',
  'assets/hyperliquid-analysis.md',
  'assets/innovation-stocks-analysis.md',
  'assets/livethelifetv-crypto-dashboard.md',
  'assets/moonpig-memecoin-analysis.md',
  'assets/msty-comprehensive-analysis.md',
  'assets/msty-freedom-calculator-strategy.md',
  'assets/nuclear-energy-sector.md',
  'assets/pump-fun-defi-casino-analysis.md',
  'assets/sharplink-gaming-ethereum-treasury-analysis.md',
  'assets/solana-blockchain-analysis.md',
  'assets/sui-blockchain-analysis.md',
  'assets/tesla-2025-strategy.md',
  'assets/tesla-covered-calls.md',
  'assets/vaneck-node-etf-onchain-economy.md',
  'assets/wealth-building-philosophy.md',
  'bitcoin/21energy-bitcoin-heating-revolution.md',
  'bitcoin/altbg-bitcoin-treasury-analysis.md',
  'bitcoin/bitaxe-home-mining-revolution.md',
  'bitcoin/bitcoin-backed-loans-lifestyle.md',
  'bitcoin/bitcoin-bonds.md',
  'bitcoin/bitcoin-defi-comprehensive-guide.md',
  'bitcoin/bitcoin-immersion-cooling-mining.md',
  'bitcoin/bitcoin-manifesto-comprehensive.md',
  'bitcoin/bitcoin-market-cycles-analysis.md',
  'bitcoin/bitcoin-mining-performance.md',
  'bitcoin/bitcoin-personalities.md',
  'bitcoin/bitcoin-real-estate-investment-strategy.md',
  'bitcoin/bitcoin-thesis.md',
  'bitcoin/bitcoin-treasury-capital-ab.md',
  'bitcoin/bitcoin-treasury-global-holdings.md',
  'bitcoin/bitcoin-whitepaper.md',
  'bitcoin/latest.md',
  'bitcoin/mara-bitcoin-mining-operations.md',
  'bitcoin/metaplanet-bitcoin-treasury-japan.md',
  'bitcoin/microstrategy-msty.md',
  'bitcoin/microstrategy-strf-preferred-stock.md',
  'bitcoin/million-dollar-mobius-bitcoin-lifestyle.md',
  'bitcoin/monaco-bitcoin-treasury-strategy.md',
  'bitcoin/satoshi-nakamoto.md',
  'bitcoin/twenty-one-capital-analysis.md',
  'business/bordeaux-luxury-estate-airstream-retreat.md',
  'business/cirrus-vision-jet-personal-aviation.md',
  'business/debt-taxation-fiscal-policy-comparison.md',
  'business/european-pension-crisis-ai-reckoning.md',
  'business/hill-hx50-helicopter-aviation.md',
  'business/premium-camper-vans-southwest-france-rental-business.md',
  'business/robotaxi-business-plan.md',
  'culinary/big-green-egg-bbq-mastery.md',
  'culinary/bordeaux-wines.md',
  'culinary/burgundy-wines.md',
  'culinary/coffee-regions.md',
  'culinary/loire-wines.md',
  'culinary/luxury-wine-regions-bordeaux-south-africa.md',
  'culinary/michelin-restaurants-bordeaux-region.md',
  'culinary/michelin-restaurants-monaco-cote-azur.md',
  'culinary/michelin-restaurants-san-sebastian.md',
  'culinary/michelin-restaurants-southwest-france.md',
  'culinary/premium-armagnac.md',
  'culinary/premium-cigars.md',
  'culinary/premium-cognac.md',
  'culinary/premium-gin.md',
  'culinary/premium-whiskey.md',
  'culinary/rhone-wines.md',
  'culinary/south-africa-wines.md',
  'culinary/tea-regions.md',
  'culinary/thermomix-tm7-kitchen-revolution.md',
  'culinary/world-class-wine-regions-comprehensive.md',
  'lifestyle/cost-of-living-geographic-arbitrage.md',
  'lifestyle/dubai-blockchain-hub-luxury-living-2025.md',
  'lifestyle/hybrid-catamarans-luxury-yachting-market.md',
  'lifestyle/luxury-outdoor-living.md',
  'lifestyle/premium-smart-home-brands.md',
  'lifestyle/sovereign-living.md',
  'lifestyle/sustainable-fitness-training.md',
  'media/communication-philosophy.md',
  'media/cryptopunks-nft-analysis.md',
  'media/digital-art-nft-investment-strategy.md',
  'media/generative-nft-art-2024-2025-1-intro.md',
  'media/generative-nft-art-2024-2025-2-boom-bust.md',
  'media/generative-nft-art-2024-2025-3-pain-points.md',
  'media/generative-nft-art-2024-2025-4-solutions.md',
  'media/generative-nft-art-2024-2025-5-conclusion.md',
  'media/ltl-art-philosophy-manifesto.md',
  'technology/ai-coding-cursor-workflow.md',
  'technology/ai-infrastructure-dgx-spark-vs-cloud-apis.md',
  'technology/energy-independence.md',
  'technology/lightning-network.md',
  'technology/otonomos-web3-legal-tech-platform.md',
  'technology/technology-lifestyle.md',
  'technology/vibe-coding-philosophy.md',
];

async function fetchAndWrite(relPath) {
  const url = `${BASE}/${relPath}`;
  const outPath = path.join(OUT, relPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const p of PATHS) {
    try {
      await fetchAndWrite(p);
      console.log('OK', p);
    } catch (e) {
      console.error('FAIL', p, e.message);
    }
  }
  console.log('Done.');
}

main();
