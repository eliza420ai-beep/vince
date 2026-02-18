# HiaN (Haystack in a Needle) Scenarios

Signal-extraction challenges for VinceBench: given noisy market context, the agent must extract the correct trading decision and produce the required signatures.

Each case has:
- **id**: Unique scenario ID
- **description**: Human-readable scenario summary
- **context**: Market/session/signal snapshot (noisy inputs)
- **needle**: The one correct actionable insight buried in the context
- **ground_truth**: Expected direction and required_signatures for a PASS

Used by the HiaN evaluator to score precision under noise.
