/**
 * OTAKU_NFT_MINT - Mint NFTs with Sentinel handoff for gen art
 *
 * Mint NFTs from contracts or coordinate with Sentinel for generative art:
 * - Direct mint: Mint from known collections
 * - Gen art: Sentinel creates → Otaku mints
 * - Free mint: Public/allowlist mints
 *
 * Supports ERC-721 and ERC-1155 standards.
 */

import {
  type Action,
  type ActionResult,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
} from "@elizaos/core";
import {
  setPending,
  getPending,
  clearPending,
  isConfirmation,
  hasPending,
} from "../utils/pendingCache";
import { parseNftMintIntentWithLLM } from "../utils/intentParser";
import { getArtUri, ensureIpfsUri } from "../utils/genArtPipeline";
import type { CdpService } from "../types/services";
import { appendNotificationEvent } from "../lib/notificationEvents";

const GEN_ART_MINT_CONTRACT = process.env.OTAKU_GEN_ART_MINT_CONTRACT ?? "";

interface MintRequest {
  collection?: string;
  contractAddress?: string;
  quantity: number;
  price?: string;
  tokenId?: string; // For ERC-1155
  chain?: string;
  isGenArt?: boolean;
  artPrompt?: string;
}

// Known mint contracts (mainnet)
const KNOWN_COLLECTIONS: Record<string, { name: string; address: string; chain: string }> = {
  "zorb": {
    name: "Zorbs",
    address: "0xCa21d4228cDCc68D4e23807E5e370C07577Dd152",
    chain: "ethereum",
  },
  "zorbs": {
    name: "Zorbs",
    address: "0xCa21d4228cDCc68D4e23807E5e370C07577Dd152",
    chain: "ethereum",
  },
  "base-onchain-summer": {
    name: "Base Onchain Summer",
    address: "0x1d568698f708dcbc4cc5abb9aefdc55376e23109",
    chain: "base",
  },
  "collective-zorb": {
    name: "Collective Zorb",
    address: "0x1d568698f708dcbc4cc5abb9aefdc55376e23109",
    chain: "base",
  },
};

/**
 * Parse mint request from natural language
 */
function parseMintRequest(text: string): MintRequest | null {
  const lower = text.toLowerCase();

  // Check if it's a gen art request (Sentinel handoff)
  const isGenArt =
    lower.includes("generate") ||
    lower.includes("create") ||
    lower.includes("make") ||
    lower.includes("gen art") ||
    lower.includes("ai art");

  let artPrompt: string | undefined;
  if (isGenArt) {
    // Extract art prompt
    const promptMatch = text.match(/(?:generate|create|make)\s+(?:an?\s+)?(?:nft\s+)?(?:of\s+)?(.+?)(?:\s+and\s+mint|\s+then\s+mint|$)/i);
    if (promptMatch) {
      artPrompt = promptMatch[1].trim();
    }
  }

  // Quantity
  const qtyMatch = text.match(/(?:mint|buy)\s+(\d+)/i);
  const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;

  // Contract address
  let contractAddress: string | undefined;
  const addressMatch = text.match(/(0x[a-fA-F0-9]{40})/);
  if (addressMatch) {
    contractAddress = addressMatch[1];
  }

  // Collection name
  let collection: string | undefined;
  for (const [key, val] of Object.entries(KNOWN_COLLECTIONS)) {
    if (lower.includes(key) || lower.includes(val.name.toLowerCase())) {
      collection = key;
      contractAddress = val.address;
      break;
    }
  }

  // Price
  let price: string | undefined;
  const priceMatch = text.match(/(?:for|at|price)\s+(\d+\.?\d*)\s*(eth|usdc)?/i);
  if (priceMatch) {
    price = priceMatch[1] + (priceMatch[2] || " ETH");
  } else if (lower.includes("free")) {
    price = "0";
  }

  // Chain
  const chainMatch = text.match(/on\s+(base|ethereum|zora|optimism)/i);
  const chain = chainMatch ? chainMatch[1].toLowerCase() : "base";

  // Token ID for ERC-1155
  const tokenIdMatch = text.match(/token\s*(?:id)?\s*#?(\d+)/i);
  const tokenId = tokenIdMatch ? tokenIdMatch[1] : undefined;

  // Need either contract address, collection, or gen art
  if (!contractAddress && !collection && !isGenArt) {
    return null;
  }

  return {
    collection,
    contractAddress,
    quantity,
    price,
    tokenId,
    chain,
    isGenArt,
    artPrompt,
  };
}

export const otakuNftMintAction: Action = {
  name: "OTAKU_NFT_MINT",
  description:
    "Mint NFTs from collections or coordinate with Sentinel for generative art creation and minting.",
  similes: [
    "MINT_NFT",
    "NFT_MINT",
    "GEN_ART_MINT",
    "CREATE_AND_MINT",
    "MINT_COLLECTION",
  ],
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Mint 1 NFT from 0x1234..." },
      },
      {
        name: "{{agent}}",
        content: {
          text: "**NFT Mint:**\n- Contract: 0x1234...\n- Quantity: 1\n- Price: Free mint\n\nType \"confirm\" to mint.",
          actions: ["OTAKU_NFT_MINT"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "Generate an AI art piece of a cyberpunk cat and mint it" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "**Gen Art + Mint:**\n- Prompt: \"cyberpunk cat\"\n- Creator: Sentinel (CTO)\n- Minter: Otaku (you)\n\nI'll ask Sentinel to generate the art, then mint it. Type \"confirm\" to proceed.",
          actions: ["OTAKU_NFT_MINT"],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();

    if (isConfirmation(text)) {
      return hasPending(runtime, message, "nftMint");
    }

    const hasMintIntent =
      text.includes("mint") ||
      (text.includes("nft") && (text.includes("create") || text.includes("generate")));

    if (!hasMintIntent) return false;

    const cdp = runtime.getService("cdp");
    return !!cdp;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<void | ActionResult> => {
    const text = message.content?.text ?? "";

    let request: MintRequest | null = parseMintRequest(text);
    if (!request) {
      const llmIntent = await parseNftMintIntentWithLLM(runtime, text);
      if (llmIntent) {
        request = {
          quantity: llmIntent.quantity,
          chain: llmIntent.chain,
          isGenArt: llmIntent.isGenArt,
          artPrompt: llmIntent.artPrompt,
        };
        if (llmIntent.collection) {
          const key = llmIntent.collection.toLowerCase().replace(/\s+/g, "-");
          const known = KNOWN_COLLECTIONS[key];
          if (known) {
            request.collection = known.name;
            request.contractAddress = known.address;
            request.chain = request.chain ?? known.chain;
          } else {
            request.collection = llmIntent.collection;
          }
        }
      }
    }
    if (!request) {
      await callback?.({
        text: [
          "I couldn't parse the mint request. Please specify:",
          "- Contract address (0x...) or collection name",
          "- Quantity to mint",
          "",
          "For gen art, say:",
          '- "Generate a [description] and mint it"',
          "",
          "Examples:",
          '- "Mint 1 NFT from 0x1234..."',
          '- "Generate an AI art piece of a sunset and mint it"',
        ].join("\n"),
      });
      return { success: false, error: new Error("Could not parse mint request") };
    }

    const pendingMint = await getPending<MintRequest>(runtime, message, "nftMint");

    if (isConfirmation(text) && pendingMint) {
      await clearPending(runtime, message, "nftMint");
      // Gen art pipeline: generate → IPFS (optional) → mint on Zora/Base with metadata
      if (pendingMint.isGenArt && pendingMint.artPrompt) {
        await callback?.({
          text: "🎨 Generating art (Sentinel / image service)...",
        });

        try {
          const artResult = await getArtUri(runtime, pendingMint.artPrompt);
          if (!artResult?.uri) {
            await callback?.({
              text: "No image was returned. Try asking Sentinel to generate art first, or ensure an image_generation service is configured.",
            });
            return { success: true };
          }

          const finalUri = await ensureIpfsUri(artResult.uri);
          await callback?.({
            text: `✅ Art ready: ${finalUri.slice(0, 60)}${finalUri.length > 60 ? "..." : ""}\n\nMinting on-chain...`,
          });

          const cdp = runtime.getService("cdp") as CdpService | null;
          if (GEN_ART_MINT_CONTRACT && cdp?.writeContract) {
            const tokenURI = finalUri;
            const result = await cdp.writeContract({
              address: GEN_ART_MINT_CONTRACT as `0x${string}`,
              abi: [
                "function mint(string calldata tokenURI) payable",
                "function mintWithURI(string memory tokenURI) payable",
                "function safeMint(address to, string memory uri) payable",
              ],
              functionName: "mint",
              args: [tokenURI],
              value: 0n,
            });
            if (result?.hash || result?.txHash) {
              const txHash = result.hash ?? result.txHash;
              await callback?.({
                text: `✅ Gen art minted!\n\n**Contract:** ${GEN_ART_MINT_CONTRACT.slice(0, 20)}...\n**TX:** ${txHash.slice(0, 24)}...\n**Token URI:** ${tokenURI.slice(0, 50)}...`,
              });
              await appendNotificationEvent(runtime, {
                action: "nft_minted",
                title: "NFT minted",
                subtitle: `Gen art: ${pendingMint.artPrompt?.slice(0, 40)}...`,
                metadata: { txHash },
              }, message.entityId);
              return { success: true };
            }
          }

          await callback?.({
            text: `Art generated and stored at: ${finalUri}\n\nTo mint on-chain, set \`OTAKU_GEN_ART_MINT_CONTRACT\` to a Zora/Base contract that supports \`mint(string tokenURI)\`.`,
          });
          return { success: true };
        } catch (err) {
          await callback?.({
            text: `❌ Gen art pipeline failed: ${err instanceof Error ? err.message : String(err)}\n\nTry asking Sentinel directly, then come back to mint.`,
          });
          return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
        }
      }

      const cdp = runtime.getService("cdp") as CdpService | null;

      if (!cdp) {
        await callback?.({
          text: "CDP service not available for minting.",
        });
        return { success: false, error: new Error("CDP service not available") };
      }

      await callback?.({
        text: `Minting ${pendingMint.quantity} NFT(s)...`,
      });

      try {
        // Build mint transaction
        const mintValue = pendingMint.price && pendingMint.price !== "0"
          ? BigInt(parseFloat(pendingMint.price) * 1e18)
          : 0n;

        let result: any;

        if (cdp.writeContract) {
          // Try standard mint function
          result = await cdp.writeContract({
            address: pendingMint.contractAddress as `0x${string}`,
            abi: [
              "function mint(uint256 quantity) payable",
              "function mint(address to, uint256 quantity) payable",
              "function publicMint(uint256 quantity) payable",
            ],
            functionName: "mint",
            args: [pendingMint.quantity],
            value: mintValue,
          });
        }

        if (result?.hash || result?.txHash) {
          const txHash = result.hash || result.txHash;
          const mintOut = [
            `✅ Minted ${pendingMint.quantity} NFT(s)!`,
            "",
            `**Contract:** ${pendingMint.contractAddress?.slice(0, 20)}...`,
            `**TX:** ${txHash.slice(0, 20)}...`,
            "",
            "Check your wallet for the new NFT(s).",
          ].join("\n");
          await callback?.({
            text: "Here's the mint result—\n\n" + mintOut,
          });
          await appendNotificationEvent(runtime, {
            action: "nft_minted",
            title: "NFT minted",
            subtitle: `${pendingMint.quantity} NFT(s) · ${pendingMint.contractAddress?.slice(0, 10)}...`,
            metadata: { txHash },
          }, message.entityId);
          return { success: true };
        }

        throw new Error("Mint transaction failed");
      } catch (err) {
        await callback?.({
          text: `❌ Mint failed: ${err instanceof Error ? err.message : String(err)}`,
        });
        return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
      }
    }

    // Build confirmation message
    const lines: string[] = [];

    if (request.isGenArt) {
      lines.push("**Gen Art + Mint:**");
      lines.push("");
      lines.push(`🎨 **Prompt:** "${request.artPrompt}"`);
      lines.push(`👨‍🎨 **Creator:** Sentinel (CTO)`);
      lines.push(`💎 **Minter:** Otaku (me)`);
      lines.push(`⛓️ **Chain:** ${request.chain}`);
      lines.push("");
      lines.push("Sentinel will generate the art, then I'll mint it as an NFT.");
    } else {
      lines.push("**NFT Mint:**");
      lines.push("");
      if (request.collection) {
        lines.push(`📦 **Collection:** ${KNOWN_COLLECTIONS[request.collection]?.name || request.collection}`);
      }
      lines.push(`📍 **Contract:** ${request.contractAddress?.slice(0, 20)}...`);
      lines.push(`🔢 **Quantity:** ${request.quantity}`);
      lines.push(`💰 **Price:** ${request.price || "Unknown (check contract)"}`);
      lines.push(`⛓️ **Chain:** ${request.chain}`);
    }

    lines.push("");
    lines.push('Type "confirm" to proceed.');

    await callback?.({ text: lines.join("\n") });
    await setPending(runtime, message, "nftMint", request);
    logger.info(`[OTAKU_NFT_MINT] Pending stored: ${JSON.stringify(request)}`);

    return { success: true };
  },
};

export default otakuNftMintAction;
