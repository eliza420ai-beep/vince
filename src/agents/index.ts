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
 * | Oracle   | —    | Prediction markets (Polymarket discovery, odds, portfolio) |
 */

export { character as elizaCharacter } from "./eliza";
export { vinceCharacter } from "./vince";
export { solusCharacter } from "./solus";
export { otakuCharacter } from "./otaku";
export { kellyCharacter } from "./kelly";
export { sentinelCharacter } from "./sentinel";
export { echoCharacter } from "./echo";
export { oracleCharacter } from "./oracle";
export { navalCharacter } from "./naval";
export { clawtermCharacter, clawtermAgent } from "./clawterm";

// Type exports
export type { Character } from "@elizaos/core";
