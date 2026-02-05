import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { clsx } from "clsx";

const nav = [
  { id: "chat", label: "Chat", icon: "💬" },
  { id: "dashboard", label: "Dashboard", icon: "📊" },
];

export function Sidebar({
  activeView,
  onSelectView,
}: {
  activeView: string;
  onSelectView: (id: string) => void;
}) {
  const { signOut } = useAuth();

  return (
    <aside
      className={clsx(
        "flex flex-col w-56 shrink-0 border-r border-border bg-card text-foreground",
        "min-h-screen"
      )}
    >
      <div className="p-4 border-b border-border">
        <h2 className="font-bold text-lg tracking-tight">VINCE</h2>
        <p className="text-xs text-muted-foreground">4.20 MVP</p>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {nav.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectView(item.id)}
            className={clsx(
              "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
              activeView === item.id
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-2 border-t border-border">
        <button
          type="button"
          onClick={signOut}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
