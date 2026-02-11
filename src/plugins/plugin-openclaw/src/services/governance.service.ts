/**
 * OpenClaw Governance Tracking Service
 * 
 * DAO proposals, voting, governance analytics, delegate tracking
 */

import { logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = ".openclaw-data";
const GOVERNANCE_FILE = path.join(DATA_DIR, "governance.json");

// ==================== TYPES ====================

export interface Proposal {
  id: string;
  protocol: string;
  title: string;
  status: "active" | "passed" | "failed" | "pending" | "executed";
  type: "core" | "treasury" | "parameter" | "grant" | "other";
  votesFor: number;
  votesAgainst: number;
  quorum: number;
  currentQuorum: number;
  startDate: string;
  endDate: string;
  summary: string;
  impact: "high" | "medium" | "low";
  url?: string;
}

export interface GovernanceAlert {
  id: string;
  protocol: string;
  type: "new_proposal" | "vote_ending" | "quorum_reached" | "result";
  message: string;
  timestamp: number;
  proposal?: Proposal;
}

export interface WatchedProtocol {
  protocol: string;
  addedAt: number;
  alerts: boolean;
}

export interface DelegateInfo {
  protocol: string;
  address: string;
  name?: string;
  votingPower: string;
  delegators: number;
  proposalsVoted: number;
  participation: number;
}

export interface GovernanceStats {
  protocol: string;
  totalProposals: number;
  activeProposals: number;
  passRate: number;
  avgParticipation: number;
  treasurySize: string;
  topDelegates: DelegateInfo[];
}

// ==================== STORAGE ====================

interface GovernanceData {
  watchedProtocols: WatchedProtocol[];
  alertHistory: GovernanceAlert[];
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadGovernanceData(): GovernanceData {
  ensureDataDir();
  if (!fs.existsSync(GOVERNANCE_FILE)) {
    return { watchedProtocols: [], alertHistory: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(GOVERNANCE_FILE, "utf-8"));
  } catch {
    return { watchedProtocols: [], alertHistory: [] };
  }
}

function saveGovernanceData(data: GovernanceData): void {
  ensureDataDir();
  fs.writeFileSync(GOVERNANCE_FILE, JSON.stringify(data, null, 2));
}

// ==================== MOCK DATA GENERATORS ====================

const PROTOCOLS = [
  { name: "Uniswap", treasury: "$2.8B" },
  { name: "Aave", treasury: "$850M" },
  { name: "Compound", treasury: "$450M" },
  { name: "MakerDAO", treasury: "$1.2B" },
  { name: "Arbitrum", treasury: "$3.5B" },
  { name: "Optimism", treasury: "$2.1B" },
  { name: "ENS", treasury: "$950M" },
  { name: "Lido", treasury: "$380M" },
  { name: "Curve", treasury: "$220M" },
  { name: "Jito", treasury: "$180M" },
];

const PROPOSAL_TYPES = ["core", "treasury", "parameter", "grant", "other"] as const;
const STATUSES = ["active", "passed", "failed", "pending"] as const;

function generateMockProposal(protocol: string): Proposal {
  const type = PROPOSAL_TYPES[Math.floor(Math.random() * PROPOSAL_TYPES.length)];
  const status = Math.random() > 0.7 ? "active" : STATUSES[Math.floor(Math.random() * STATUSES.length)];
  
  const titles: Record<typeof type, string[]> = {
    core: [
      "Protocol Upgrade to v3.5",
      "Cross-chain Expansion Proposal",
      "Security Module Enhancement",
      "New Governance Framework",
    ],
    treasury: [
      "Treasury Diversification Proposal",
      "Grant Fund Allocation Q1",
      "Strategic Investment in Protocol X",
      "Treasury Management Strategy",
    ],
    parameter: [
      "Adjust Fee Parameters",
      "Update Collateral Ratios",
      "Modify Reward Distribution",
      "Change Quorum Requirements",
    ],
    grant: [
      "Ecosystem Development Grant",
      "Developer Incentive Program",
      "Community Builder Rewards",
      "Research Grant Application",
    ],
    other: [
      "Community Proposal: New Feature",
      "Governance Process Improvement",
      "Partnership Ratification",
      "Working Group Formation",
    ],
  };
  
  const title = titles[type][Math.floor(Math.random() * titles[type].length)];
  const votesFor = Math.floor(Math.random() * 50000000) + 10000000;
  const votesAgainst = Math.floor(Math.random() * 30000000) + 1000000;
  const quorum = 40000000;
  const currentQuorum = votesFor + votesAgainst;
  
  const startDate = new Date(Date.now() - Math.floor(Math.random() * 7) * 86400000);
  const endDate = new Date(startDate.getTime() + 7 * 86400000);
  
  return {
    id: `${protocol.toLowerCase().replace(/\s/g, "-")}-${Math.floor(Math.random() * 1000)}`,
    protocol,
    title,
    status: status as Proposal["status"],
    type,
    votesFor,
    votesAgainst,
    quorum,
    currentQuorum,
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    summary: `This proposal aims to ${title.toLowerCase()}. If passed, it will be implemented within 48 hours of the voting period ending.`,
    impact: type === "core" || type === "treasury" ? "high" : type === "parameter" ? "medium" : "low",
    url: `https://governance.${protocol.toLowerCase()}.io/proposals/${Math.floor(Math.random() * 1000)}`,
  };
}

function generateMockDelegate(protocol: string): DelegateInfo {
  const names = ["whale.eth", "governance.dao", "defi_chad", "protocol_council", "community_delegate", "anon_voter", "treasury_guardian"];
  const name = names[Math.floor(Math.random() * names.length)];
  
  return {
    protocol,
    address: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
    name,
    votingPower: `${(Math.random() * 5 + 0.5).toFixed(2)}M`,
    delegators: Math.floor(Math.random() * 500) + 50,
    proposalsVoted: Math.floor(Math.random() * 50) + 10,
    participation: Math.floor(Math.random() * 30) + 70,
  };
}

// ==================== PROPOSALS ====================

export function getActiveProposals(protocol?: string): Proposal[] {
  const protocols = protocol 
    ? [{ name: protocol.charAt(0).toUpperCase() + protocol.slice(1).toLowerCase(), treasury: "$1B" }]
    : PROTOCOLS.slice(0, 5);
  
  return protocols.flatMap(p => {
    const count = Math.floor(Math.random() * 3) + 1;
    return Array.from({ length: count }, () => {
      const proposal = generateMockProposal(p.name);
      proposal.status = "active";
      return proposal;
    });
  }).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
}

export function getProposalHistory(protocol: string, limit = 10): Proposal[] {
  return Array.from({ length: limit }, () => generateMockProposal(protocol));
}

export function formatProposal(proposal: Proposal): string {
  const statusIcons: Record<Proposal["status"], string> = {
    active: "🟢",
    passed: "✅",
    failed: "❌",
    pending: "⏳",
    executed: "⚡",
  };
  
  const impactIcons: Record<Proposal["impact"], string> = {
    high: "🔴",
    medium: "🟡",
    low: "🟢",
  };
  
  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const forPercent = totalVotes > 0 ? (proposal.votesFor / totalVotes * 100).toFixed(1) : "0";
  const againstPercent = totalVotes > 0 ? (proposal.votesAgainst / totalVotes * 100).toFixed(1) : "0";
  const quorumPercent = (proposal.currentQuorum / proposal.quorum * 100).toFixed(0);
  
  const forBar = "█".repeat(Math.round(parseFloat(forPercent) / 10));
  const againstBar = "█".repeat(Math.round(parseFloat(againstPercent) / 10));
  
  const daysLeft = Math.max(0, Math.ceil((new Date(proposal.endDate).getTime() - Date.now()) / 86400000));
  
  return `**${proposal.title}**
${statusIcons[proposal.status]} Status: ${proposal.status.toUpperCase()} | ${impactIcons[proposal.impact]} Impact: ${proposal.impact}
🏛️ ${proposal.protocol} | 📋 ${proposal.type}

**Votes:**
✅ For: ${(proposal.votesFor / 1000000).toFixed(2)}M (${forPercent}%)
\`[${forBar.padEnd(10, "░")}]\`
❌ Against: ${(proposal.votesAgainst / 1000000).toFixed(2)}M (${againstPercent}%)
\`[${againstBar.padEnd(10, "░")}]\`

📊 Quorum: ${quorumPercent}% (${proposal.currentQuorum >= proposal.quorum ? "✅ Met" : "⏳ Pending"})
⏰ ${proposal.status === "active" ? `${daysLeft} days left` : `Ended ${proposal.endDate}`}

${proposal.summary}`;
}

export function formatActiveProposals(proposals: Proposal[]): string {
  if (proposals.length === 0) {
    return `🏛️ **Active Proposals**

No active governance proposals.

Watch protocols: \`governance watch <protocol>\``;
  }
  
  const byProtocol = new Map<string, Proposal[]>();
  proposals.forEach(p => {
    const existing = byProtocol.get(p.protocol) || [];
    existing.push(p);
    byProtocol.set(p.protocol, existing);
  });
  
  const sections: string[] = [];
  byProtocol.forEach((props, protocol) => {
    const rows = props.map(p => {
      const statusIcon = p.status === "active" ? "🟢" : "⏳";
      const daysLeft = Math.max(0, Math.ceil((new Date(p.endDate).getTime() - Date.now()) / 86400000));
      const forPercent = ((p.votesFor / (p.votesFor + p.votesAgainst)) * 100).toFixed(0);
      return `${statusIcon} **${p.title}**
   ${p.type} | For: ${forPercent}% | ${daysLeft}d left
   ID: \`${p.id}\``;
    }).join("\n\n");
    
    sections.push(`**${protocol}** (${props.length} active)\n${rows}`);
  });
  
  return `🏛️ **Active Governance Proposals**

${sections.join("\n\n---\n\n")}

---
Details: \`governance proposal <id>\`
Watch: \`governance watch <protocol>\``;
}

// ==================== WATCHLIST ====================

export function getWatchedProtocols(): WatchedProtocol[] {
  return loadGovernanceData().watchedProtocols;
}

export function watchProtocol(protocol: string): WatchedProtocol {
  const data = loadGovernanceData();
  const existing = data.watchedProtocols.find(p => p.protocol.toLowerCase() === protocol.toLowerCase());
  if (existing) return existing;
  
  const newWatch: WatchedProtocol = {
    protocol: protocol.charAt(0).toUpperCase() + protocol.slice(1).toLowerCase(),
    addedAt: Date.now(),
    alerts: true,
  };
  data.watchedProtocols.push(newWatch);
  saveGovernanceData(data);
  return newWatch;
}

export function unwatchProtocol(protocol: string): boolean {
  const data = loadGovernanceData();
  const idx = data.watchedProtocols.findIndex(p => p.protocol.toLowerCase() === protocol.toLowerCase());
  if (idx === -1) return false;
  data.watchedProtocols.splice(idx, 1);
  saveGovernanceData(data);
  return true;
}

export function formatWatchedProtocols(protocols: WatchedProtocol[]): string {
  if (protocols.length === 0) {
    return `🏛️ **Governance Watchlist**

No protocols being watched.

Add: \`governance watch <protocol>\`
Available: ${PROTOCOLS.slice(0, 5).map(p => p.name).join(", ")}...`;
  }
  
  const rows = protocols.map((p, i) => {
    const date = new Date(p.addedAt).toLocaleDateString();
    return `${i + 1}. **${p.protocol}** ${p.alerts ? "🔔" : "🔕"}
   Added: ${date}`;
  }).join("\n\n");
  
  return `🏛️ **Governance Watchlist**

${rows}

---
Remove: \`governance unwatch <protocol>\`
Check: \`governance active\``;
}

// ==================== DELEGATES ====================

export function getTopDelegates(protocol: string, limit = 10): DelegateInfo[] {
  return Array.from({ length: limit }, () => generateMockDelegate(protocol))
    .sort((a, b) => parseFloat(b.votingPower) - parseFloat(a.votingPower));
}

export function formatDelegates(delegates: DelegateInfo[], protocol: string): string {
  const rows = delegates.slice(0, 10).map((d, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
    return `${medal} **${d.name || d.address}**
   Power: ${d.votingPower} | Delegators: ${d.delegators}
   Votes: ${d.proposalsVoted} | Participation: ${d.participation}%`;
  }).join("\n\n");
  
  return `👥 **Top Delegates: ${protocol}**

${rows}

---
*Voting power determines proposal influence*`;
}

// ==================== STATS ====================

export function getGovernanceStats(protocol: string): GovernanceStats {
  const protocolInfo = PROTOCOLS.find(p => p.name.toLowerCase() === protocol.toLowerCase()) || { name: protocol, treasury: "$500M" };
  
  return {
    protocol: protocolInfo.name,
    totalProposals: Math.floor(Math.random() * 200) + 50,
    activeProposals: Math.floor(Math.random() * 5) + 1,
    passRate: Math.floor(Math.random() * 30) + 60,
    avgParticipation: Math.floor(Math.random() * 20) + 40,
    treasurySize: protocolInfo.treasury,
    topDelegates: getTopDelegates(protocol, 3),
  };
}

export function formatGovernanceStats(stats: GovernanceStats): string {
  const topDelegatesStr = stats.topDelegates.slice(0, 3).map((d, i) => 
    `${["🥇", "🥈", "🥉"][i]} ${d.name || d.address}: ${d.votingPower}`
  ).join("\n");
  
  return `📊 **Governance Stats: ${stats.protocol}**

**Overview:**
• Total Proposals: ${stats.totalProposals}
• Active: ${stats.activeProposals}
• Pass Rate: ${stats.passRate}%
• Avg Participation: ${stats.avgParticipation}%

**Treasury:** ${stats.treasurySize}

**Top Delegates:**
${topDelegatesStr}

---
View all: \`governance delegates ${stats.protocol.toLowerCase()}\``;
}

// ==================== ALERTS ====================

export function checkGovernanceAlerts(): GovernanceAlert[] {
  const data = loadGovernanceData();
  if (data.watchedProtocols.length === 0) return [];
  
  const alerts: GovernanceAlert[] = [];
  
  data.watchedProtocols.forEach(watched => {
    // Simulate alerts
    if (Math.random() > 0.7) {
      const proposal = generateMockProposal(watched.protocol);
      proposal.status = "active";
      
      const alertTypes = ["new_proposal", "vote_ending", "quorum_reached"] as const;
      const type = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      
      const messages: Record<typeof type, string> = {
        new_proposal: `New ${proposal.type} proposal: "${proposal.title}"`,
        vote_ending: `Vote ending soon: "${proposal.title}" - ${Math.ceil((new Date(proposal.endDate).getTime() - Date.now()) / 86400000)}d left`,
        quorum_reached: `Quorum reached on "${proposal.title}" - Currently ${((proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100).toFixed(0)}% for`,
      };
      
      alerts.push({
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        protocol: watched.protocol,
        type,
        message: messages[type],
        timestamp: Date.now(),
        proposal,
      });
    }
  });
  
  // Save to history
  if (alerts.length > 0) {
    data.alertHistory.push(...alerts);
    data.alertHistory = data.alertHistory.slice(-100); // Keep last 100
    saveGovernanceData(data);
  }
  
  return alerts;
}

export function formatGovernanceAlerts(alerts: GovernanceAlert[]): string {
  if (alerts.length === 0) {
    return `🔔 **Governance Alerts**

No new alerts. All watched protocols are quiet.`;
  }
  
  const rows = alerts.map(a => {
    const typeIcons: Record<GovernanceAlert["type"], string> = {
      new_proposal: "📋",
      vote_ending: "⏰",
      quorum_reached: "📊",
      result: "✅",
    };
    return `${typeIcons[a.type]} **${a.protocol}** - ${a.type.replace(/_/g, " ")}
${a.message}`;
  }).join("\n\n");
  
  return `🔔 **Governance Alerts**

${rows}

---
*${alerts.length} new alert(s)*`;
}

export default {
  getActiveProposals,
  getProposalHistory,
  formatProposal,
  formatActiveProposals,
  getWatchedProtocols,
  watchProtocol,
  unwatchProtocol,
  formatWatchedProtocols,
  getTopDelegates,
  formatDelegates,
  getGovernanceStats,
  formatGovernanceStats,
  checkGovernanceAlerts,
  formatGovernanceAlerts,
};
