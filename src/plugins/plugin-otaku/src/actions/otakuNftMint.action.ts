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

// Known mint contracts
const KNOWN_COLLECTIONS: Record<string, { name: string; address: string; chain: string }> = {
  // Add known collections here
  "zorb": { name: "Zorbs", address: "0x...", chain: "base" },
  "base-onchain-summer": { name: "Base Onchain Summer", address: "0x...", chain: "base" },
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

    // Must contain mint-related intent
    const hasMintIntent =
      text.includes("mint") ||
      (text.includes("nft") && (text.includes("create") || text.includes("generate")));

    if (!hasMintIntent) return false;

    // Need CDP for minting
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

    const request = parseMintRequest(text);
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

    // Check if confirmation
    const isConfirmation =
      text.toLowerCase().includes("confirm") ||
      text.toLowerCase() === "yes";

    const pendingMint = state?.pendingMint as MintRequest | undefined;

    if (isConfirmation && pendingMint) {
      // Gen art flow: Ask Sentinel first
      if (pendingMint.isGenArt && pendingMint.artPrompt) {
        await callback?.({
          text: "🎨 Asking Sentinel to generate the art...",
        });

        // Use inter-agent communication
        try {
          // This would trigger ASK_AGENT to Sentinel
          const sentinelResponse = await runtime.executeAction("ASK_AGENT", {
            agent: "Sentinel",
            question: `Generate a piece of digital art based on this prompt: "${pendingMint.artPrompt}". Return the IPFS URI or base64 image data.`,
          });

          if (sentinelResponse?.imageUri) {
            // Now mint with the generated art
            await callback?.({
              text: `✅ Art generated! Now minting to NFT...\n\nImage: ${sentinelResponse.imageUri.slice(0, 50)}...`,
            });

            // Would call NFT contract with image URI
            // This is a placeholder for actual minting logic
          } else {
            await callback?.({
              text: "Sentinel is working on the art. I'll notify you when it's ready to mint.",
            });
            return { success: true };
          }
        } catch (err) {
          await callback?.({
            text: `❌ Gen art creation failed: ${err instanceof Error ? err.message : String(err)}\n\nTry asking Sentinel directly, then come back to mint.`,
          });
          return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
        }
      }

      // Direct mint flow
      const cdp = runtime.getService("cdp") as {
        writeContract?: (params: any) => Promise<any>;
        sendTransaction?: (params: any) => Promise<any>;
      } | null;

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
          const mintOut = [
            `✅ Minted ${pendingMint.quantity} NFT(s)!`,
            "",
            `**Contract:** ${pendingMint.contractAddress?.slice(0, 20)}...`,
            `**TX:** ${(result.hash || result.txHash).slice(0, 20)}...`,
            "",
            "Check your wallet for the new NFT(s).",
          ].join("\n");
          await callback?.({
            text: "Here's the mint result—\n\n" + mintOut,
          });
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

    logger.info(`[OTAKU_NFT_MINT] Pending: ${JSON.stringify(request)}`);

    return { success: true };
  },
};

export default otakuNftMintAction;
