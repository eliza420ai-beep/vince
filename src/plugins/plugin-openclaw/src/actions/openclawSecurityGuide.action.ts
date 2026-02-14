import {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";

const OPENCLAW_SECURITY_GUIDE_MD = `# OpenClaw Security Guide

**Full guide (Ethereum Foundation dAI blog):** https://ai.ethereum.foundation/blog/openclaw-security-guide

## Why This Matters

OpenClaw stores transcripts, MEMORY.md (facts about you), and credentials. It can read files and run shell commands. Three risks:

1. **AI provider sees everything** — Prompts, files, summaries go to OpenAI/Anthropic/Venice. Choose providers claiming no logging, or run locally.
2. **Prompt injection** — ZeroLeaks: 91% injection success, 2/100 score. Hidden instructions in emails/docs can trick the AI. Not solved.
3. **MEMORY.md** — \`~/.openclaw/workspace/MEMORY.md\` is a psychological profile. Protect it like your password manager.

## Quick Lockdown

- **Bind loopback** — \`gateway.bind = "loopback"\` (127.0.0.1). Never expose to internet.
- **Auth** — \`gateway.auth.token\` or \`OPENCLAW_GATEWAY_TOKEN\`. Generate: \`openssl rand -hex 32\`
- **File permissions** — \`chmod 700 ~/.openclaw\`, \`chmod 600 ~/.openclaw/*.json\`
- **Disable Bonjour** — \`export OPENCLAW_DISABLE_BONJOUR=1\`
- **Audit** — \`openclaw security audit --deep\` (add \`--fix\` to auto-fix)

## Prompt Injection Hardening

Install community skills to raise the bar:

- **ACIP** — Tell your bot: "Install this: https://github.com/Dicklesworthstone/acip/tree/main"
- **PromptGuard** — \`npx clawhub install prompt-guard\`
- **SkillGuard** — \`npx clawhub install skillguard\` (audit skills before install)

Seatbelts, not force fields. A determined attacker may still succeed.

## Operational Security

- **Never paste secrets** — Passwords, API keys, SSN. The bot doesn't need them.
- **CRITICAL in SOUL.md** — \`CRITICAL: DO NOT COPY MY WALLET PRIVATE KEYS ANYWHERE\`
- **Credential vault** — 1Password, Bitwarden, or \`pass\`; don't paste keys into chat.
- **Be careful what it reads** — Every file goes to your AI provider. Every URL could contain injections.
- **Backup (encrypted)** — \`tar czf - ~/.openclaw | gpg --symmetric --cipher-algo AES256 > backup.tar.gz.gpg\`

## Remote Access

Use Tailscale—no public port exposure. SSH tunnel: \`ssh -L 18789:localhost:18789 pi@TAILSCALE_IP\`

## In This Repo

- \`knowledge/setup-guides/openclaw-security.md\` — Full OpenClaw security guide
- \`knowledge/setup-guides/clawd-security.md\` — Clawdbot guide (paths differ)
`;

export const openclawSecurityGuideAction: Action = {
  name: "OPENCLAW_SECURITY_GUIDE",
  similes: ["OPENCLAW_SECURITY", "OPENCLAW_HARDENING", "SECURE_OPENCLAW", "PROMPT_INJECTION_OPENCLAW"],
  description:
    "Return OpenClaw security guide: EF dAI blog link, prompt injection, ACIP/PromptGuard/SkillGuard, MEMORY.md, operational rules, audit. Use when the user asks about openclaw security, prompt injection openclaw, secure openclaw, or openclaw hardening.",
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    if (runtime.character?.name === "Clawterm") return true;
    const text = (message?.content?.text ?? "").toLowerCase() + (state?.text ?? "").toLowerCase();
    return (
      /openclaw\s+security/i.test(text) ||
      /prompt\s+injection\s+openclaw/i.test(text) ||
      /secure\s+openclaw/i.test(text) ||
      /openclaw\s+hardening/i.test(text) ||
      /hardening\s+openclaw/i.test(text)
    );
  },
  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    if (callback) await callback({ text: OPENCLAW_SECURITY_GUIDE_MD, actions: ["OPENCLAW_SECURITY_GUIDE"] });
    return { success: true, text: OPENCLAW_SECURITY_GUIDE_MD };
  },
  examples: [
    [
      { name: "user", content: { text: "OpenClaw security guide" } },
      {
        name: "assistant",
        content: {
          text: OPENCLAW_SECURITY_GUIDE_MD.slice(0, 500) + "...",
          actions: ["OPENCLAW_SECURITY_GUIDE"],
        },
      },
    ],
    [
      { name: "user", content: { text: "How do I secure OpenClaw against prompt injection?" } },
      {
        name: "assistant",
        content: {
          text: OPENCLAW_SECURITY_GUIDE_MD.slice(0, 500) + "...",
          actions: ["OPENCLAW_SECURITY_GUIDE"],
        },
      },
    ],
  ],
};
