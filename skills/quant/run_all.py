#!/usr/bin/env python3
"""
Run the full quant stack in story order (Parts II–VII).
Sets a fixed seed for reproducibility and prints a one-line summary per part.
Usage: from skills/quant: python run_all.py
"""
import importlib.util
import sys
from pathlib import Path

import numpy as np

# Run from this directory so 1.py, 2.py, ... are loadable by path
QUANT_DIR = Path(__file__).resolve().parent
if str(QUANT_DIR) not in sys.path:
    sys.path.insert(0, str(QUANT_DIR))


def load_module(name: str, filepath: Path):
    """Load a module from a file path (e.g. 1.py)."""
    spec = importlib.util.spec_from_file_location(name, filepath)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def main():
    np.random.seed(42)

    # Part II: Monte Carlo binary contract (1.py)
    mod1 = load_module("layer1", QUANT_DIR / "1.py")
    r1 = mod1.simulate_binary_contract(S0=195, K=200, mu=0.08, sigma=0.20, T=30/365, N_paths=50_000)
    print(f"Part II (MC binary):     P(AAPL > $200) = {r1['probability']:.4f}  [{r1['ci_95'][0]:.4f}, {r1['ci_95'][1]:.4f}]")

    # Part II: Brier score (2.py)
    mod2 = load_module("layer2", QUANT_DIR / "2.py")
    preds, outcomes = [0.7, 0.3, 0.9, 0.1], [1, 0, 1, 0]
    brier = mod2.brier_score(preds, outcomes)
    print(f"Part II (Brier):          Brier = {brier:.4f} (lower is better)")

    # Part III: Importance sampling (3.py)
    mod3 = load_module("layer3", QUANT_DIR / "3.py")
    r3 = mod3.rare_event_IS(S0=5000, K_crash=0.20, sigma=0.15, T=5/252, N_paths=50_000)
    print(f"Part III (IS tail):      P(crash 20%) = {r3['p_IS']:.6f} ± {r3['se_IS']:.6f}  (var reduction {r3['variance_reduction']:.0f}x)")

    # Part IV: Particle filter (5.py) — skip 4 (pseudocode)
    mod5 = load_module("layer5", QUANT_DIR / "5.py")
    pf = mod5.PredictionMarketParticleFilter(prior_prob=0.50, process_vol=0.03, N_particles=2000)
    for obs in [0.50, 0.55, 0.62, 0.58, 0.70]:
        pf.update(obs)
    ci = pf.credible_interval()
    print(f"Part IV (particle filter): filtered prob = {pf.estimate():.3f}  95% CI ({ci[0]:.3f}, {ci[1]:.3f})")

    # Part V: Stratified MC (6.py)
    mod6 = load_module("layer6", QUANT_DIR / "6.py")
    p6, se6 = mod6.stratified_binary_mc(S0=100, K=105, sigma=0.20, T=30/365, J=10, N_total=50_000)
    print(f"Part V (stratified MC):   P(S>K) = {p6:.6f} ± {se6:.6f}")

    # Part VI: Copulas (7.py)
    mod7 = load_module("layer7", QUANT_DIR / "7.py")
    probs = [0.52, 0.53, 0.51, 0.48, 0.50]
    corr = np.array([
        [1.0, 0.7, 0.7, 0.4, 0.3],
        [0.7, 1.0, 0.8, 0.3, 0.3],
        [0.7, 0.8, 1.0, 0.3, 0.3],
        [0.4, 0.3, 0.3, 1.0, 0.5],
        [0.3, 0.3, 0.3, 0.5, 1.0],
    ])
    N = 100_000
    gauss = mod7.simulate_correlated_outcomes_gaussian(probs, corr, N)
    t_out = mod7.simulate_correlated_outcomes_t(probs, corr, nu=4, N=N)
    p_sweep_g = gauss.all(axis=1).mean()
    p_sweep_t = t_out.all(axis=1).mean()
    print(f"Part VI (copulas):        P(sweep 5) Gaussian={p_sweep_g:.4f}  t-copula={p_sweep_t:.4f}  (t > Gauss)")

    # Part VII: Agent-based market (8.py)
    mod8 = load_module("layer8", QUANT_DIR / "8.py")
    abm = mod8.PredictionMarketABM(true_prob=0.65, n_informed=10, n_noise=50, n_mm=5)
    prices = abm.run(n_steps=500)
    err = abs(prices[-1] - abm.true_prob)
    print(f"Part VII (ABM):           final price = {prices[-1]:.4f}  (true=0.65)  error = {err:.4f}")

    print("\nDone. Story order: coin flip → MC → IS → particle filter → stratified → copulas → ABM.")


if __name__ == "__main__":
    main()
