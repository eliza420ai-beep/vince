# elizaOS Benchmarks — VINCE Reference

Single source of truth for running and interpreting [elizaOS/benchmarks](https://github.com/elizaOS/benchmarks) so Sentinel and the team can suggest and run the right benchmarks with the right commands.

## What the benchmarks repo is

The [elizaOS/benchmarks](https://github.com/elizaOS/benchmarks) repo is a **Python-based benchmark suite** for ElizaOS agents:

- **Registry** ([registry.py](https://github.com/elizaOS/benchmarks/blob/main/registry.py)): each benchmark is a `BenchmarkDefinition` with `id`, `display_name`, `requirements` (env vars, paths, notes), `build_command`, `locate_result`, and `extract_score`.
- **Standardized scores**: results are parsed into `ScoreExtraction` (score, unit, higher_is_better, metrics) so you can compare runs or track over time.
- **ElizaOS-specific entrypoints**: AgentBench supports `--elizaos`; Gauntlet runs with `benchmarks/gauntlet/agents/eliza_agent.py`; OSWorld has `run_multienv_eliza.py`; Solana uses `benchmarks.solana.eliza_explorer`.

## Benchmarks relevant to VINCE

| Benchmark            | Relevance to VINCE                                                 | Env / paths                                               |
| -------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| **context_bench**    | RAG / long-context (knowledge, needle-in-haystack)                 | Mock or provider; no API key for quick runs               |
| **agentbench**       | General agent behavior                                             | Mock default; `--elizaos` for ElizaOS runtime             |
| **solana**           | Otaku / Solana tooling                                             | surfpool localhost:8899; OPENROUTER_API_KEY for LLM phase |
| **gauntlet**         | Solana agent safety (task completion, safety, efficiency, capital) | Eliza agent; mock or clone_mainnet                        |
| **rlm-bench**        | Long-context / recursive LM (S-NIAH, OOLONG)                       | stub/custom modes                                         |
| **tau_bench**        | Tool–agent–user interaction                                        | Mock or real_llm                                          |
| **terminal_bench**   | CLI/terminal proficiency                                           | OPENAI_API_KEY; sample tasks                              |
| **HyperliquidBench** | Perps/options (future)                                             | In repo tree; add to workflow when in registry            |

## Setup (one-time)

1. **Clone the benchmarks repo** (sibling to VINCE or in a path you prefer):

   ```bash
   git clone https://github.com/elizaOS/benchmarks.git elizaos-benchmarks
   cd elizaos-benchmarks
   ```

2. **Python environment**: use a venv and install deps per benchmark. The repo is Python 3.x; some benchmarks have their own `requirements.txt` or install instructions in their subdir. From repo root you typically run:

   ```bash
   python -m venv .venv
   source .venv/bin/activate   # or .venv\Scripts\activate on Windows
   pip install -e .            # if the repo has a pyproject/setup
   ```

   Install any benchmark-specific deps (e.g. for terminal_bench, gaia, etc.) as noted in the repo or in each benchmark’s README.

## Run instructions (concrete commands)

Assume you are in the **benchmarks repo root** and have activated the venv. Replace `OUTPUT_DIR` with a path (e.g. `./benchmark_results` or `/tmp/bench_out`).

### context_bench (RAG / long-context)

Quick run with mock provider (no API key):

```bash
python benchmarks/context-bench/run_benchmark.py --provider mock --output-dir OUTPUT_DIR --quick
```

With a real provider (e.g. openai) you’d set the provider and ensure the corresponding API key is in the environment. Results: latest `context_bench_*.json` in `OUTPUT_DIR`. Metric: `overall_accuracy`, `lost_in_middle_score`, `total_tasks`.

### agentbench (general agent behavior)

Default (mock runtime):

```bash
python benchmarks/agentbench/python/run_benchmark.py --output OUTPUT_DIR
```

With ElizaOS runtime:

```bash
python benchmarks/agentbench/python/run_benchmark.py --output OUTPUT_DIR --elizaos
```

Optional: `--max-tasks N`, `--env env1,env2`. Results: `OUTPUT_DIR/agentbench-results.json`. Metrics: `overall_success_rate`, `total_tasks`, `passed_tasks`.

### gauntlet (Solana agent safety)

Mock mode (no mainnet clone):

```bash
python -m gauntlet.cli run \
  --agent benchmarks/gauntlet/agents/eliza_agent.py \
  --scenarios benchmarks/gauntlet/scenarios \
  --programs benchmarks/gauntlet/programs \
  --output OUTPUT_DIR \
  --mock
```

With mainnet clone (optional): use `--clone-mainnet` instead of `--mock`. Results: latest `*.json` in `OUTPUT_DIR`. Metrics: `overall_score`, `task_completion`, `safety`, `efficiency`, `capital`.

### solana (Solana instruction discovery)

Requires surfpool on localhost:8899. Set `USE_EXTERNAL_SURFPOOL=true`. LLM phase needs `OPENROUTER_API_KEY`:

```bash
# From benchmarks repo root; ensure benchmarks/solana/solana-gym-env exists
python -m benchmarks.solana.eliza_explorer
```

Results: under `benchmarks/solana/solana-gym-env/metrics/`, latest `eliza_*_metrics.json`. Metric: `final_reward`, `final_programs`.

### rlm-bench (long-context / recursive LM)

Stub mode (no real API):

```bash
python benchmarks/rlm-bench/run_benchmark.py --output-dir OUTPUT_DIR --mode stub
```

Options: `--backend`, `--context-lengths`, `--tasks-per-config`, `--max-iterations`, `--max-depth`, `--no-s-niah`, `--no-oolong`. Results: latest `rlm_bench_results_*.json` in `OUTPUT_DIR`. Metrics: `overall_accuracy`, S-NIAH/OOLONG breakdown.

### tau_bench (tool–agent–user interaction)

Mock (default):

```bash
python -m elizaos_tau_bench.cli --output OUTPUT_DIR
```

With real LLM: set extra `real_llm=true` in the harness that calls this, or see benchmark docs. Optional: `--model-provider`, `--temperature`, `--max-tasks`, `--sample`. Results: `OUTPUT_DIR/tau-bench-results.json`. Metrics: `overall_success_rate`, `overall_tool_accuracy`, `overall_policy_compliance`.

### terminal_bench (CLI/terminal proficiency)

Requires `OPENAI_API_KEY`. Sample run:

```bash
python -m elizaos_terminal_bench.cli --output-dir OUTPUT_DIR --sample
```

Optional: `--model`, `--temperature`, `--max-tasks`. Results: latest `terminal-bench-*.json` in `OUTPUT_DIR`. Metrics: `accuracy`, `total_tasks`, `passed_tasks`.

## Where results land and how to read them

- **context_bench**: `OUTPUT_DIR/context_bench_*.json` — `overall_accuracy`, `lost_in_middle_score`, `total_tasks`.
- **agentbench**: `OUTPUT_DIR/agentbench-results.json` — `overall_success_rate`, `total_tasks`, `passed_tasks`.
- **gauntlet**: `OUTPUT_DIR/*.json` — `overall_score`, component scores (task_completion, safety, efficiency, capital).
- **solana**: `benchmarks/solana/solana-gym-env/metrics/eliza_*_metrics.json` — `final_reward`, `final_programs`.
- **rlm-bench**: `OUTPUT_DIR/rlm_bench_results_*.json` — `overall_accuracy`, S-NIAH/OOLONG metrics.
- **tau_bench**: `OUTPUT_DIR/tau-bench-results.json` — `overall_success_rate`, tool/policy metrics.
- **terminal_bench**: `OUTPUT_DIR/terminal-bench-*.json` — `accuracy`, `total_tasks`, `passed_tasks`.

In the registry, each benchmark’s `extract_score` maps these JSON files to a single numeric score and a `higher_is_better` flag so you can compare runs or track over time.

## Related: plugin-rlm (Recursive Language Model)

The [plugin-rlm](https://github.com/elizaos-plugins/plugin-rlm) TypeScript implementation ([next/typescript](https://github.com/elizaos-plugins/plugin-rlm/tree/next/typescript)) integrates **Recursive Language Models (RLMs)** into ElizaOS so agents can process arbitrarily long context via recursive self-calls (Peek, Grep, Partition+Map, Summarize). Paper: [Recursive Language Models](https://arxiv.org/abs/2512.24601) (arXiv:2512.24601).

- **What it does:** Handles inputs far beyond standard context windows; can outperform vanilla long-context models on benchmarks (e.g. OOLONG, S-NIAH) using smaller models. Registers model types `TEXT_RLM_LARGE`, `TEXT_RLM_REASONING` and integrates with the runtime.
- **TypeScript:** `client.ts` (IPC to Python RLM backend), `index.ts` (plugin), `trajectory-integration.ts`, `cost.ts`. Stub mode when the backend is unavailable.
- **Config (env):** `ELIZA_RLM_BACKEND` (e.g. `gemini`, `openai`, `anthropic`, `groq`, `openrouter`), `ELIZA_RLM_ENV`, `ELIZA_RLM_MAX_ITERATIONS`, `ELIZA_RLM_MAX_DEPTH`, `ELIZA_RLM_VERBOSE`. TypeScript/Rust talk to the official Python RLM via IPC.
- **Link to rlm-bench:** The elizaOS benchmarks repo’s **rlm-bench** (see above) measures long-context behavior (S-NIAH, OOLONG). Using **plugin-rlm** in an agent is the runtime counterpart—enabling that behavior in production.
- **Relevance to VINCE:** Long-context market research, large knowledge ingest, and RAG beyond a single window (e.g. very long X threads, multi-doc briefings) can benefit from RLM. When suggesting long-context or rlm-bench work, mention plugin-rlm as the ElizaOS integration to consider.

## HyperliquidBench (perps/options)

HyperliquidBench is present in the elizaOS/benchmarks repo tree but may not yet be wired into the main registry. When it appears in the registry with a `build_command` and result path, add run instructions here for perps/options relevance to VINCE. Until then, treat it as “future” and only suggest tracking the repo for when it becomes runnable.

## Sentinel usage

Use this doc (ELIZAOS_BENCHMARKS) for run commands and which benchmarks apply: context_bench, agentbench, solana, gauntlet, rlm-bench, tau_bench, terminal_bench. When suggesting “run context_bench” or “run gauntlet”, point to the exact commands and output paths above so the team can run and interpret results without guessing.
