import React, { useState } from "react";
import { sendMessage } from "../../lib/api";

const config =
  typeof window !== "undefined" && (window as any).ELIZA_CONFIG
    ? (window as any).ELIZA_CONFIG
    : { agentId: "", apiBase: "" };

export function ChatPanel() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "agent"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !config.agentId) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await sendMessage({ agentId: config.agentId, text });
      const reply = res?.data?.message?.text ?? "No response.";
      setMessages((prev) => [...prev, { role: "agent", text: reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: `Error: ${e instanceof Error ? e.message : "Send failed"}.` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-muted-foreground text-sm">Send a message to VINCE.</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "text-right" : "text-left"}
          >
            <span
              className={
                m.role === "user"
                  ? "inline-block rounded-lg bg-primary px-3 py-2 text-primary-foreground text-sm"
                  : "inline-block rounded-lg bg-muted px-3 py-2 text-muted-foreground text-sm"
              }
            >
              {m.text}
            </span>
          </div>
        ))}
        {loading && (
          <p className="text-muted-foreground text-sm italic">VINCE is thinking…</p>
        )}
      </div>
      <div className="border-t border-border p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message VINCE…"
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={loading || !config.agentId}
          />
          <button
            type="submit"
            disabled={loading || !config.agentId || !input.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
