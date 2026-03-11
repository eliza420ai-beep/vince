import numpy as np


def rare_event_IS(S0, K_crash, sigma, T, N_paths=100_000):
    """
    Importance sampling for extreme downside binary contracts.
    
    Example: P(S&P drops 20% in one week)
    """
    K = S0 * (1 - K_crash)  # e.g., 20% crash threshold
    
    # Original drift (risk-neutral)
    mu_original = -0.5 * sigma**2
    
    # Tilted drift: shift the mean toward the crash region
    # Choose mu_tilt so the crash threshold is ~1 std dev away instead of ~4
    log_threshold = np.log(K / S0)
    mu_tilt = log_threshold / T  # center the distribution on the crash
    
    Z = np.random.standard_normal(N_paths)
    
    # Simulate under TILTED measure
    log_returns_tilted = mu_tilt * T + sigma * np.sqrt(T) * Z
    S_T_tilted = S0 * np.exp(log_returns_tilted)
    
    # Likelihood ratio: original density / tilted density
    log_returns_original = mu_original * T + sigma * np.sqrt(T) * Z
    log_LR = (
        -0.5 * ((log_returns_tilted - mu_original * T) / (sigma * np.sqrt(T)))**2
        + 0.5 * ((log_returns_tilted - mu_tilt * T) / (sigma * np.sqrt(T)))**2
    )
    LR = np.exp(log_LR)
    
    # IS estimator
    payoffs = (S_T_tilted < K).astype(float)
    is_estimates = payoffs * LR
    
    p_IS = is_estimates.mean()
    se_IS = is_estimates.std() / np.sqrt(N_paths)
    
    # Compare with crude MC
    Z_crude = np.random.standard_normal(N_paths)
    S_T_crude = S0 * np.exp(mu_original * T + sigma * np.sqrt(T) * Z_crude)
    p_crude = (S_T_crude < K).mean()
    se_crude = np.sqrt(p_crude * (1 - p_crude) / N_paths) if p_crude > 0 else float('inf')
    
    return {
        'p_IS': p_IS, 'se_IS': se_IS,
        'p_crude': p_crude, 'se_crude': se_crude,
        'variance_reduction': (se_crude / se_IS)**2 if se_IS > 0 else float('inf')
    }

if __name__ == "__main__":
    result = rare_event_IS(S0=5000, K_crash=0.20, sigma=0.15, T=5/252)
    print(f"IS estimate:    {result['p_IS']:.6f} ± {result['se_IS']:.6f}")
    print(f"Crude estimate: {result['p_crude']:.6f} ± {result['se_crude']:.6f}")
    print(f"Variance reduction factor: {result['variance_reduction']:.1f}x")