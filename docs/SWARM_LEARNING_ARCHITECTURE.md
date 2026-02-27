# 🌊 MULTI-AGENT SWARM LEARNING ARCHITECTURE

## Vision: Collective Intelligence for Trading

Transform VINCE's individual Thompson Sampling into a **collective intelligence network** where 10 agents learn together, share insights, and make collaborative decisions.

## 🧬 Core Concept

```
Individual Learning (Current):
VINCE → Thompson Sampling → Signal Weights → Trade Decision

Swarm Learning (Target):
┌─ VINCE ─────┐
├─ ECHO ──────┤ → Shared Knowledge Pool → Collective Decision
├─ Oracle ────┤      ↕                        ↓
├─ Solus ─────┤ Thompson Sampling        Enhanced Trade
├─ Otaku ─────┤   + Cross-Agent              ↓
├─ Kelly ─────┤    Learning            Risk Assessment
├─ Sentinel ──┤                              ↓
├─ Eliza ─────┤                       Final Execution
└─ Clawterm ──┘
```

## 🎯 Agent Specializations

### Core Trading Agents
- **VINCE**: Market data, technical analysis, execution
- **ECHO**: Social sentiment, X pulse, news analysis
- **Oracle**: Prediction markets, crowd wisdom, probability

### Specialized Knowledge Agents
- **Solus**: Options flow, volatility surface, Greeks
- **Otaku**: DeFi yields, on-chain metrics, execution
- **Kelly**: Macro trends, lifestyle patterns, risk preferences

### Meta-Intelligence Agents
- **Sentinel**: Code patterns, system performance, meta-learning
- **Eliza**: Research synthesis, knowledge curation
- **Clawterm**: Data discovery, research coordination

## 🧠 Swarm Learning Architecture

### 1. Shared Bandit State
```typescript
interface SwarmBanditState {
  globalState: {
    sources: Map<string, BetaParams>;
    totalOutcomes: number;
    agentContributions: Map<string, number>;
  };

  agentSpecializations: {
    vince: MarketSignalSources[];
    echo: SentimentSignalSources[];
    oracle: PredictionSignalSources[];
    solus: OptionsSignalSources[];
    // ... etc
  };

  crossAgentLearning: {
    signalCorrelations: Map<string, Map<string, number>>;
    agentReliability: Map<string, BetaParams>;
    consensusHistory: ConsensusDecision[];
  };
}
```

### 2. Multi-Agent Signal Sources

**VINCE Sources:**
- BinanceTopTraders, CoinGlass, MarketRegime, DeribitIV

**ECHO Sources:**
- XSentiment, NewsSentiment, SocialMomentum, InfluencerSignals

**Oracle Sources:**
- PolymarketOdds, PredictionAccuracy, CrowdWisdom, EventProbabilities

**Solus Sources:**
- OptionsFlow, IVRank, SkewSignals, VolSurface, PutCallRatio

**Otaku Sources:**
- OnChainMetrics, DeFiYields, LiquidityFlows, WhaleMovements

### 3. Swarm Consensus Mechanisms

#### A. Weighted Voting
Swarm voting is implemented with the shared contracts in  
`src/plugins/plugin-vince/src/types/swarm.ts`:

```typescript
export type SwarmDirection = "long" | "short" | "neutral";

export interface AgentVote {
  agentId: string;
  direction: SwarmDirection;
  /** 0–1 confidence (not a percentage) */
  confidence: number;
  supportingSignals: string[];
  riskAssessment: number;
  reasoning: string;
}

export interface SwarmConsensus {
  votes: AgentVote[];
  weightedDirection: SwarmDirection;
  /** 0–1 confidence for the swarm decision */
  confidenceLevel: number;
  /** 0–1 dissent score (higher = more disagreement) */
  dissentScore: number;
  participatingAgents: string[];
  consensusReached: boolean;
  decisionTimestamp: number;
  /** ID used to attribute trade outcomes back to this decision */
  consensusId?: string;
}
```

#### B. Hierarchical Decision Tree
```
Level 1: Individual Agent Analysis
  ├─ VINCE: Technical + Market Data
  ├─ ECHO: Sentiment Analysis
  └─ Oracle: Prediction Markets

Level 2: Cross-Agent Validation
  ├─ Signal Correlation Check
  ├─ Agent Reliability Weighting
  └─ Conflict Resolution

Level 3: Swarm Consensus
  ├─ Weighted Voting
  ├─ Risk Assessment
  └─ Final Decision
```

## 🔄 Learning Flow

### Individual Learning (Enhanced)
1. **Agent analyzes signals** from their specialization
2. **Thompson Sampling** within agent domain
3. **Share insights** with swarm knowledge pool
4. **Receive feedback** from other agents

### Cross-Agent Learning (New)
1. **Signal correlation discovery**: "When VINCE sees X, ECHO usually sees Y"
2. **Agent reliability tracking**: "Oracle is 78% accurate, ECHO is 65% accurate"
3. **Consensus pattern learning**: "When 3+ agents agree, win rate is 82%"
4. **Conflict resolution learning**: "VINCE vs ECHO disagreement → wait for confirmation"

### Swarm Evolution (Revolutionary)
1. **Collective intelligence emergence**: Swarm becomes smarter than sum of parts
2. **Distributed exploration**: Agents explore different signal combinations
3. **Knowledge transfer**: Successful patterns spread across agents
4. **Meta-learning**: Swarm learns how to learn better

## 🚀 Implementation Plan

### Phase 1: Shared Bandit Infrastructure
- [x] Extend VinceWeightBanditService for multi-agent state (swarm-aware weight tilt via `getSourceWinRate`)
- [x] Create SwarmCoordinationService
- [x] Add inter-agent communication bus
- [x] Design agent specialization mappings

### Phase 2: Cross-Agent Learning
- [x] Signal correlation tracking
- [x] Agent reliability scoring
- [ ] Cross-agent knowledge transfer
- [x] Conflict detection and resolution

### Phase 3: Swarm Consensus
- [x] Weighted voting mechanisms
- [ ] Consensus threshold optimization
- [x] Dissent analysis and handling
- [x] Risk-adjusted decision making (consensus/veto + size scaling in paper bot)

### Phase 4: Advanced Swarm Intelligence
- [ ] Emergent pattern detection
- [ ] Distributed exploration strategies
- [ ] Meta-learning algorithms
- [ ] Swarm performance optimization

## 📊 Expected Benefits

### Exponential Learning
- **10x faster learning**: Shared knowledge across agents
- **Reduced overfitting**: Diverse signal perspectives
- **Better generalization**: Multiple validation sources

### Enhanced Accuracy
- **Consensus accuracy**: When agents agree, confidence is higher
- **Error correction**: Agents catch each other's mistakes
- **Signal diversity**: Less correlation risk

### Adaptive Intelligence
- **Dynamic specialization**: Agents adapt roles based on market conditions
- **Emergent strategies**: Swarm develops novel trading approaches
- **Continuous evolution**: System gets smarter over time

## 🎯 Key Innovations

1. **Multi-Agent Thompson Sampling**: First trading system with swarm bandit learning
2. **Agent Specialization**: Each agent contributes unique signal expertise
3. **Consensus Mechanisms**: Democratic decision making with reliability weighting
4. **Cross-Agent Learning**: Agents learn from each other's successes/failures
5. **Emergent Intelligence**: Swarm behavior exceeds individual agent capabilities

## 🔬 Testing Strategy

### Unit Testing
- Individual agent bandit learning
- Cross-agent communication
- Consensus mechanism validation
- Signal correlation accuracy

### Integration Testing
- Multi-agent coordination
- Swarm decision making
- Knowledge transfer verification
- Conflict resolution handling

### Performance Testing
- Swarm vs individual performance
- Learning speed comparison
- Accuracy improvements
- Resource utilization

## 📈 Success Metrics

### Learning Efficiency
- **Time to convergence**: Swarm vs individual learning speed
- **Signal discovery rate**: New effective signal combinations found
- **Adaptation speed**: How quickly swarm adapts to market changes

### Decision Quality
- **Consensus accuracy**: Win rate when agents agree vs disagree
- **Risk-adjusted returns**: Sharpe ratio improvements
- **Drawdown reduction**: Better risk management through diversity

### Emergent Intelligence
- **Novel patterns**: Strategies discovered by swarm but not individuals
- **Cross-asset learning**: Knowledge transfer between different markets
- **Meta-performance**: Swarm learning to learn better over time

## 🌊 The Future: Swarm Trading

This architecture creates the foundation for:
- **Autonomous trading swarms** that operate without human intervention
- **Adaptive market making** with real-time strategy evolution
- **Cross-market intelligence** that learns patterns across all asset classes
- **Emergent alpha generation** through collective pattern discovery

**The swarm is more than the sum of its parts!** 🧬⚡

### Runtime Flags and Rollout Modes

Swarm behaviour is feature-flagged so it can be rolled out safely:

- `VINCE_SWARM_ENABLED`: when `true`, the paper bot consults the swarm coordinator for consensus before opening trades.
- `VINCE_SWARM_MIN_CONFIDENCE`: minimum consensus confidence (0–1) required to proceed; below this threshold trades are vetoed and recorded as avoided decisions.
- `VINCE_SWARM_REGIME_TUNING_ENABLED`: when `true`, the paper bot applies regime-conditional swarm tuning for **paper trades only**, shrinking size or vetoing entries in regimes where the swarm bandit has historically underperformed. Never increases size.
- `SWARM_INCLUDE_ECHO`, `SWARM_INCLUDE_ORACLE`, `SWARM_INCLUDE_SOLUS`, `SWARM_INCLUDE_OTAKU`, `SWARM_INCLUDE_KELLY`, `SWARM_INCLUDE_SENTINEL`, `SWARM_INCLUDE_ELIZA`, `SWARM_INCLUDE_CLAWTERM`, `SWARM_INCLUDE_NAVAL`: per-agent participation flags for multi-agent voting (VINCE is always included).

Four practical modes (used in tests and rollout):

1. **VINCE-only (swarm off):**  
   - `VINCE_SWARM_ENABLED=false`  
   - All `SWARM_INCLUDE_*` flags ignored.  
   - Behaviour: classic single-agent bandit; no consensus calls, no swarm vetoes.
2. **VINCE-only with swarm gating:**  
   - `VINCE_SWARM_ENABLED=true`  
   - All `SWARM_INCLUDE_*` flags unset/`false`.  
   - Behaviour: orchestrator builds a vote from VINCE only; consensus is effectively VINCE-only, but trades can still be vetoed or resized based on `VINCE_SWARM_MIN_CONFIDENCE` and dissent, and outcomes are recorded into the swarm bandit state.
3. **Limited swarm:**  
   - `VINCE_SWARM_ENABLED=true`  
   - A small subset of `SWARM_INCLUDE_*` flags enabled (e.g. `SWARM_INCLUDE_ECHO=true`, `SWARM_INCLUDE_ORACLE=true`, others `false`).  
   - Behaviour: multi-agent consensus across VINCE + selected agents; used for staged rollout and calibration.
4. **Full swarm-capable:**  
   - `VINCE_SWARM_ENABLED=true`  
   - All relevant `SWARM_INCLUDE_*` flags enabled once calibration and backtests show that multi-agent consensus improves or matches VINCE-only behaviour.  
   - Behaviour: all ten agents contribute votes where they have real data; neutral/low-confidence placeholders remain neutral until their domains are wired.