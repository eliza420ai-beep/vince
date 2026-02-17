/**
 * Plugin X Research
 * 
 * ALOHA-style X/Twitter research for crypto sentiment and alpha.
 * 
 * Features:
 * - X_PULSE: Full briefing on CT sentiment (the north star)
 * - Topic-based search with quality weighting
 * - Sentiment analysis with contrarian detection
 * - Volume spike detection
 * - Thread discovery
 * - ECHO only: daily "What's the trade" task (belief-router style → file)
 * 
 * Configuration:
 * - X_BEARER_TOKEN (required): X API v2 bearer token
 * - X_RESEARCH_QUALITY_LIST_ID (optional): Curated list for quality filtering
 * - ECHO_WHATS_THE_TRADE_ENABLED / ECHO_WHATS_THE_TRADE_HOUR: daily task (ECHO only)
 * 
 * @module plugin-x-research
 */

import type { Plugin } from '@elizaos/core';
import { logger } from '@elizaos/core';
import {
  xPulseAction,
  xVibeAction,
  xThreadAction,
  xAccountAction,
  xMentionsAction,
  xNewsAction,
  xWatchlistAction,
  xSaveResearchAction,
  xSearchAction,
  clawtermDayReportAction,
  whatsTheTradeAction,
} from './actions';
import { registerWhatsTheTradeDailyTask } from './tasks/whatsTheTradeDaily.tasks';

export const xResearchPlugin: Plugin = {
  name: 'plugin-x-research',
  description: 'X/Twitter research plugin for crypto sentiment and alpha',

  actions: [
    xPulseAction,
    xVibeAction,
    xThreadAction,
    xAccountAction,
    xMentionsAction,
    xNewsAction,
    xWatchlistAction,
    xSaveResearchAction,
    xSearchAction,
    clawtermDayReportAction,
    whatsTheTradeAction,
  ],

  providers: [],

  evaluators: [],

  init: async (_config, runtime) => {
    if (runtime.character?.name === 'ECHO') {
      try {
        await registerWhatsTheTradeDailyTask(runtime);
      } catch (e) {
        logger.warn('[plugin-x-research] Failed to register ECHO whats-the-trade daily task:', e);
      }
    }
  },
};

// Export everything
export * from './types';
export * from './constants';
export * from './services';
export * from './actions';
export { setLastResearch } from './store/lastResearchStore';

export default xResearchPlugin;
