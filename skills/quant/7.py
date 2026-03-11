import numpy as np
from scipy.stats import norm, t as t_dist

def simulate_correlated_outcomes_gaussian(probs, corr_matrix, N=100_000):
    """Gaussian copula no tail dependence."""
    d = len(probs)
    L = np.linalg.cholesky(corr_matrix)
    Z = np.random.standard_normal((N, d))
    X = Z @ L.T
    U = norm.cdf(X)
    outcomes = (U < np.array(probs)).astype(int)
    return outcomes

def simulate_correlated_outcomes_t(probs, corr_matrix, nu=4, N=100_000):
    """Student-t copula symmetric tail dependence."""
    d = len(probs)
    L = np.linalg.cholesky(corr_matrix)
    Z = np.random.standard_normal((N, d))
    X = Z @ L.T
    
    # Divide by sqrt(chi-squared / nu) to get t-distributed
    S = np.random.chisquare(nu, N) / nu
    T = X / np.sqrt(S[:, None])
    U = t_dist.cdf(T, nu)
    outcomes = (U < np.array(probs)).astype(int)
    return outcomes

def simulate_correlated_outcomes_clayton(probs, theta=2.0, N=100_000):
    """Clayton copula (bivariate) lower tail dependence."""
    # Marshall-Olkin algorithm
    V = np.random.gamma(1/theta, 1, N)
    E = np.random.exponential(1, (N, len(probs)))
    U = (1 + E / V[:, None])**(-1/theta)
    outcomes = (U < np.array(probs)).astype(int)
    return outcomes


if __name__ == "__main__":
    # --- Compare tail behavior ---
    probs = [0.52, 0.53, 0.51, 0.48, 0.50]  # 5 swing state probabilities
    state_names = ['PA', 'MI', 'WI', 'GA', 'AZ']

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

    # P(sweep all 5 states)
    p_sweep_gauss = gauss_outcomes.all(axis=1).mean()
    p_sweep_t = t_outcomes.all(axis=1).mean()

    # P(lose all 5 states)
    p_lose_gauss = (1 - gauss_outcomes).all(axis=1).mean()
    p_lose_t = (1 - t_outcomes).all(axis=1).mean()

    # If independent
    p_sweep_indep = np.prod(probs)
    p_lose_indep = np.prod([1-p for p in probs])

    print("Joint Outcome Probabilities:")
    print(f"{'':>25}  {'Independent':>12}  {'Gaussian':>12}  {'t-copula':>12}")
    print(f"{'P(sweep all 5)':>25}  {p_sweep_indep:>12.4f}  {p_sweep_gauss:>12.4f}  {p_sweep_t:>12.4f}")
    print(f"{'P(lose all 5)':>25}  {p_lose_indep:>12.4f}  {p_lose_gauss:>12.4f}  {p_lose_t:>12.4f}")
    print(f"\nt-copula increases sweep probability by {p_sweep_t/p_sweep_gauss:.1f}x vs Gaussian")