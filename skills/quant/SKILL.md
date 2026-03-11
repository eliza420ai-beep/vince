---
name: quant
description: >
  Quantitative stack for prediction markets and binary contracts: Monte Carlo,
  importance sampling, particle filters, variance reduction, copulas, agent-based
  simulation. Use when: (1) user asks about "prediction market", "Polymarket",
  "binary contract", "Monte Carlo", "particle filter", "importance sampling",
  "copula", "tail dependence", "Brier score", "agent-based simulation",
  "variance reduction", "stratified sampling", "control variate", (2) pricing or
  simulating event probability, tail-risk contracts, or correlated outcomes,
  (3) building a probability engine, risk layer, or calibration (Brier) for
  prediction markets. NOT for: general options theory (see options docs);
  live execution (use trading-agent or Otaku). Content is a single story—read
  parts in order; skip ahead and the math won't stack.
---

# Quant: Prediction Markets & Binary Contracts

This skill encodes a **single narrative**: from a coin-flip view of prediction markets through institutional-grade simulation. **Each section builds on the last.** Apply parts in order when implementing or explaining; skip ahead and the math won't cohere.

**Disclaimer:** Not financial advice. Do your own research.

---

## When to Use This Skill

- Pricing or simulating **binary / event contracts** (e.g. "Will X happen by date T?").
- **Polymarket** or other prediction markets: probability engine, calibration, risk.
- **Tail-risk contracts** (rare events): importance sampling, not crude Monte Carlo.
- **Real-time updating** on new observations (e.g. election night): particle filter.
- **Correlated contracts** (e.g. swing states): copulas, tail dependence (not just correlation matrices).
- **Agent-based** order-book or market dynamics: zero-intelligence / informed vs noise.
- **Production stack** design: data → probability engine → dependency model → risk → monitoring (Brier, P&L attribution).

---

## Story Order (Parts I–VIII)

| Part | Topic | Use when |
|------|--------|----------|
| **I** | Coin flip that breaks | Explaining why "price = probability" is insufficient (confidence, correlation, path, execution). |
| **II** | Monte Carlo foundation | Single contract, terminal payoff; GBM, sample mean, CLT, ±0.01 precision. |
| **III** | Importance sampling | Rare events (e.g. "S&P −20% in one week"); exponential tilting; variance reduction 100–10k×. |
| **IV** | Sequential Monte Carlo | Real-time updates (election night, live prices); state-space model; bootstrap particle filter. |
| **V** | Variance reduction stack | Antithetic variates, control variates (e.g. Black–Scholes digital), stratified sampling; stack for 100–500×. |
| **VI** | Copulas & tail dependence | Correlated contracts; Gaussian vs t vs Clayton/Gumbel; joint sweep/loss probabilities. |
| **VII** | Agent-based simulation | Order book / market micro structure; informed vs noise vs market maker; zero-intelligence insight. |
| **VIII** | Production stack | Data → probability engine → dependency → risk (VaR, EVT, stress) → monitoring (Brier, drift). |

Full narrative and runnable code for every layer: [reference.md](reference.md).

---

## Core Formulas (Quick Reference)

- **Binary probability (MC):** \(\hat{p}_N = \frac{1}{N}\sum_i \mathbf{1}(S_T^{(i)} > K)\). Variance \(\mathrm{Var}(\hat{p}_N) = p(1-p)/N\); max at \(p=0.5\).
- **Precision:** For ±0.01 at 95% when \(p=0.5\), need \(N \approx 9604\).
- **Brier score:** \(\mathrm{Brier} = \frac{1}{n}\sum (p_i - y_i)^2\). Lower is better; &lt;0.20 good, &lt;0.10 excellent; top forecasters ~0.06–0.12.
- **Importance sampling:** Simulate under tilted measure; weight by likelihood ratio. For tail events, tilt drift toward the rare region.
- **Particle filter (logit RW):** State \(x_t\) in logit space; observe \(y_t\); propagate → reweight (likelihood) → normalize → resample if ESS &lt; N/2.
- **Stratified MC:** Partition by quantiles of terminal distribution; sample within strata; \(\mathrm{Var}(\hat{p}_{\mathrm{strat}}) \le \mathrm{Var}(\hat{p}_{\mathrm{crude}})\).
- **Copula (Sklar):** \(F(x_1,\ldots,x_d) = C(F_1(x_1),\ldots,F_d(x_d))\). Gaussian: no tail dependence; t with \(\nu=4\): symmetric tail dependence; Clayton: lower tail; Gumbel: upper tail.

---

## One Runnable Example (Binary Contract)

Single-asset binary, GBM, 95% CI:

```python
import numpy as np

def simulate_binary_contract(S0, K, mu, sigma, T, N_paths=100_000):
    Z = np.random.standard_normal(N_paths)
    S_T = S0 * np.exp((mu - 0.5 * sigma**2) * T + sigma * np.sqrt(T) * Z)
    payoffs = (S_T > K).astype(float)
    p_hat = payoffs.mean()
    se = np.sqrt(p_hat * (1 - p_hat) / N_paths)
    ci = (p_hat - 1.96 * se, p_hat + 1.96 * se)
    return {'probability': p_hat, 'std_error': se, 'ci_95': ci, 'N_paths': N_paths}
```

For rare events use importance sampling; for paths and real-time use particle filter; for correlation use copulas. See [reference.md](reference.md).

---

## Calibration: Brier Score

```python
def brier_score(predictions, outcomes):
    return np.mean((np.array(predictions) - np.array(outcomes))**2)
```

Track Brier on out-of-sample or live predictions. If your simulation/engine beats ~0.06–0.12 on comparable events, you have edge.

---

## Production Stack (High Level)

1. **Data:** WebSocket (e.g. Polymarket CLOB), news/poll NLP, on-chain.
2. **Probability engine:** Hierarchical Bayesian (Stan/PyMC), particle filter, jump-diffusion path sim, ensemble.
3. **Dependency:** Vine copula pairwise, factor model, t-copula tail dependence.
4. **Risk:** EVT VaR/ES, reverse stress, correlation stress, liquidity/depth.
5. **Monitoring:** Brier, P&L attribution, drawdowns, model drift.

---

## File Structure

```
skills/quant/
├── SKILL.md      (this file — narrative order, when to use, key formulas)
└── reference.md  (full story I–VIII + all runnable code)
```

Use **reference.md** when you need full derivations, importance-sampling likelihood ratio, particle filter class, copula simulation, or agent-based order-book code.
