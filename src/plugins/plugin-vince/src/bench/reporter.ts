/**
 * VinceBench reporter: JSON and Markdown report generation.
 */
import * as fs from "fs";
import * as path from "path";
import type { VinceBenchReport } from "./types";

function formatDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/**
 * Generate Markdown report compatible with standup/day-report system.
 */
export function toMarkdown(report: VinceBenchReport): string {
  const { scoring, domainBreakdown, outcomeCorrelation, unmappedSignatures } =
    report;
  const lines: string[] = [
    `# VinceBench Report — ${formatDate(report.timestamp)}`,
    "",
    `## Final Score: ${scoring.finalScore.toFixed(2)} (Base: ${scoring.base.toFixed(2)}, Bonus: ${scoring.bonus.toFixed(2)}, Penalty: -${scoring.penalty.toFixed(2)})`,
    "",
    "### Domain Breakdown",
    "| Domain | Weight | Unique Sigs | Contribution |",
    "|--------|--------|-------------|-------------|",
  ];
  for (const [name, d] of Object.entries(domainBreakdown)) {
    lines.push(
      `| ${name} | ${d.weight} | ${d.uniqueSignatures} | ${d.contribution.toFixed(2)} |`,
    );
  }
  lines.push("");

  if (outcomeCorrelation) {
    lines.push("### Outcome Correlation", "");
    lines.push(
      `- High-score decisions win rate: ${(outcomeCorrelation.highScoreWinRate * 100).toFixed(1)}%`,
    );
    lines.push(
      `- Low-score decisions win rate: ${(outcomeCorrelation.lowScoreWinRate * 100).toFixed(1)}%`,
    );
    lines.push(
      `- Process-outcome correlation: ${outcomeCorrelation.correlation.toFixed(3)}`,
    );
    lines.push("");
  }

  const sortedDomains = Object.entries(domainBreakdown).sort(
    (a, b) => a[1].contribution - b[1].contribution,
  );
  if (sortedDomains.length > 0) {
    lines.push("### Weakest Areas");
    sortedDomains.slice(0, 5).forEach(([name, d], i) => {
      lines.push(
        `${i + 1}. ${name}: ${d.contribution.toFixed(2)} — ${d.uniqueSignatures} unique signature(s)`,
      );
    });
    lines.push("");
  }

  if (unmappedSignatures.length > 0) {
    lines.push("### Unmapped Signatures");
    lines.push(unmappedSignatures.join(", "));
    lines.push("");
  }

  lines.push(`*Run ID: ${report.runId} | Scenarios: ${report.scenarioCount}*`);
  return lines.join("\n");
}

/**
 * Write full report as JSON to a file.
 */
export function writeJsonReport(
  report: VinceBenchReport,
  outPath: string,
): void {
  const dir = path.dirname(outPath);
  if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");
}

/**
 * Write Markdown report to a file.
 */
export function writeMarkdownReport(
  report: VinceBenchReport,
  outPath: string,
): void {
  const dir = path.dirname(outPath);
  if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, toMarkdown(report), "utf-8");
}

/**
 * Write both JSON and Markdown reports to a directory.
 */
export function writeReports(
  report: VinceBenchReport,
  outDir: string,
): { jsonPath: string; mdPath: string } {
  const dateStr = formatDate(report.timestamp);
  const jsonPath = path.join(outDir, `bench-report-${dateStr}.json`);
  const mdPath = path.join(outDir, `bench-report-${dateStr}.md`);
  writeJsonReport(report, jsonPath);
  writeMarkdownReport(report, mdPath);
  return { jsonPath, mdPath };
}
