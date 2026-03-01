import numpy as np
from scipy.stats import norm


def stratified_binary_mc(S0, K, sigma, T, J=10, N_total=100_000):
    """
    Stratified MC for binary contract pricing.
    Strata defined by quantiles of the terminal price distribution.
    """
    n_per_stratum = N_total // J
    estimates = []
    
    for j in range(J):
        # Uniform draws within stratum [j/J, (j+1)/J]
        U = np.random.uniform(j/J, (j+1)/J, n_per_stratum)
        Z = norm.ppf(U)
        S_T = S0 * np.exp((-0.5*sigma**2)*T + sigma*np.sqrt(T)*Z)
        stratum_mean = (S_T > K).mean()
        estimates.append(stratum_mean)
    
    # Each stratum has weight 1/J
    p_stratified = np.mean(estimates)
    se_stratified = np.std(estimates) / np.sqrt(J)
    
    return p_stratified, se_stratified

if __name__ == "__main__":
    p, se = stratified_binary_mc(S0=100, K=105, sigma=0.20, T=30/365)
    print(f"Stratified estimate: {p:.6f} ± {se:.6f}")