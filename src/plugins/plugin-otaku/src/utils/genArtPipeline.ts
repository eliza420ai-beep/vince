/**
 * Gen art pipeline: generate → (optional) IPFS upload → mint metadata.
 * Used by OTAKU_NFT_MINT when isGenArt is true.
 */

import type { IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";

export interface GenArtResult {
  uri: string;
  mime?: string;
  prompt?: string;
}

/**
 * Try to obtain an image URI for the given prompt:
 * 1. Use runtime image_generation service if available
 * 2. Otherwise try ASK_AGENT to Sentinel (or any agent that can return imageUri)
 */
export async function getArtUri(
  runtime: IAgentRuntime,
  prompt: string,
): Promise<GenArtResult | null> {
  const imageService = runtime.getService("image_generation") as {
    generateImage?(prompt: string): Promise<string>;
  } | null;

  if (imageService?.generateImage) {
    try {
      const url = await imageService.generateImage(prompt);
      if (url) return { uri: url, prompt };
    } catch (err) {
      logger.debug(`[Otaku] Image service generate failed: ${err}`);
    }
  }

  const executeAction = (runtime as any).executeAction as
    | ((
        name: string,
        opts: { agent: string; question: string },
      ) => Promise<{ imageUri?: string; image?: string; url?: string }>)
    | undefined;

  if (executeAction) {
    try {
      const sentinelResponse = await executeAction("ASK_AGENT", {
        agent: "Sentinel",
        question: `Generate a single digital art image for this prompt: "${prompt}". Return the image as a URL (IPFS or HTTPS) or base64 data URL in the response.`,
      });
      const uri =
        sentinelResponse?.imageUri ??
        sentinelResponse?.url ??
        (typeof sentinelResponse?.image === "string"
          ? sentinelResponse.image
          : null);
      if (uri) return { uri, prompt };
    } catch (err) {
      logger.debug(`[Otaku] ASK_AGENT for art failed: ${err}`);
    }
  }

  return null;
}

/**
 * If the result is base64 data, optionally upload to IPFS (when PINATA_API_KEY is set).
 * Returns the final URI (ipfs://... or original URL/data URL).
 */
export async function ensureIpfsUri(uri: string): Promise<string> {
  if (uri.startsWith("ipfs://") || uri.startsWith("https://")) return uri;

  const pinataKey = process.env.PINATA_API_KEY ?? process.env.PINATA_JWT;
  if (!pinataKey && uri.startsWith("data:")) {
    return uri;
  }

  if (uri.startsWith("data:") && pinataKey) {
    try {
      const base64 = uri.replace(/^data:image\/\w+;base64,/, "");
      const blob = Buffer.from(base64, "base64");
      const form = new FormData();
      form.append(
        "file",
        new Blob([blob], { type: "image/png" }),
        "gen-art.png",
      );
      const res = await fetch(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${pinataKey}` },
          body: form,
        },
      );
      if (res.ok) {
        const data = await res.json();
        const cid = data.IpfsHash ?? data.cid;
        if (cid) return `ipfs://${cid}`;
      }
    } catch (err) {
      logger.warn(`[Otaku] Pinata upload failed: ${err}`);
    }
  }

  return uri;
}

/**
 * Build minimal ERC-721/1155 metadata JSON for tokenURI (for off-chain metadata).
 * Caller can upload this to IPFS and pass ipfs://Qm.../metadata.json as tokenURI.
 */
export function buildTokenMetadata(
  artUri: string,
  name: string,
  description: string,
): string {
  return JSON.stringify({
    name,
    description,
    image: artUri.startsWith("ipfs://") ? artUri : artUri,
    external_url: "",
    attributes: [],
  });
}
