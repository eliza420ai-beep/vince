/**
 * VINCE Dream Team Agents
 * 
 * The complete roster of specialized AI agents.
 * 
 * | Agent    | Role | Lane |
 * |----------|------|------|
 * | Eliza    | CEO  | Knowledge base, research, brainstorm |
 * | VINCE    | CDO  | Objective data: options, perps, prices, news |
 * | Solus    | CFO  | Trading plan, sizing, execution |
 * | Otaku    | COO  | DeFi ops, onchain execution |
 * | Kelly    | CVO  | Lifestyle: travel, dining, health |
 * | Sentinel | CTO  | Ops, code, infra |
 * | ECHO     | CSO  | CT sentiment, X research, social alpha |
 */

export { default as elizaCharacter } from './eliza';
export { default as vinceCharacter } from './vince';
export { default as solusCharacter } from './solus';
export { default as otakuCharacter } from './otaku';
export { default as kellyCharacter } from './kelly';
export { default as sentinelCharacter } from './sentinel';
export { echoCharacter } from './echo.character';

// Type exports
export type { Character } from '@elizaos/core';
