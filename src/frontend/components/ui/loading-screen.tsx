"use client";

import React from "react";
import TVNoise from "@/frontend/components/ui/tv-noise";

interface LoadingScreenProps {
  isWaitingForAgents?: boolean;
}

export function LoadingScreen({
  isWaitingForAgents = false,
}: LoadingScreenProps) {
  return (
    <div
      className="min-h-screen relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-background to-muted"
      aria-live="polite"
      aria-label="Loading agent"
    >
      {/* Blueprint background (same as widget) — low opacity for TV vibe */}
      <div className="absolute inset-0 -z-10">
        <img
          src="/assets/pc_blueprint.gif"
          alt=""
          className="size-full object-cover opacity-[0.12]"
          aria-hidden
        />
      </div>

      {/* TV noise overlay — dense, pervasive static (match reference) */}
      <TVNoise opacity={0.88} intensity={0.62} speed={40} />

      {/* Spinning TV (wireframe) — replaces circle spinner */}
      <div className="relative z-20 flex flex-col items-center justify-center text-center px-6 max-w-md">
        <img
          src="/assets/pc_blueprint.gif"
          alt=""
          className="w-48 h-48 object-contain animate-spin"
          aria-hidden
          style={{ animationDuration: "5s" }}
        />
        <p className="mt-6 text-xl text-foreground font-medium italic">
          Just code that compounds.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Explains every decision. Learns from every outcome. Measurably better.
        </p>
      </div>
    </div>
  );
}
