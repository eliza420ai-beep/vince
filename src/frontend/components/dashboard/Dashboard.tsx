import React from "react";

export function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">
        ALOHA summary, paper bot stats, and widgets go here (hackathon track).
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-medium">ALOHA</h3>
          <p className="text-sm text-muted-foreground mt-1">Daily vibe check placeholder.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-medium">Paper bot</h3>
          <p className="text-sm text-muted-foreground mt-1">ML paper trading stats placeholder.</p>
        </div>
      </div>
    </div>
  );
}
