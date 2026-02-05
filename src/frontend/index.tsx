import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import React from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { App } from "./App";
import "./index.css";

const queryClient = new QueryClient();

interface ElizaConfig {
  agentId: string;
  apiBase: string;
}

declare global {
  interface Window {
    ELIZA_CONFIG?: ElizaConfig;
  }
}

function Root() {
  React.useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<Root />);
}

export interface AgentPanel {
  name: string;
  path: string;
  component: React.ComponentType<{ agentId: string }>;
  icon?: string;
  public?: boolean;
  shortLabel?: string;
}

const PanelComponent: React.FC<{ agentId: string }> = ({ agentId }) => (
  <div>VINCE {agentId}</div>
);

export const panels: AgentPanel[] = [
  {
    name: "Example",
    path: "example",
    component: PanelComponent,
    icon: "Book",
    public: false,
    shortLabel: "Example",
  },
];

export * from "./utils";
