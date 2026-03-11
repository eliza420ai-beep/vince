import numpy as np
from scipy.special import expit, logit  # sigmoid and logit

class PredictionMarketParticleFilter:
    """
    Sequential Monte Carlo filter for real-time event probability estimation.
    
    Usage during a live event (e.g., election night):
        pf = PredictionMarketParticleFilter(prior_prob=0.50)
        pf.update(observed_price=0.55)   # market moves on early returns
        pf.update(observed_price=0.62)   # more data
        pf.update(observed_price=0.58)   # partial correction
        print(pf.estimate())             # filtered probability
    """
    def __init__(self, N_particles=5000, prior_prob=0.5,
                 process_vol=0.05, obs_noise=0.03):
        self.N = N_particles
        self.process_vol = process_vol
        self.obs_noise = obs_noise
        
        # Initialize particles around prior
        logit_prior = logit(prior_prob)
        self.logit_particles = logit_prior + np.random.normal(0, 0.5, N_particles)
        self.weights = np.ones(N_particles) / N_particles
        self.history = []
    
    def update(self, observed_price):
        """Incorporate a new observation (market price, poll result, etc.)"""
        # 1. Propagate: random walk in logit space
        noise = np.random.normal(0, self.process_vol, self.N)
        self.logit_particles += noise
        
        # 2. Convert to probability space
        prob_particles = expit(self.logit_particles)
        
        # 3. Reweight: likelihood of observation given each particle
        log_likelihood = -0.5 * ((observed_price - prob_particles) / self.obs_noise)**2
        log_weights = np.log(self.weights + 1e-300) + log_likelihood
        
        # Normalize in log space for stability
        log_weights -= log_weights.max()
        self.weights = np.exp(log_weights)
        self.weights /= self.weights.sum()
        
        # 4. Check ESS and resample if needed
        ess = 1.0 / np.sum(self.weights**2)
        if ess < self.N / 2:
            self._systematic_resample()
        
        self.history.append(self.estimate())
    
    def _systematic_resample(self):
        """Systematic resampling - lower variance than multinomial."""
        cumsum = np.cumsum(self.weights)
        u = (np.arange(self.N) + np.random.uniform()) / self.N
        indices = np.searchsorted(cumsum, u)
        self.logit_particles = self.logit_particles[indices]
        self.weights = np.ones(self.N) / self.N
    
    def estimate(self):
        """Weighted mean probability estimate."""
        probs = expit(self.logit_particles)
        return np.average(probs, weights=self.weights)
    
    def credible_interval(self, alpha=0.05):
        """Weighted quantile-based credible interval."""
        probs = expit(self.logit_particles)
        sorted_idx = np.argsort(probs)
        sorted_probs = probs[sorted_idx]
        sorted_weights = self.weights[sorted_idx]
        cumw = np.cumsum(sorted_weights)
        lower = sorted_probs[np.searchsorted(cumw, alpha/2)]
        upper = sorted_probs[np.searchsorted(cumw, 1 - alpha/2)]
        return lower, upper

if __name__ == "__main__":
    # --- Simulate election night ---
    pf = PredictionMarketParticleFilter(prior_prob=0.50, process_vol=0.03)

    # Incoming observations (market prices as new data arrives)
    observations = [0.50, 0.52, 0.55, 0.58, 0.61, 0.63, 0.60,
                    0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95]

    print("Election Night Tracker:")
    print(f"{'Time':>6}  {'Observed':>10}  {'Filtered':>10}  {'95% CI':>20}")
    print("-" * 52)

    for t, obs in enumerate(observations):
        pf.update(obs)
        ci = pf.credible_interval()
        print(f"{t:>5}h  {obs:>10.3f}  {pf.estimate():>10.3f}  ({ci[0]:.3f}, {ci[1]:.3f})")