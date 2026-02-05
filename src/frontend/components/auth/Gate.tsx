import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

export function Gate() {
  const { setInviteCode } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Enter an invite code.");
      return;
    }
    setInviteCode(trimmed);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight">VINCE</h1>
          <p className="text-muted-foreground text-sm mt-1">Push, not pull.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="invite" className="sr-only">
              Invite code
            </label>
            <input
              id="invite"
              type="text"
              placeholder="Invite code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoComplete="off"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-primary px-3 py-2 text-primary-foreground font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Continue
          </button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-4">
          MVP 4.20 · Gated access
        </p>
      </div>
    </div>
  );
}
