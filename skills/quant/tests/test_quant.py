"""
Test suite for skills/quant (1.py–8.py).
Loads modules by path (1.py, 2.py, ...) and tests main functions/classes.
Run: python -m unittest discover -s tests -p "test_*.py" -v
Or: pytest tests/ -v (if pytest installed)
"""
import importlib.util
import sys
import unittest
from pathlib import Path

import numpy as np

QUANT_DIR = Path(__file__).resolve().parent.parent
if str(QUANT_DIR) not in sys.path:
    sys.path.insert(0, str(QUANT_DIR))


def load_module(name: str, filepath: Path):
    spec = importlib.util.spec_from_file_location(name, filepath)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


class TestPart2MC(unittest.TestCase):
    """Part II: Monte Carlo binary contract (1.py)."""

    def setUp(self):
        np.random.seed(42)
        self.mod1 = load_module("layer1", QUANT_DIR / "1.py")

    def test_basic(self):
        r = self.mod1.simulate_binary_contract(
            S0=100, K=105, mu=0.05, sigma=0.20, T=30/365, N_paths=10_000
        )
        self.assertGreaterEqual(r["probability"], 0)
        self.assertLessEqual(r["probability"], 1)
        self.assertLessEqual(r["ci_95"][0], r["probability"])
        self.assertGreaterEqual(r["ci_95"][1], r["probability"])
        self.assertGreater(r["std_error"], 0)
        self.assertEqual(r["N_paths"], 10_000)

    def test_atm(self):
        np.random.seed(123)
        r = self.mod1.simulate_binary_contract(
            S0=100, K=100, mu=0.0, sigma=0.20, T=0.1, N_paths=20_000
        )
        self.assertGreaterEqual(r["probability"], 0.35)
        self.assertLessEqual(r["probability"], 0.65)


class TestPart2Brier(unittest.TestCase):
    """Part II: Brier score (2.py)."""

    def setUp(self):
        self.mod2 = load_module("layer2", QUANT_DIR / "2.py")

    def test_perfect(self):
        preds = [1.0, 0.0, 1.0, 0.0]
        outcomes = [1, 0, 1, 0]
        self.assertEqual(self.mod2.brier_score(preds, outcomes), 0.0)

    def test_always_half(self):
        preds = [0.5, 0.5, 0.5, 0.5]
        outcomes = [1, 0, 1, 0]
        self.assertEqual(self.mod2.brier_score(preds, outcomes), 0.25)

    def test_example(self):
        preds = [0.7, 0.3, 0.9, 0.1]
        outcomes = [1, 0, 1, 0]
        b = self.mod2.brier_score(preds, outcomes)
        self.assertGreaterEqual(b, 0.04)
        self.assertLessEqual(b, 0.06)


class TestPart3IS(unittest.TestCase):
    """Part III: Importance sampling (3.py)."""

    def setUp(self):
        self.mod3 = load_module("layer3", QUANT_DIR / "3.py")

    def test_basic(self):
        np.random.seed(99)
        r = self.mod3.rare_event_IS(
            S0=5000, K_crash=0.20, sigma=0.15, T=5/252, N_paths=20_000
        )
        self.assertGreaterEqual(r["p_IS"], 0)
        self.assertLessEqual(r["p_IS"], 1)
        self.assertGreaterEqual(r["se_IS"], 0)
        self.assertTrue(np.isfinite(r["se_IS"]))
        self.assertTrue(r["variance_reduction"] >= 1 or r["p_crude"] == 0)


class TestPart4ParticleFilter(unittest.TestCase):
    """Part IV: Particle filter (5.py)."""

    def setUp(self):
        self.mod5 = load_module("layer5", QUANT_DIR / "5.py")

    def test_estimate_bounds(self):
        np.random.seed(42)
        pf = self.mod5.PredictionMarketParticleFilter(
            prior_prob=0.5, process_vol=0.03, N_particles=1000
        )
        self.assertGreaterEqual(pf.estimate(), 0)
        self.assertLessEqual(pf.estimate(), 1)
        pf.update(0.55)
        pf.update(0.62)
        est = pf.estimate()
        self.assertGreaterEqual(est, 0)
        self.assertLessEqual(est, 1)
        lo, hi = pf.credible_interval()
        self.assertLessEqual(lo, est)
        self.assertGreaterEqual(hi, est)
        self.assertGreaterEqual(lo, 0)
        self.assertLessEqual(hi, 1)

    def test_credible_interval(self):
        np.random.seed(7)
        pf = self.mod5.PredictionMarketParticleFilter(prior_prob=0.5, N_particles=500)
        pf.update(0.9)
        lo, hi = pf.credible_interval(alpha=0.05)
        self.assertLess(lo, hi)
        self.assertGreaterEqual(lo, 0)
        self.assertLessEqual(hi, 1)


class TestPart5Stratified(unittest.TestCase):
    """Part V: Stratified MC (6.py)."""

    def setUp(self):
        self.mod6 = load_module("layer6", QUANT_DIR / "6.py")

    def test_basic(self):
        np.random.seed(42)
        p, se = self.mod6.stratified_binary_mc(
            S0=100, K=105, sigma=0.20, T=30/365, J=10, N_total=20_000
        )
        self.assertGreaterEqual(p, 0)
        self.assertLessEqual(p, 1)
        self.assertGreater(se, 0)

    def test_returns_tuple(self):
        np.random.seed(1)
        out = self.mod6.stratified_binary_mc(
            S0=100, K=100, sigma=0.25, T=0.1, J=5, N_total=10_000
        )
        self.assertIsInstance(out, tuple)
        self.assertEqual(len(out), 2)


class TestPart6Copulas(unittest.TestCase):
    """Part VI: Copulas (7.py)."""

    def setUp(self):
        self.mod7 = load_module("layer7", QUANT_DIR / "7.py")

    def test_gaussian_shape(self):
        np.random.seed(42)
        probs = [0.5, 0.5]
        corr = np.array([[1.0, 0.3], [0.3, 1.0]])
        out = self.mod7.simulate_correlated_outcomes_gaussian(probs, corr, N=1000)
        self.assertEqual(out.shape, (1000, 2))
        self.assertTrue(np.all(np.isin(out, [0, 1])))

    def test_t_shape(self):
        np.random.seed(42)
        probs = [0.52, 0.53, 0.51]
        corr = np.eye(3)
        corr[0, 1] = corr[1, 0] = 0.7
        out = self.mod7.simulate_correlated_outcomes_t(probs, corr, nu=4, N=1000)
        self.assertEqual(out.shape, (1000, 3))
        self.assertTrue(np.all(np.isin(out, [0, 1])))

    def test_t_vs_gaussian_tail(self):
        np.random.seed(100)
        probs = [0.52, 0.53, 0.51, 0.48, 0.50]
        corr = np.array([
            [1.0, 0.7, 0.7, 0.4, 0.3],
            [0.7, 1.0, 0.8, 0.3, 0.3],
            [0.7, 0.8, 1.0, 0.3, 0.3],
            [0.4, 0.3, 0.3, 1.0, 0.5],
            [0.3, 0.3, 0.3, 0.5, 1.0],
        ])
        N = 50_000
        gauss = self.mod7.simulate_correlated_outcomes_gaussian(probs, corr, N)
        t_out = self.mod7.simulate_correlated_outcomes_t(probs, corr, nu=4, N=N)
        p_sweep_g = gauss.all(axis=1).mean()
        p_sweep_t = t_out.all(axis=1).mean()
        self.assertGreater(p_sweep_g, 0)
        self.assertLess(p_sweep_g, 1)
        self.assertGreater(p_sweep_t, 0)
        self.assertLess(p_sweep_t, 1)


class TestPart7ABM(unittest.TestCase):
    """Part VII: Agent-based market (8.py)."""

    def setUp(self):
        self.mod8 = load_module("layer8", QUANT_DIR / "8.py")

    def test_price_history(self):
        np.random.seed(42)
        sim = self.mod8.PredictionMarketABM(
            true_prob=0.65, n_informed=10, n_noise=50, n_mm=5
        )
        prices = sim.run(n_steps=500)
        self.assertEqual(len(prices), 501)
        self.assertTrue(np.all((prices >= 0) & (prices <= 1)))

    def test_convergence(self):
        np.random.seed(42)
        sim = self.mod8.PredictionMarketABM(
            true_prob=0.65, n_informed=10, n_noise=50, n_mm=5
        )
        prices = sim.run(n_steps=500)
        err = abs(prices[-1] - sim.true_prob)
        self.assertLess(err, 0.25)


if __name__ == "__main__":
    unittest.main()
