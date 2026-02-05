import React, { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "./contexts/AuthContext";
import { Gate } from "./components/auth/Gate";
import { Sidebar } from "./components/layout/Sidebar";
import { ChatPanel } from "./components/chat/ChatPanel";
import { Dashboard } from "./components/dashboard/Dashboard";

export function App() {
  const { isAuthenticated } = useAuth();
  const [activeView, setActiveView] = useState<"chat" | "dashboard">("chat");

  if (!isAuthenticated) {
    return <Gate />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar activeView={activeView} onSelectView={(id) => setActiveView(id as "chat" | "dashboard")} />
      <main className="flex-1 flex flex-col min-w-0">
        <motion.div
          key={activeView}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="flex-1 flex flex-col min-h-0"
        >
          {activeView === "chat" && <ChatPanel />}
          {activeView === "dashboard" && <Dashboard />}
        </motion.div>
      </main>
    </div>
  );
}
