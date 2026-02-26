/**
 * VINCE Multi-Agent Swarm Intelligence Collective
 *
 * Nine specialized agents coordinating through SwarmCoordinationService:
 * - VINCE: Technical analysis and market data (CDO)
 * - ECHO: Sentiment analysis and social intelligence (CSO)
 * - Oracle: Prediction markets and probability analysis (CPO)
 * - Solus: Options and volatility analysis (CFO)
 * - Otaku: DeFi and on-chain analysis with execution (COO)
 * - Kelly: Lifestyle and macro trends coordination (CVO)
 * - Sentinel: System analysis and meta-learning (CTO)
 * - Eliza: Knowledge synthesis and research leadership (CEO)
 * - Clawterm: Data discovery and research coordination (Research Terminal)
 */

export { vinceAgent as vince } from './vince';
export { echoAgent as echo } from './echo';
export { oracleAgent as oracle } from './oracle';
export { solusAgent as solus } from './solus';
export { otakuAgent as otaku } from './otaku';
export { kellyAgent as kelly } from './kelly';
export { sentinelAgent as sentinel } from './sentinel';
export { elizaAgent as eliza } from './eliza';
export { clawtermAgent as clawterm } from './clawterm';

// Default export for primary agent
export { vinceAgent as default } from './vince';
