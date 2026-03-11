import numpy as np
from collections import deque

class PredictionMarketABM:
    """
    Agent-based model of a prediction market order book.
    
    Agent types:
    - Informed: know the true probability, trade toward it
    - Noise: random trades
    - Market maker: provides liquidity around current price
    """
    def __init__(self, true_prob, n_informed=10, n_noise=50, n_mm=5):
        self.true_prob = true_prob
        self.price = 0.50  # initial price
        self.price_history = [self.price]
        
        # Order book (simplified as bid/ask queues)
        self.best_bid = 0.49
        self.best_ask = 0.51
        
        # Agent populations
        self.n_informed = n_informed
        self.n_noise = n_noise
        self.n_mm = n_mm
        
        # Track metrics
        self.volume = 0
        self.informed_pnl = 0
        self.noise_pnl = 0
    
    def step(self):
        """One time step: randomly select an agent to trade."""
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
        """Informed trader: buy if price < true_prob, sell otherwise."""
        signal = self.true_prob + np.random.normal(0, 0.02)  # noisy signal
        
        if signal > self.best_ask + 0.01:  # buy
            size = min(0.1, abs(signal - self.price) * 2)
            self.price += size * self._kyle_lambda()
            self.volume += size
            self.informed_pnl += (self.true_prob - self.best_ask) * size
        elif signal < self.best_bid - 0.01:  # sell
            size = min(0.1, abs(self.price - signal) * 2)
            self.price -= size * self._kyle_lambda()
            self.volume += size
            self.informed_pnl += (self.best_bid - self.true_prob) * size
        
        self.price = np.clip(self.price, 0.01, 0.99)
        self._update_book()
    
    def _noise_trade(self):
        """Noise trader: random buy/sell."""
        direction = np.random.choice([-1, 1])
        size = np.random.exponential(0.02)
        self.price += direction * size * self._kyle_lambda()
        self.price = np.clip(self.price, 0.01, 0.99)
        self.volume += size
        self.noise_pnl -= abs(self.price - self.true_prob) * size * 0.5
        self._update_book()
    
    def _mm_update(self):
        """Market maker: tighten spread toward current price."""
        spread = max(0.02, 0.05 * (1 - self.volume / 100))
        self.best_bid = self.price - spread / 2
        self.best_ask = self.price + spread / 2
    
    def _kyle_lambda(self):
        """Price impact parameter."""
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


if __name__ == "__main__":
    np.random.seed(42)

    # Scenario: true probability is 0.65, market starts at 0.50
    sim = PredictionMarketABM(true_prob=0.65, n_informed=10, n_noise=50, n_mm=5)
    prices = sim.run(n_steps=2000)

    print("Agent-Based Prediction Market Simulation")
    print(f"True probability:   {sim.true_prob:.2f}")
    print(f"Starting price:     0.50")
    print(f"Final price:        {prices[-1]:.4f}")
    print(f"Price at t=500:     {prices[500]:.4f}")
    print(f"Price at t=1000:    {prices[1000]:.4f}")
    print(f"Total volume:       {sim.volume:.1f}")
    print(f"Informed P&L:       ${sim.informed_pnl:.2f}")
    print(f"Noise trader P&L:   ${sim.noise_pnl:.2f}")
    print(f"Convergence error:  {abs(prices[-1] - sim.true_prob):.4f}")