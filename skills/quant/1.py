import numpy as np

def simulate_binary_contract(S0, K, mu, sigma, T, N_paths=100_000):
    """
    Monte Carlo simulation for a binary contract.
    
    S0:    Current asset price
    K:     Strike / threshold
    mu:    Annual drift
    sigma: Annual volatility
    T:     Time to expiry in years
    N_paths: Number of simulated paths
    """
    # Simulate terminal prices via GBM
    Z = np.random.standard_normal(N_paths)
    S_T = S0 * np.exp((mu - 0.5 * sigma**2) * T + sigma * np.sqrt(T) * Z)
    
    # Binary payoff
    payoffs = (S_T > K).astype(float)
    
    # Estimate and confidence interval
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

if __name__ == "__main__":
    # Example: AAPL at $195, strike $200, 20% vol, 30 days
    result = simulate_binary_contract(S0=195, K=200, mu=0.08, sigma=0.20, T=30/365)
    print(f"P(AAPL > $200) ≈ {result['probability']:.4f}")
    print(f"95% CI: ({result['ci_95'][0]:.4f}, {result['ci_95'][1]:.4f})")