# Quant Reference: Prediction Markets — Full Narrative & Runnable Code

This document holds the complete story (Parts I–VIII) and all runnable code. Read in order; each section builds on the last.

**Disclaimer:** Not Financial Advice & Do Your Own Research.

---

## Part I: The Coin Flip That Breaks Everything

You're staring at a Polymarket contract. "Will the Fed cut rates in March?" YES is trading at $0.62.

Your instinct: that's a 62% probability. Maybe you think it should be 70%. So you buy.

What's wrong: you treated it like a **coin flip with a known bias**. You have no idea:
- how confident to be in your 70%;
- how it should change when tomorrow's jobs report drops;
- how it correlates with other Fed-related contracts;
- whether the price path will let you exit at a profit even if you're right.

A coin flip has one parameter: **p**. A prediction market contract in a portfolio of correlated events, with time-varying information, order book dynamics, and execution risk, has **dozens**.

---

## Part II: Monte Carlo — The Foundation

Every simulation here reduces to **Monte Carlo**: draw samples, compute a statistic, repeat.

- **Estimator for event probability** \(p = P(A)\): sample mean \(\hat{p}_N\).
- **CLT:** convergence \(O(N^{-1/2})\), \(\mathrm{Var}(\hat{p}_N) = p(1-p)/N\).
- **Variance is maximized at** \(p = 0.5\) — the 50¢ contract is where MC is least precise.
- **±0.01 at 95% when** \(p=0.5\): need \(N \approx 9604\).

### First runnable simulation: binary contract (one underlying, GBM)

```python
import numpy as np

def simulate_binary_contract(S0, K, mu, sigma, T, N_paths=100_000):
    """
    Monte Carlo simulation for a binary contract.
    S0: current asset price; K: strike/threshold; mu: annual drift;
    sigma: annual vol; T: time to expiry in years; N_paths: paths.
    """
    Z = np.random.standard_normal(N_paths)
    S_T = S0 * np.exp((mu - 0.5 * sigma**2) * T + sigma * np.sqrt(T) * Z)
    payoffs = (S_T > K).astype(float)
    p_hat = payoffs.mean()
    se = np.sqrt(p_hat * (1 - p_hat) / N_paths)
    ci_lower = p_hat - 1.96 * se
    ci_upper = p_hat + 1.96 * se
    return {
        'probability': p_hat,
        'std_error': se,
        'ci_95': (ci_lower, ci_upper),
        'N_paths': N_paths
    }

# Example: AAPL at $195, strike $200, 20% vol, 30 days
result = simulate_binary_contract(S0=195, K=200, mu=0.08, sigma=0.20, T=30/365)
print(f"P(AAPL > $200) ≈ {result['probability']:.4f}")
print(f"95% CI: ({result['ci_95'][0]:.4f}, {result['ci_95'][1]:.4f})")
```

Real prediction markets break the single-underlying lognormal assumption; the rest of the stack addresses that.

### Brier score (calibration)

```python
def brier_score(predictions, outcomes):
    return np.mean((np.array(predictions) - np.array(outcomes))**2)

# Example
model_A_preds = [0.7, 0.3, 0.9, 0.1]
model_B_preds = [0.5, 0.5, 0.5, 0.5]
actual_outcomes = [1, 0, 1, 0]
print(f"Model A Brier: {brier_score(model_A_preds, actual_outcomes):.4f}")  # ~0.05
print(f"Model B Brier: {brier_score(model_B_preds, actual_outcomes):.4f}")  # 0.25
```

- Brier &lt; 0.20 good, &lt; 0.10 excellent. Top election forecasters ~0.06–0.12.

---

## Part III: When 100,000 Samples Aren't Enough — Importance Sampling

For extreme events ("Will S&P drop 20% in one week?" at $0.003), crude MC at 100k paths may give 0 or 1 hit → useless.

**Idea:** Replace the measure with one that **oversamples the rare region**, then correct with the **likelihood ratio** (Radon–Nikodym derivative). Practical workhorse: **exponential tilting**. For increments with MGF \(M(\gamma)=E[e^{\gamma\Delta}]\), tilt so the rare event becomes typical; for a sum exceeding a threshold, \(\gamma\) often solves the Lundberg equation \(M(\gamma)=1\).

### Importance sampling for tail-risk binary (e.g. crash)

```python
def rare_event_IS(S0, K_crash, sigma, T, N_paths=100_000):
    """
    Importance sampling for extreme downside binary.
    Example: P(S&P drops 20% in one week).
    """
    K = S0 * (1 - K_crash)
    mu_original = -0.5 * sigma**2
    log_threshold = np.log(K / S0)
    mu_tilt = log_threshold / T  # center on crash region

    Z = np.random.standard_normal(N_paths)
    log_returns_tilted = mu_tilt * T + sigma * np.sqrt(T) * Z
    S_T_tilted = S0 * np.exp(log_returns_tilted)

    log_returns_original = mu_original * T + sigma * np.sqrt(T) * Z
    log_LR = (
        -0.5 * ((log_returns_tilted - mu_original * T) / (sigma * np.sqrt(T)))**2
        + 0.5 * ((log_returns_tilted - mu_tilt * T) / (sigma * np.sqrt(T)))**2
    )
    LR = np.exp(log_LR)

    payoffs = (S_T_tilted < K).astype(float)
    is_estimates = payoffs * LR
    p_IS = is_estimates.mean()
    se_IS = is_estimates.std() / np.sqrt(N_paths)

    Z_crude = np.random.standard_normal(N_paths)
    S_T_crude = S0 * np.exp(mu_original * T + sigma * np.sqrt(T) * Z_crude)
    p_crude = (S_T_crude < K).mean()
    se_crude = np.sqrt(p_crude * (1 - p_crude) / N_paths) if p_crude > 0 else float('inf')

    return {
        'p_IS': p_IS, 'se_IS': se_IS,
        'p_crude': p_crude, 'se_crude': se_crude,
        'variance_reduction': (se_crude / se_IS)**2 if se_IS > 0 else float('inf')
    }

result = rare_event_IS(S0=5000, K_crash=0.20, sigma=0.15, T=5/252)
print(f"IS estimate:    {result['p_IS']:.6f} ± {result['se_IS']:.6f}")
print(f"Crude estimate: {result['p_crude']:.6f} ± {result['se_crude']:.6f}")
print(f"Variance reduction factor: {result['variance_reduction']:.1f}x")
```

On extreme contracts, IS can give 100–10,000× variance reduction.

---

## Part IV: Sequential Monte Carlo (Particle Filter) — Real-Time Updating

**Setting:** Election night; new data (prices, polls, vote counts) arrives over time. Update probability for the event (and correlated states) **instantly**.

- **State-space model:** Hidden state \(x_t\) = true probability (e.g. in logit space); observation \(y_t\) = market price / poll / count. State: logit random walk; observation: noisy reading of state.
- **Bootstrap particle filter:** \(N\) particles (hypotheses on \(x_t\)). Each step: (1) Propagate \(x_t^{(i)} \sim f(\cdot|x_{t-1}^{(i)})\), (2) Reweight \(w_t^{(i)} \propto g(y_t|x_t^{(i)})\), (3) Normalize, (4) Resample if ESS &lt; N/2.

### Particle filter for a live prediction market

```python
import numpy as np
from scipy.special import expit, logit

class PredictionMarketParticleFilter:
    """
    Sequential Monte Carlo filter for real-time event probability.
    Usage: pf = PredictionMarketParticleFilter(prior_prob=0.50)
           pf.update(observed_price=0.55); pf.update(0.62); ...
           print(pf.estimate())
    """
    def __init__(self, N_particles=5000, prior_prob=0.5,
                 process_vol=0.05, obs_noise=0.03):
        self.N = N_particles
        self.process_vol = process_vol
        self.obs_noise = obs_noise
        logit_prior = logit(prior_prob)
        self.logit_particles = logit_prior + np.random.normal(0, 0.5, N_particles)
        self.weights = np.ones(N_particles) / N_particles
        self.history = []

    def update(self, observed_price):
        noise = np.random.normal(0, self.process_vol, self.N)
        self.logit_particles += noise
        prob_particles = expit(self.logit_particles)
        log_likelihood = -0.5 * ((observed_price - prob_particles) / self.obs_noise)**2
        log_weights = np.log(self.weights + 1e-300) + log_likelihood
        log_weights -= log_weights.max()
        self.weights = np.exp(log_weights)
        self.weights /= self.weights.sum()
        ess = 1.0 / np.sum(self.weights**2)
        if ess < self.N / 2:
            self._systematic_resample()
        self.history.append(self.estimate())

    def _systematic_resample(self):
        cumsum = np.cumsum(self.weights)
        u = (np.arange(self.N) + np.random.uniform()) / self.N
        indices = np.searchsorted(cumsum, u)
        self.logit_particles = self.logit_particles[indices]
        self.weights = np.ones(self.N) / self.N

    def estimate(self):
        probs = expit(self.logit_particles)
        return np.average(probs, weights=self.weights)

    def credible_interval(self, alpha=0.05):
        probs = expit(self.logit_particles)
        sorted_idx = np.argsort(probs)
        sorted_probs = probs[sorted_idx]
        sorted_weights = self.weights[sorted_idx]
        cumw = np.cumsum(sorted_weights)
        lower = sorted_probs[np.searchsorted(cumw, alpha/2)]
        upper = sorted_probs[np.searchsorted(cumw, 1 - alpha/2)]
        return lower, upper

# Simulate election night
pf = PredictionMarketParticleFilter(prior_prob=0.50, process_vol=0.03)
observations = [0.50, 0.52, 0.55, 0.58, 0.61, 0.63, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95]
for t, obs in enumerate(observations):
    pf.update(obs)
    ci = pf.credible_interval()
    print(f"t={t}  obs={obs:.3f}  filtered={pf.estimate():.3f}  95% CI=({ci[0]:.3f}, {ci[1]:.3f})")
```

The filter **smooths noise** and propagates uncertainty; a single spike in price is tempered by observation noise.

---

## Part V: Variance Reduction That Stacks

Three techniques that combine multiplicatively:

1. **Antithetic variates:** For monotone payoffs, use \((f(Z) + f(-Z))/2\). Often 50–75% variance reduction, no extra cost beyond doubling evaluations.
2. **Control variate:** If you have a closed-form proxy (e.g. Black–Scholes digital for a binary under SV), use it as control.
3. **Stratified sampling:** Partition by quantiles of terminal distribution; sample within strata; combine. Variance ≤ crude MC; Neyman allocation: \(n_j \propto \omega_j \sigma_j\).

### Stratified binary MC

```python
from scipy.stats import norm

def stratified_binary_mc(S0, K, sigma, T, J=10, N_total=100_000):
    n_per_stratum = N_total // J
    estimates = []
    for j in range(J):
        U = np.random.uniform(j/J, (j+1)/J, n_per_stratum)
        Z = norm.ppf(U)
        S_T = S0 * np.exp((-0.5*sigma**2)*T + sigma*np.sqrt(T)*Z)
        stratum_mean = (S_T > K).mean()
        estimates.append(stratum_mean)
    p_stratified = np.mean(estimates)
    se_stratified = np.std(estimates) / np.sqrt(J)
    return p_stratified, se_stratified

p, se = stratified_binary_mc(S0=100, K=105, sigma=0.20, T=30/365)
print(f"Stratified estimate: {p:.6f} ± {se:.6f}")
```

Stack antithetic + control + stratification for 100–500× variance reduction in production.

---

## Part VI: Copulas — Beyond Correlation Matrices

**Tail dependence:** Extreme co-movements that correlation doesn't capture. Gaussian copula → zero tail dependence (wrong for crises and correlated prediction markets). **Sklar:** \(F(x_1,\ldots,x_d) = C(F_1(x_1),\ldots,F_d(x_d))\).

- **Gaussian:** \(\lambda_U = \lambda_L = 0\).
- **Student-t** (\(\nu=4\), \(\rho=0.6\)): tail dependence ~0.18.
- **Clayton:** lower tail only. **Gumbel:** upper tail only.
- **Vine copulas** (d &gt; 5): decompose into bivariate conditional copulas (C-vine, D-vine, R-vine). Use e.g. `pyvinecopulib` or VineCopula (R).

### Correlated outcomes: Gaussian vs t-copula

```python
import numpy as np
from scipy.stats import norm, t as t_dist

def simulate_correlated_outcomes_gaussian(probs, corr_matrix, N=100_000):
    d = len(probs)
    L = np.linalg.cholesky(corr_matrix)
    Z = np.random.standard_normal((N, d))
    X = Z @ L.T
    U = norm.cdf(X)
    return (U < np.array(probs)).astype(int)

def simulate_correlated_outcomes_t(probs, corr_matrix, nu=4, N=100_000):
    d = len(probs)
    L = np.linalg.cholesky(corr_matrix)
    Z = np.random.standard_normal((N, d))
    X = Z @ L.T
    S = np.random.chisquare(nu, N) / nu
    T = X / np.sqrt(S[:, None])
    U = t_dist.cdf(T, nu)
    return (U < np.array(probs)).astype(int)

def simulate_correlated_outcomes_clayton(probs, theta=2.0, N=100_000):
    V = np.random.gamma(1/theta, 1, N)
    E = np.random.exponential(1, (N, len(probs)))
    U = (1 + E / V[:, None])**(-1/theta)
    return (U < np.array(probs)).astype(int)

# Example: 5 swing states
probs = [0.52, 0.53, 0.51, 0.48, 0.50]
corr = np.array([
    [1.0, 0.7, 0.7, 0.4, 0.3],
    [0.7, 1.0, 0.8, 0.3, 0.3],
    [0.7, 0.8, 1.0, 0.3, 0.3],
    [0.4, 0.3, 0.3, 1.0, 0.5],
    [0.3, 0.3, 0.3, 0.5, 1.0],
])
N = 500_000
gauss_outcomes = simulate_correlated_outcomes_gaussian(probs, corr, N)
t_outcomes = simulate_correlated_outcomes_t(probs, corr, nu=4, N=N)
p_sweep_gauss = gauss_outcomes.all(axis=1).mean()
p_sweep_t = t_outcomes.all(axis=1).mean()
p_lose_gauss = (1 - gauss_outcomes).all(axis=1).mean()
p_lose_t = (1 - t_outcomes).all(axis=1).mean()
p_sweep_indep = np.prod(probs)
p_lose_indep = np.prod([1-p for p in probs])
print("P(sweep all 5):", "Indep", p_sweep_indep, "Gauss", p_sweep_gauss, "t", p_sweep_t)
print("P(lose all 5):", "Indep", p_lose_indep, "Gauss", p_lose_gauss, "t", p_lose_t)
```

t-copula often gives 2–5× higher probability of extreme joint outcomes than Gaussian.

---

## Part VII: Agent-Based Simulation

Markets are populated by **heterogeneous agents**. Zero-intelligence (random orders subject to budget) can still yield near-100% allocative efficiency (Gode & Sunder). Farmer et al.: one parameter explained ~96% of spread variation on LSE.

### Agent-based prediction market (informed / noise / market maker)

```python
import numpy as np

class PredictionMarketABM:
    def __init__(self, true_prob, n_informed=10, n_noise=50, n_mm=5):
        self.true_prob = true_prob
        self.price = 0.50
        self.price_history = [self.price]
        self.best_bid, self.best_ask = 0.49, 0.51
        self.n_informed, self.n_noise, self.n_mm = n_informed, n_noise, n_mm
        self.volume = self.informed_pnl = self.noise_pnl = 0

    def step(self):
        total = self.n_informed + self.n_noise + self.n_mm
        r = np.random.random()
        if r < self.n_informed / total:
            self._informed_trade()
        elif r < (self.n_informed + self.n_noise) / total:
            self._noise_trade()
        else:
            self._mm_update()
        self.price_history.append(self.price)

    def _informed_trade(self):
        signal = self.true_prob + np.random.normal(0, 0.02)
        if signal > self.best_ask + 0.01:
            size = min(0.1, abs(signal - self.price) * 2)
            self.price += size * self._kyle_lambda()
            self.volume += size
            self.informed_pnl += (self.true_prob - self.best_ask) * size
        elif signal < self.best_bid - 0.01:
            size = min(0.1, abs(self.price - signal) * 2)
            self.price -= size * self._kyle_lambda()
            self.volume += size
            self.informed_pnl += (self.best_bid - self.true_prob) * size
        self.price = np.clip(self.price, 0.01, 0.99)
        self._update_book()

    def _noise_trade(self):
        direction = np.random.choice([-1, 1])
        size = np.random.exponential(0.02)
        self.price += direction * size * self._kyle_lambda()
        self.price = np.clip(self.price, 0.01, 0.99)
        self.volume += size
        self.noise_pnl -= abs(self.price - self.true_prob) * size * 0.5
        self._update_book()

    def _mm_update(self):
        spread = max(0.02, 0.05 * (1 - self.volume / 100))
        self.best_bid = self.price - spread / 2
        self.best_ask = self.price + spread / 2

    def _kyle_lambda(self):
        sigma_v = abs(self.true_prob - self.price) + 0.05
        sigma_u = 0.1 * np.sqrt(self.n_noise)
        return sigma_v / (2 * sigma_u)

    def _update_book(self):
        spread = self.best_ask - self.best_bid
        self.best_bid = self.price - spread / 2
        self.best_ask = self.price + spread / 2

    def run(self, n_steps=1000):
        for _ in range(n_steps):
            self.step()
        return np.array(self.price_history)

np.random.seed(42)
sim = PredictionMarketABM(true_prob=0.65, n_informed=10, n_noise=50, n_mm=5)
prices = sim.run(n_steps=2000)
print("True prob:", sim.true_prob, "Final price:", prices[-1], "Volume:", sim.volume)
```

---

## Part VIII: The Production Stack

| Layer | Components |
|-------|------------|
| **1. Data** | WebSocket (Polymarket CLOB), news/poll NLP, on-chain (e.g. Polygon) |
| **2. Probability engine** | Hierarchical Bayesian (Stan/PyMC), particle filter, jump-diffusion paths, ensemble |
| **3. Dependency** | Vine copula, factor model, t-copula tail dependence |
| **4. Risk** | EVT VaR/ES, reverse stress, correlation stress, liquidity/depth |
| **5. Monitoring** | Brier, P&L attribution, drawdowns, model drift |

---

## References

- Dalen (2025). "Toward Black-Scholes for Prediction Markets." arXiv:2510.15205
- Saguillo et al. (2025). "Unravelling the Probabilistic Forest: Arbitrage in Prediction Markets." arXiv:2508.03474
- Madrigal-Cianci et al. (2026). "Prediction Markets as Bayesian Inverse Problems." arXiv:2601.18815
- Farmer, Patelli & Zovko (2005). "The Predictive Power of Zero Intelligence." PNAS
- Gode & Sunder (1993). "Allocative Efficiency of Markets with Zero-Intelligence Traders." JPE
- Kyle (1985). "Continuous Auctions and Insider Trading." Econometrica
- Glosten & Milgrom (1985). "Bid, Ask, and Transaction Prices." JFE
- Hoffman & Gelman (2014). "The No-U-Turn Sampler." JMLR
- Merton (1976). "Option Pricing When Underlying Stock Returns Are Discontinuous." JFE
- Linzer (2013). "Dynamic Bayesian Forecasting of Presidential Elections." JASA
- Gelman et al. (2020). "Updated Dynamic Bayesian Forecasting Model." HDSR
- Aas, Czado, Frigessi & Bakken (2009). "Pair-Copula Constructions of Multiple Dependence." Insurance: Mathematics and Economics
- Wiese et al. (2020). "Quant GANs: Deep Generation of Financial Time Series." Quantitative Finance
- Kidger et al. (2021). "Neural SDEs as Infinite-Dimensional GANs." ICML
