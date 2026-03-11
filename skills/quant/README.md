# Quant skill

Quantitative stack for **prediction markets** and **binary contracts**: one narrative from coin-flip intuition through institutional-grade simulation.

- **SKILL.md** — When to use, story order (Parts I–VIII), key formulas, minimal runnable examples.
- **reference.md** — Full narrative and runnable code for every layer: Monte Carlo, importance sampling, particle filter, variance reduction, copulas, agent-based simulation, production stack.

Read parts in order; each section builds on the last. Not financial advice; do your own research.

---

## How we use this and where it fits in the repo

**Location:** `skills/quant/` — self-contained Python stack (1.py–8.py, run_all.py, tests). No TypeScript/plugin code; Cursor and agents use it via the skill (SKILL.md + reference.md) and, if you want, by running the scripts.

**Why it exists:** The narrative explains why treating a prediction-market price as “the” probability is wrong (Part I), then gives runnable layers: Monte Carlo for binary contracts (Part II), Brier for calibration (Part II), importance sampling for tail events (Part III), particle filters for real-time updates (Part IV), stratified/variance reduction (Part V), copulas for correlated contracts (Part VI), and agent-based order-book dynamics (Part VII). That’s the same conceptual stack you’d use for Polymarket-style contracts, election or macro events, and risk/calibration.

**How we use it today:**

1. **Cursor / agents** — When you or an agent asks about “prediction market”, “Polymarket”, “binary contract”, “Brier score”, “particle filter”, “importance sampling”, “copula”, “tail dependence”, or “agent-based simulation”, the **quant skill** (SKILL.md, reference.md) is the single story. Read parts in order; the math and code align with 1.py–8.py.
2. **Running the stack** — From `skills/quant/`: `python run_all.py` runs the story in order with one-line summaries; `python 1.py` … `python 8.py` run single layers; `python -m unittest discover -s tests -p "test_*.py" -v` runs the test suite. Use this to sanity-check the math or to demo the pipeline.
3. **Brier and calibration in the app** — Plugin-vince’s **PredictionTrackerService** ([`src/plugins/plugin-vince/src/services/predictionTracker.service.ts`](../src/plugins/plugin-vince/src/services/predictionTracker.service.ts)) computes Brier on resolved predictions (same formula as 2.py: mean squared error of probability vs outcome). Kelly’s flywheel score, Sentinel’s investor report, graduation gate, and “how did we do” all ask VINCE for `predictionBrier` / `predictionCount`; that calibration notion is exactly what Part II (Brier) in this skill describes. The Python here is the reference implementation and the story; the live Brier is in the plugin.
4. **Polymarket / Oracle** — Oracle is the Polymarket read-only agent (odds, discovery, portfolio). Post-mortems and standups often say “pull Polymarket odds” or “prediction market regime” for context. The quant skill explains how to *model* those markets (single contract MC, correlated copulas, particle filter for live updates, agent-based dynamics)—so when we add or refine “probability engine” or “regime from Polymarket” logic, the skill is the design and math source.
5. **Optional future use** — Validate PredictionTracker Brier against 2.py; feed live Polymarket or poll prices into 5.py (particle filter) for a filtered probability; use 7.py-style copulas for multi-contract risk (e.g. swing states or correlated Polymarket markets). Not wired yet; the skill is the reference.

6. **Improving Solus** — Solus (Hypersurface options, strike ritual, optimal strike) reasons about **assignment probability**: “~20–35% assignment prob” for covered calls = P(spot > strike at expiry). That is exactly the **binary contract** in 1.py (Monte Carlo: P(S_T > K) with a confidence interval). The quant skill can improve Solus by: (a) **1.py**: Compute or cross-check assignment prob from spot, vol, T when Deribit/options context is missing, or show a CI so the user sees uncertainty. (b) **2.py (Brier)**: If we track “Solus said X% assign; did we get assigned?” over many weeks, Brier scores calibration (same as prediction tracker; north star mentions EV calibration). (c) **3.py (importance sampling)**: Tail events—e.g. P(spot drops 15% by Friday) for CSP sizing or skip. (d) **5.py (particle filter)**: Update P(assign) as spot/IV change during the week; sharper hold/roll/adjust. (e) **7.py (copulas)**: Multiple positions (e.g. BTC CC + ETH CSP)—joint expiry outcomes and tail dependence. None of this is wired into plugin-solus today; the skill is the reference for when we add a probability or calibration layer to Solus.

**Summary:** Use the quant skill when thinking or coding about prediction-market probability, calibration (Brier), tail risk, real-time filtering, correlation, or agent-based microstructure. The repo uses the *ideas* (and Brier formula) in plugin-vince and Sentinel; the *runnable code* and full story live in `skills/quant/`. The same stack applies to Solus (assignment prob, EV calibration, tail risk for strikes).

## Dependencies

- **numpy** (>= 1.24)
- **scipy** (>= 1.10)

Install: `pip install -r requirements.txt` (adds pytest for optional `pytest tests/`).

## Run full stack (story order)

From this directory:

```bash
python run_all.py
```

Runs Parts II–VII in sequence with a fixed seed and one-line summary per part.

## Run one layer

Each script is runnable standalone:

```bash
python 1.py   # Monte Carlo binary contract
python 2.py   # Brier score
python 3.py   # Importance sampling (tail events)
python 5.py   # Particle filter (4.py is pseudocode; implementation in 5.py)
python 6.py   # Stratified MC
python 7.py   # Copulas (Gaussian, t, Clayton)
python 8.py   # Agent-based prediction market
```

## Tests

From this directory:

```bash
pip install -r requirements.txt
python -m unittest discover -s tests -p "test_*.py" -v
```

Or with pytest: `pytest tests/ -v`
