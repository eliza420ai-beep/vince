# Product Requirements Document (PRD): Enhancing Vince - A Multi-Agent AI Squad for Crypto Trading

## 1. Document Overview
### 1.1 Purpose
This PRD outlines recommendations for evolving the Vince project, a multi-agent AI system focused on crypto trading intelligence with a self-improving paper trading bot. Based on analysis of the GitHub repository (https://github.com/IkigaiLabsETH/vince), inferred structure of key scripts like `train_models.py`, and best practices for XGBoost in trading models, this document synthesizes feedback into actionable requirements. The goal is to refine the system while adhering to core principles: agentic engineering, lean architecture, fast iteration, self-modification, and security.

Vince embodies a "co-building with sentient pals" approach, with agents collaborating on market data, sentiment analysis, trade execution, and ops. Feedback highlights strengths in its push-based model, ML loop, and X integration, while suggesting improvements for scalability, robustness, and performance.

### 1.2 Version History
- Version: 1.0
- Date: February 15, 2026
- Author: Grok (xAI) - Feedback synthesis for @ikigailabsETH
- Stakeholders: Ikigai Labs ETH team, potential contributors/users in crypto/DeFi space.

### 1.3 Scope
- **In Scope**: Enhancements to agent architecture, ML pipeline (focusing on `train_models.py` and XGBoost), integration with X/tools, security, and self-improvement loops.
- **Out of Scope**: Full rewrite of core agents; hardware/infra specifics beyond Supabase/Bun; live trading (focus on paper trading for now).
- Assumptions: System runs in a controlled environment with access to Supabase, Discord/Slack, and X APIs. Users are crypto-savvy developers/traders.

## 2. Business Goals and Objectives
### 2.1 Problem Statement
Current Vince is a strong MVP: Lean multi-agent setup with daily standups, sentiment-weighted signals (X at 0.5), and an ML loop that trains XGBoost models, exports to ONNX, and auto-reloads from Supabase. However, pain points include:
- Scalability for growing trade data.
- Robustness in error handling and testing.
- Optimization of XGBoost for trading specifics (e.g., time-series handling, drift).
- Deeper self-inspection for agents to catch structural debt.

### 2.2 Objectives
- **Primary**: Improve agent performance and ML accuracy to achieve >1.5 Sharpe ratio in paper trading backtests.
- **Secondary**: Enhance iterability (weekly releases), security (sandboxed agents), and UX (dashboard for leaderboards).
- **Key Results**:
  - Reduce training loop time by 20% via optimizations.
  - Increase model adaptability to market shifts via frequent retraining.
  - Enable parallel agent runs for features/bugs/docs.

### 2.3 Success Metrics
- ML Metrics: Accuracy >85%, Sharpe ratio >1.5, low MAE in price predictions.
- System Metrics: Uptime >99%, iteration speed (e.g., <1 hour for model retrain/upload).
- User Metrics: Engagement via Discord pushes; feedback from public builds.
- Qualitative: Alignment with principles like "fix forward" and "treat agents like engineers with short memory."

## 3. User Personas and Use Cases
### 3.1 User Personas
- **Crypto Trader (End-User)**: Seeks proactive trading signals; values sentiment integration and leaderboard UX.
- **Developer/Builder (@ikigailabsETH)**: Focuses on system design; needs tools for self-modification and debugging.
- **Ops Engineer**: Monitors security and performance; prioritizes guardrails and logging.

### 3.2 Use Cases
1. **Daily Standup and Signal Generation**:
   - Agents (VINCE for market data, ECHO for X sentiment) collaborate in-thread via ASK_AGENT.
   - Output: Push notifications to Discord/Slack with trade recommendations.

2. **ML Self-Improvement Loop**:
   - Log paper trades to Supabase.
   - Run `train_models.py` periodically: Load data, train XGBoost, export ONNX, upload.
   - Agents reload models seamlessly for better predictions.

3. **Self-Inspection and Refactoring**:
   - Agents query: "What tools do you see? Where is the failure?"
   - Human owns direction; agents execute fixes in parallel.

4. **Error Handling in Prod**:
   - Detect failures (e.g., data insufficiency), patch quickly, re-run without rollback.

## 4. Functional Requirements
### 4.1 Core Features
1. **Agent Architecture**:
   - Maintain squad: VINCE (market), ECHO (X sentiment), Solus (trades), Kelly (concierge), Sentinel (ops/code).
   - Add parallel execution: One agent for features, one for bugs, one for docs/tests.
   - Implement voice-friendly prompting for natural context in sessions.

2. **ML Pipeline (`train_models.py` and XGBoost Integration)**:
   - **Data Loading**: From Supabase tables (e.g., 'paper_trades'); handle features like price deltas, X sentiment (weighted 0.5), avoided decisions.
   - **Training**: Use XGBoost Regressor/Classifier; simple params (n_estimators=100, learning_rate=0.1); evaluate with MAE/accuracy.
   - **Export/Upload**: To ONNX via skl2onnx; store in Supabase with metadata (timestamp, score).
   - Enhancements:
     - Add batching for large datasets.
     - Integrate Optuna for hyperparam tuning (max_depth, subsample, etc.).
     - Time-series specifics: Lag features, walk-forward validation to avoid leakage.

3. **Self-Modification and Feedback Loops**:
   - Agents inspect tools/docs/source: Prompt for confusion/failures.
   - Post-build prompts: "What to refactor? Where is complexity? Missing tests?"
   - Log outcomes for retraining: Incorporate factor explanations and avoided decisions.

4. **X and External Integrations**:
   - Deepen X sentiment via x-research; weight in signals.
   - Add real-time event analysis (e.g., chronological searches).

5. **UX and Outputs**:
   - Dashboard for leaderboards (trade performance).
   - Push-based notifications; no pull queries.

### 4.2 Non-Functional Requirements
- **Performance**: Training <30 mins; inference latency <1s.
- **Scalability**: Handle 10k+ trades; use Dask for parallel if needed.
- **Security**: Sandbox agents; allowlists for system access; scoped permissions (e.g., Supabase buckets).
- **Reliability**: Error resilience (retries, thresholds like min data=100); comprehensive logging.
- **Maintainability**: Readable code, good naming; unit tests with pytest.

## 5. Technical Specifications
### 5.1 Architecture Diagram
(High-level; visualize as text:)
- **Frontend**: Dashboard (web-based, minimal).
- **Backend**: Bun runtime; Supabase for storage/persistence.
- **Agents**: Multi-threaded via ASK_AGENT; plugins (e.g., plugin-vince, plugin-personality).
- **ML Layer**: Python (XGBoost, skl2onnx, Supabase SDK); cron-triggered `train_models.py`.
- **Integrations**: X APIs, Discord/Slack webhooks.

### 5.2 Data Models
- **Paper Trades Table (Supabase)**: Columns: timestamp, features (json), label (profit/loss), sentiment_score.
- **Model Metadata**: name, timestamp, score, version.

### 5.3 APIs and Interfaces
- Internal: Agent comms via in-thread messaging.
- External: X search for sentiment; no public API yet (consider for v2).

### 5.4 Dependencies
- Core: xgboost, pandas, supabase-py, skl2onnx.
- Avoid bloat: No heavy frameworks; prune aggressively.

## 6. Design and User Experience
- **Principles**: Agent-centric over app-centric; human directs, agents execute.
- **Workflow**: Start simple (e.g., add one rule at a time); voice prompts for context.
- **Visuals**: Leaderboard tables; no complex UI—focus on notifications.

## 7. Risks and Mitigations
- **Risk**: Model drift in volatile crypto markets.
  - Mitigation: Daily/weekly retrains; monitor with SHAP for feature shifts.
- **Risk**: Security breaches from agent access.
  - Mitigation: Explicit approvals, sandboxing.
- **Risk**: Overfitting in XGBoost.
  - Mitigation: Regularization, cross-validation.
- **Risk**: Data leakage.
  - Mitigation: Chronological splits, no shuffle in train/test.

## 8. Timeline and Roadmap
### 8.1 Phases
- **Phase 1 (1-2 Weeks)**: Implement inferred `train_models.py` improvements (tuning, error handling); add tests.
- **Phase 2 (2-4 Weeks)**: Enhance agent parallelism and self-inspection prompts.
- **Phase 3 (4-6 Weeks)**: Integrate advanced XGBoost features (e.g., SHAP); deepen X analysis.
- **Phase 4 (Ongoing)**: Prod monitoring; weekly iterations based on public feedback.

### 8.2 Milestones
- MVP Refinement: Functional ML loop with ONNX.
- Beta: Parallel agents, dashboard.
- Release: Hardened security, documented policies (e.g., MULTI_AGENT.md).

## 9. Appendices
### 9.1 XGBoost Pros/Cons Recap (from Feedback)
| Aspect | Pros | Cons |
|--------|------|------|
| Performance | High accuracy on tabular data; handles missing values. | Sensitive to params; overfitting risk. |
| Scalability | Fast training; distributed support. | Data prep crucial to avoid bias. |
| Interpretability | Feature importance; SHAP integration. | Somewhat black-box. |
| Adaptability | Great for time-series with lags. | Needs reframing for sequences. |
| Deployment | ONNX export for agents. | Drift requires retrains. |

### 9.2 Additional Feedback Notes
- Align with "models have personalities": Stick with stable XGBoost for code-reading depth.
- Build in public: Ship fast, iterate weekly.
- Role shift: Less manual coding, more architecture design.

This PRD serves as a blueprint for taking Vince to the next level—lean, agentic, and performant. If you'd like to iterate on specifics (e.g., add wireframes or run simulations), let me know, @ikigailabsETH! 🚀