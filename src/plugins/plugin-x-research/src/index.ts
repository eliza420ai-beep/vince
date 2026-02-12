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
 * 
 * Configuration:
 * - X_BEARER_TOKEN (required): X API v2 bearer token
 * - X_RESEARCH_QUALITY_LIST_ID (optional): Curated list for quality filtering
 * 
 * @module plugin-x-research
 */

import type { Plugin } from '@elizaos/core';
import {
  xPulseAction,
  xVibeAction,
  xThreadAction,
  xAccountAction,
  xMentionsAction,
  xNewsAction,
  xWatchlistAction,
  xSaveResearchAction,
} from './actions';

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
  ],

  // Providers can be used by other plugins (e.g., VINCE ALOHA)
  providers: [],

  // No evaluators yet
  evaluators: [],
};

// Export everything
export * from './types';
export * from './constants';
export * from './services';
export * from './actions';

export default xResearchPlugin;
