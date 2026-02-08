import { Button } from "@/frontend/components/ui/button";
import { Sparkles, X } from "lucide-react";
import {
  getAboutConfig,
  getAboutAgentDisplayName,
} from "./about-config";

interface AboutModalContentProps {
  onClose: () => void;
  agent?: { id?: string; name?: string } | null;
}

export function AboutModalContent({ onClose, agent }: AboutModalContentProps) {
  const config = getAboutConfig(agent?.name);
  const agentDisplayName = getAboutAgentDisplayName(agent?.name);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex justify-end w-full -mt-1">
        <Button
          variant="ghost"
          size="icon-sm"
          className="z-30 text-muted-foreground/70 hover:text-foreground hover:bg-white/5 rounded-full transition-all duration-200"
          onClick={onClose}
          aria-label="Close about modal"
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex flex-col text-foreground my-2 space-y-5 max-h-[85vh] overflow-hidden">
        {/* Hero */}
        <header className="flex flex-col gap-2 shrink-0">
          {agent?.name && (
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
              aria-hidden
            >
              About {agentDisplayName}
            </p>
          )}
          <h2 className="text-3xl font-display leading-none sm:text-4xl tracking-tight">
            {config.headline}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground max-w-2xl">
            {config.intro}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-muted-foreground/90">
            <span className="flex flex-wrap items-center gap-x-1">
              {config.tags.map((tag, i) => (
                <span key={tag.label} className="inline-flex items-center gap-1">
                  {i > 0 && <span className="text-muted-foreground/50 px-0.5" aria-hidden>·</span>}
                  {tag.withSparkles && (
                    <Sparkles className="size-3 text-primary/80 shrink-0" aria-hidden />
                  )}
                  {tag.label}
                </span>
              ))}
            </span>
            <img
              src="/assets/elizaos_badge.svg"
              alt="Powered by ElizaOS"
              className="h-6 opacity-80 shrink-0"
            />
          </div>
        </header>

        {/* Capabilities - compact list with descriptions */}
        <section className="space-y-1.5 shrink-0" aria-labelledby="capabilities-heading">
          <h3
            id="capabilities-heading"
            className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/90"
          >
            Capabilities
          </h3>
          <ul className="space-y-1 text-sm text-foreground/95 list-none">
            {config.capabilities.map((c) => (
              <li key={c.title} className="leading-snug">
                <span className="font-medium text-foreground">{c.title}</span>
                <span className="text-muted-foreground"> — {c.description}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Powered by - compact list with summaries */}
        <section className="space-y-1.5 shrink-0" aria-labelledby="plugins-heading">
          <h3
            id="plugins-heading"
            className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/90"
          >
            Powered by
          </h3>
          <ul className="space-y-1 text-sm text-foreground/95 list-none">
            {config.plugins.map((p) => (
              <li key={p.name} className="leading-snug">
                <span className="font-medium text-foreground">{p.name}</span>
                <span className="text-muted-foreground"> — {p.summary}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Pro tip - single line, no box */}
        <section className="shrink-0" aria-labelledby="protip-heading">
          <p id="protip-heading" className="text-xs text-muted-foreground">
            Pro tip — {config.proTip}
          </p>
        </section>
      </div>
    </div>
  );
}
