/**
 * Plugin ERC-8004: Trustless Agents
 *
 * On-chain agent identity, reputation, and validation via ERC-8004.
 *
 * The standard introduces three lightweight registries:
 * - Identity Registry (ERC-721): Agent discovery & portable identifiers
 * - Reputation Registry: Feedback & attestation system (0-100 scores)
 * - Validation Registry: Independent verification hooks (TEE, zkML, stake)
 *
 * Actions:
 * - ERC8004_REGISTER: Register agent identity on-chain
 * - ERC8004_REPUTATION: Check agent reputation scores
 *
 * Why ERC-8004 for VINCE?
 * - Otaku becomes a verifiable, trustless execution agent
 * - Other protocols can validate Otaku before delegating tasks
 * - Reputation builds over time based on successful executions
 * - Cross-organizational agent discovery
 *
 * @see https://8004.org
 * @see https://eips.ethereum.org/EIPS/eip-8004
 */

import type { Plugin } from "@elizaos/core";
import { ERC8004Service } from "./services";
import { erc8004RegisterAction, erc8004ReputationAction } from "./actions";

export const erc8004Plugin: Plugin = {
  name: "erc8004",
  description:
    "ERC-8004 Trustless Agents - on-chain identity, reputation, and validation",
  actions: [erc8004RegisterAction, erc8004ReputationAction],
  services: [ERC8004Service as any],
  providers: [],
  evaluators: [],
};

export default erc8004Plugin;

// Re-exports
export { ERC8004Service } from "./services";
export { erc8004RegisterAction, erc8004ReputationAction } from "./actions";
export type * from "./types";
