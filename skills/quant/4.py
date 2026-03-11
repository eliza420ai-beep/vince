# Pseudocode for Part IV; implementation in 5.py.
#
# 1. INITIALIZE: Draw x_0^{(i)} ~ Prior  for i = 1,...,N
   Set weights w_0^{(i)} = 1/N

2. FOR each new observation y_t:
   a. PROPAGATE:  x_t^{(i)} ~ f( · | x_{t-1}^{(i)} )
   b. REWEIGHT:   w_t^{(i)} ∝ g( y_t | x_t^{(i)} )  
   c. NORMALIZE:  w̃_t^{(i)} = w_t^{(i)} / Σ_j w_t^{(j)}
   d. RESAMPLE if ESS = 1/Σ(w̃_t^{(i)})² < N/2