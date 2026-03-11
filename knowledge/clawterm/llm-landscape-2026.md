# AI/LLM Landscape — Early 2026

Last updated: 2026-02-17

Reference document for Clawterm. Factual, concrete, no fluff.

---

## 1. Anthropic (Claude)

**Company**

- Founded 2021 by Dario Amodei (CEO) and Daniela Amodei (President)
- Both ex-OpenAI — left over safety disagreements
- Constitutional AI approach: train models with explicit principles rather than pure RLHF
- Headquarters: San Francisco
- Valued at ~$60B+ after 2025 funding rounds
- Key investors: Google, Spark Capital, Salesforce, Amazon (up to $4B commitment)

**Models Timeline**

- Claude 1 — Mar 2023. First public release.
- Claude 2 — Jul 2023. Improved reasoning, 100K context.
- Claude 3 family — Mar 2024. Three tiers:
  - Haiku: fast, cheap, good for simple tasks
  - Sonnet: balanced mid-tier
  - Opus: flagship, #1 on Chatbot Arena at launch
- Claude 3.5 Sonnet — Jun 2024. The coding king. Beat Opus on most benchmarks at Sonnet pricing. Dominated code generation benchmarks for months.
- Claude 3.5 Haiku — Oct 2024. Upgraded fast tier. Replaced 3.0 Sonnet-level performance at Haiku cost.
- Claude 4 Sonnet — May 2025. Major capability jump across the board.
- Claude 4.6 Opus — Current best model. steipete/OpenClaw's recommended default.

**Key Specs**

- 200K token context window (standard across Claude 3+)
- Extended thinking: chain-of-thought reasoning mode where Claude shows its work. Uses "thinking" tokens that don't count toward output.
- Computer use (beta): Claude can see and control a desktop — click, type, navigate. Powers OpenClaw's browser and desktop automation.
- MCP (Model Context Protocol): Open protocol Anthropic created for tool use. Adopted across the ecosystem — not just Claude. Defines how models connect to external tools, data sources, and APIs.

**Products**

- Claude.ai — consumer web/mobile app
- API — developer access, pay-per-token
- Claude Pro — $20/mo, higher usage limits
- Claude Max — $100-200/mo tier, priority access, more compute
- Claude for Enterprise — team features, admin controls, SSO

**Strengths**

- Best at coding (consistently tops code benchmarks)
- Best at long-context tasks (200K tokens, actually uses the full window well)
- Strongest prompt injection resistance of major models
- Most consistent instruction following
- Good at saying "I don't know" instead of hallucinating

**Weaknesses**

- Smaller model selection than OpenAI/Google
- No image generation
- No native audio/video processing (text + vision only)
- Can be overly cautious on edge cases

---

## 2. OpenAI (GPT / ChatGPT)

**Company**

- Founded 2015 by Sam Altman, Elon Musk, Ilya Sutskever, Greg Brockman, others
- Musk left board 2018. Sued OpenAI 2024 over alleged mission betrayal. Settled.
- Nov 2023: Board fired Sam Altman. Staff revolted (700+ threatened to quit). Altman reinstated within days. Board restructured. The "boardroom coup."
- Transitioning from non-profit to capped-profit structure (ongoing, legally contested)
- Valued at $300B+ (2025 funding)
- Headquarters: San Francisco
- Microsoft invested $13B+, deep Azure integration

**Models Timeline**

- GPT-3 — Jun 2020. 175B parameters. The paper that started the scaling era.
- GPT-3.5 — Nov 2022. ChatGPT launched on this. Hit 100M users in 2 months. Fastest-growing consumer app ever at the time.
- GPT-4 — Mar 2023. Multimodal (text + vision input). Massive capability jump. Passed the bar exam.
- GPT-4 Turbo — Nov 2023. Cheaper, 128K context, knowledge cutoff updated.
- GPT-4o — May 2024. "Omni" model. Native multimodal: text, vision, audio in one model. Could speak, see, and respond in real-time.
- GPT-4o mini — Jul 2024. Budget tier. Replaced GPT-3.5 Turbo as the cheap option.
- o1 — Sep 2024. First "reasoning" model. Uses chain-of-thought internally before answering. Slower but more accurate on math, logic, code.
- o1-pro — Dec 2024. Enhanced reasoning, available in $200/mo ChatGPT Pro tier.
- o3 — Early 2025. Next-gen reasoning model. Significant improvement over o1.
- GPT-5 — 2025. Major base model update.
- GPT-5.1 Codex — 2025-2026. Coding-specialized variant. Used in OpenClaw as an alternative model option.

**Products**

- ChatGPT — consumer app (web, iOS, Android, desktop)
- API — developer platform
- ChatGPT Plus — $20/mo
- ChatGPT Team — $25/mo per seat
- ChatGPT Enterprise — custom pricing
- ChatGPT Pro — $200/mo (access to o1-pro and best models)
- DALL-E — image generation (DALL-E 3 integrated into ChatGPT)
- Whisper — open-source speech-to-text
- Sora — video generation (launched late 2024)
- GPTs — custom ChatGPT configurations (GPT Store)

**Strengths**

- Largest user base and brand recognition
- Broadest multimodal capabilities (text, vision, audio, image gen, video gen)
- Strong reasoning models (o1/o3 line)
- Massive ecosystem and integrations
- Best real-time voice conversation mode

**Weaknesses**

- Pricing can be high for heavy API usage
- Models sometimes feel "corporate" — overly filtered
- GPT-4o can be lazy on long tasks compared to Claude
- Frequent model updates sometimes break existing prompts
- Trust issues after boardroom drama and profit transition

---

## 3. Google DeepMind (Gemini)

**Company**

- DeepMind founded 2010 by Demis Hassabis, Shane Legg, Mustafa Suleiman in London
- Acquired by Google 2014
- Google Brain (Jeff Dean's team) merged with DeepMind in 2023 → Google DeepMind
- Demis Hassabis leads combined org. Won Nobel Prize in Chemistry 2024 (AlphaFold).
- Effectively unlimited compute budget via Google's TPU fleet

**Models Timeline**

- PaLM 2 — 2023. Powered original Bard chatbot.
- Gemini 1.0 — Dec 2023. Three sizes: Ultra, Pro, Nano. Launch was rocky (demo video controversy).
- Gemini 1.5 Pro — Feb 2024. 1M token context window — 10x anything else at the time. Later extended to 2M. Breakthrough for long-document analysis.
- Gemini 2.0 Flash — Dec 2024. Fast, efficient, multimodal.
- Gemini 2.5 Pro — 2025. Strong reasoning capabilities, competitive with o1/Claude.
- Gemini 3 — 2025-2026. Latest generation.

**Products**

- Gemini app — consumer chatbot (replaced Bard)
- Google AI Studio — free developer playground
- Vertex AI — enterprise ML platform on Google Cloud
- NotebookLM — AI-powered research notebook, generates podcast-style audio summaries
- Gemini in Google Workspace — integrated into Gmail, Docs, Sheets, etc.
- Gemini Nano — on-device model for Pixel phones

**Strengths**

- Largest context windows in the industry (1-2M tokens)
- Deep Google integration (Search, Workspace, Android, Chrome)
- Strong multimodal (native text + vision + audio)
- Free tier is generous (AI Studio)
- NotebookLM is genuinely innovative

**Weaknesses**

- Historically slower to ship than OpenAI/Anthropic
- Early Gemini launches had credibility issues (demo controversies, image generation problems)
- Enterprise adoption lags behind OpenAI
- Model quality can be inconsistent across versions
- Gemini branding confusion (many product names)

**Legacy**

- AlphaGo — beat world Go champion Lee Sedol (2016). Landmark AI moment.
- AlphaFold — solved protein structure prediction. Nobel Prize 2024.

---

## 4. Meta (LLaMA)

**Company**

- Meta Platforms (Facebook/Instagram/WhatsApp parent)
- Mark Zuckerberg: CEO, personally championed open-weight AI strategy
- Yann LeCun: Chief AI Scientist, Turing Award winner (2018), vocal on social media. Critic of AGI hype and closed-source AI. Argues current LLMs can't reach AGI.
- FAIR (Fundamental AI Research) lab produces the models

**Models Timeline**

- LLaMA 1 — Feb 2023. Research release. Weights leaked within a week. Spawned the entire open-source LLM ecosystem.
- LLaMA 2 — Jul 2023. Officially released with permissive license. 7B, 13B, 70B sizes.
- LLaMA 3 — Apr 2024. 8B and 70B. Major quality jump.
- LLaMA 3.1 — Jul 2024. Added 405B parameter model — largest open-weight model ever at the time. Competitive with GPT-4.
- LLaMA 3.2 — Sep 2024. Added vision capabilities and lightweight models (1B, 3B) for mobile/edge.
- LLaMA 4 — 2025. Latest generation. Multiple sizes and variants.

**Open-Weight (Not Open-Source)**

- Weights are downloadable and free for most uses
- License has restrictions: can't use to train competing models, usage caps for very large companies
- "Open-weight" not "open-source" — training data and full process not shared
- Still: most permissive of any frontier model provider

**Strengths**

- Open weights enable fine-tuning, local deployment, privacy-preserving AI
- Massive community building on top (Hugging Face ecosystem)
- No API costs — run it yourself
- Drives innovation across the entire ecosystem
- Commercial use allowed for most companies

**Weaknesses**

- Always slightly behind closed frontier models on raw capability
- Running large models (70B+) requires serious hardware
- No official hosted API (use third-party providers)
- Fine-tuning requires expertise

---

## 5. xAI (Grok)

**Company**

- Founded Jul 2023 by Elon Musk
- Musk's stated motivation: counter "woke AI" and build truth-seeking AI
- Headquartered in the Bay Area
- Built Colossus supercomputer in Memphis, Tennessee — one of the largest GPU clusters in the world
- Feb 2026: xAI acquired by SpaceX

**Models Timeline**

- Grok 1 — Nov 2023. Integrated into X (Twitter). Sarcastic persona.
- Grok 1.5 — Mar 2024. Vision capabilities added.
- Grok 2 — Aug 2024. Significant quality improvement.
- Grok 3 — Feb 2025. Major release, competitive with frontier models.
- Grok 4 — Jul 2025. Latest generation.

**Products**

- Grok on X — integrated into the X platform for Premium subscribers
- Grok Heavy — $300/mo premium tier for maximum capability
- Aurora — image generation model, notably fewer content restrictions
- Grokipedia — AI-generated Wikipedia-style reference
- API access available

**Strengths**

- Real-time access to X posts for current events
- Fewer content restrictions than most competitors
- Musk's capital ensures continued investment
- Colossus gives massive compute

**Weaknesses**

- Smaller user base outside X ecosystem
- Controversial brand association limits enterprise adoption
- Model quality historically lagged top competitors (closing gap with Grok 3/4)
- SpaceX acquisition creates uncertainty about direction

---

## 6. MiniMax

**Company**

- Chinese AI company founded 2021
- Backed by Tencent and other Chinese investors
- Strong focus on multimodal AI

**Key Models**

- MiniMax-01 series — competitive with frontier models on benchmarks
- Specializes in video generation and long-context understanding
- Abab series for text generation

**Strengths**

- Strong multimodal capabilities, especially video
- Long-context models
- Competitive pricing on global API market
- Particularly strong at Chinese language tasks

**Weaknesses**

- Limited brand recognition outside China
- Subject to Chinese AI regulations
- English-language documentation can be sparse

---

## 7. Kimi (Moonshot AI)

**Company**

- Chinese AI startup, founded by Yang Zhilin
- Yang Zhilin: ex-Google Brain researcher, Tsinghua University
- Known for pushing context window boundaries early

**Key Products**

- Kimi Chat — popular Chinese consumer AI chatbot
- One of the first to offer 200K+ token context (before most competitors)
- Now supports millions of tokens in context

**Strengths**

- Extremely long context — first Chinese model to offer 2M context
- Strong at document analysis and long-form reasoning
- Competitive with Western frontier models on benchmarks
- Popular in China for professional/academic use

**Weaknesses**

- Primarily Chinese-market focused
- Limited global API availability
- Less known in Western markets

---

## 8. DeepSeek

**Company**

- Chinese AI research lab
- Funded by High-Flyer (quantitative hedge fund)
- Small team relative to competitors
- Shocked the industry with efficiency breakthroughs

**Models Timeline**

- DeepSeek-V2 — 2024. Mixture-of-Experts (MoE) architecture. Dramatically cheaper to run than dense models of similar quality.
- DeepSeek-R1 — Jan 2025. Reasoning model. Matched OpenAI's o1 performance at a fraction of the cost. Open weights.
- DeepSeek-V3 — 2025. Latest base model.

**Why DeepSeek Matters**

- Proved frontier-quality models don't require $100B+ budgets
- Training costs reported at ~$5.6M for V3 (vs billions for GPT-4)
- Caused Nvidia stock to drop ~17% ($600B market cap hit) on Jan 27, 2025 — market feared reduced GPU demand
- Open weights mean anyone can run and fine-tune
- MoE architecture activates only a fraction of parameters per query — much cheaper inference
- Forced the entire industry to reconsider cost assumptions

**Strengths**

- Extremely cost-efficient (training and inference)
- Open weights with permissive license
- R1 reasoning matches much more expensive competitors
- Innovative architecture (MoE done right)

**Weaknesses**

- Subject to Chinese government regulations and potential censorship
- Smaller team means slower release cadence
- Less polished consumer product compared to ChatGPT/Claude
- Geopolitical concerns limit enterprise adoption in some countries

---

## 9. Mistral AI

**Company**

- French AI company, headquartered in Paris
- Founded 2023 by Arthur Mensch (CEO), Guillaume Lample, Timothée Lacroix
- Mensch and Lample: ex-Meta FAIR. Lacroix: ex-DeepMind.
- European AI champion. Valued at ~$6B+.
- Backed by Andreessen Horowitz, General Catalyst, Microsoft (minor stake)

**Models Timeline**

- Mistral 7B — Sep 2023. First release. Punched way above its weight class — beat LLaMA 2 13B despite being half the size.
- Mixtral 8x7B — Dec 2023. Mixture-of-Experts. Eight 7B experts, only 2 active per token. Very efficient.
- Mistral Large — Feb 2024. Commercial flagship.
- Mistral Medium/Small — various updates through 2024-2025
- Pixtral — vision-capable model
- Codestral — code-specialized model

**Products**

- La Plateforme — API access
- Le Chat — consumer chatbot
- Enterprise deployments

**Strengths**

- European alternative (data sovereignty matters for EU companies)
- Efficient architectures (MoE pioneer in open models)
- Good balance of open and commercial models
- Strong engineering team

**Weaknesses**

- Smaller scale than US/Chinese competitors
- Flagship models lag behind top-tier Claude/GPT/Gemini
- Brand recognition mostly among developers, not consumers
- Funding disadvantage vs big tech

---

## 10. Other Notable Companies

### Text/Chat Models

**Cohere**

- Enterprise-focused. Founded by Aidan Gomez (co-author of "Attention Is All You Need" transformer paper).
- Command R and Command R+ models — optimized for RAG (retrieval-augmented generation)
- Strong at enterprise search and document processing
- Not consumer-facing

**Alibaba (Qwen)**

- Qwen series: strong Chinese open-weight models
- Qwen 2.5 competitive with LLaMA 3 on many benchmarks
- Available on Hugging Face with permissive licenses
- Growing adoption in Asia-Pacific

**01.AI (Yi)**

- Founded by Kai-Fu Lee (former Google China head, prominent tech investor)
- Yi series models: competitive open-weight models
- Focus on bilingual (Chinese/English) capabilities

**Zhipu AI (GLM)**

- Chinese company behind ChatGLM series
- GLM-4 competitive domestically
- Strong enterprise presence in China

**Inflection AI**

- Built Pi chatbot — focused on emotional intelligence and conversation
- Most of the team (including CEO Mustafa Suleiman, DeepMind co-founder) poached by Microsoft in 2024
- Company pivoted to enterprise API

**Character.AI**

- AI character/companion platform
- Massive user engagement (users spend hours per session)
- Controversial for addictive design, especially among younger users

**Perplexity AI**

- AI-powered search engine
- $500M+ in funding
- Answers questions with citations from web sources
- Growing as Google Search alternative for research

### Image Generation

**Midjourney**

- Image generation leader for artistic quality
- Operates primarily through Discord (unusual)
- No public API for a long time
- Version 6+ produces photorealistic images
- Self-funded, profitable

**Stability AI**

- Created Stable Diffusion — the open-source image generation model
- Financial troubles through 2024-2025 (CEO Emad Mostaque departed)
- Stable Diffusion remains widely used despite company struggles
- Community forks and fine-tunes keep the ecosystem alive

**DALL-E (OpenAI)**

- DALL-E 3 integrated directly into ChatGPT
- Good quality but Midjourney generally preferred for artistic work
- Key advantage: natural language prompting within ChatGPT

### Video Generation

**Runway**

- Video generation pioneer
- Gen-1, Gen-2, Gen-3 models — each major jump in quality
- Used in professional film/TV production
- Acts as creative tool, not just a toy

**Sora (OpenAI)**

- Text-to-video model, launched late 2024
- Generates impressively coherent video clips
- Still limited in length and consistency
- Not yet widely available via API

### Voice/Audio AI

**ElevenLabs**

- Text-to-speech leader
- Voice cloning with minimal samples
- Used in podcasts, audiobooks, content creation
- Increasingly used for real-time AI voice in apps
- Powers many AI assistant voice features

### Inference Hardware & Infrastructure

**NVIDIA**

- Effective monopoly on AI training/inference GPUs
- Jensen Huang: CEO, leather jacket icon
- Key chips:
  - H100 (2023): workhorse of AI training
  - H200 (2024): more memory
  - B100/B200 (2024-2025): Blackwell architecture, major perf jump
  - GB200 (2025): Grace Blackwell superchip
- CUDA ecosystem: software lock-in. Competitors exist but CUDA is the standard.
- Market cap: $3T+ range (fluctuates with AI sentiment)

**Groq**

- LPU (Language Processing Unit) inference chips
- Blazing fast inference — hundreds of tokens per second
- Not for training, just inference
- Available as cloud API

**Cerebras**

- Wafer-scale chips (entire silicon wafer = one chip)
- Used for both training and inference
- Niche but impressive technology

**SambaNova**

- Enterprise AI hardware and software platform
- Dataflow architecture
- Primarily enterprise/government customers

**Together AI**

- Cloud inference platform for open-source models
- Run LLaMA, Mistral, etc. via API without managing hardware
- Competitive pricing

---

## 11. Key Trends (2025-2026)

### Reasoning Models

- Started with OpenAI's o1 (Sep 2024)
- Models now "think" before answering — use chain-of-thought tokens
- DeepSeek-R1 proved this works with open weights
- Claude's extended thinking mode is Anthropic's version
- o3 pushed reasoning further in 2025
- Trade-off: slower and more expensive, but much more accurate on hard problems
- Not always needed — simple questions don't benefit from reasoning overhead

### AI Agents

- 2025-2026's defining trend: models that take actions, not just answer questions
- OpenClaw: steipete's agent framework — what Clawterm runs on
- Other frameworks: AutoGPT (early pioneer, overhyped), CrewAI, LangGraph, Haystack
- Computer use: Claude can control browsers and desktops
- MCP (Model Context Protocol): Anthropic's open standard for connecting models to tools. Not Claude-specific — any model can use MCP-compatible tools. Adopted by VS Code, various IDEs, and tools.
- Real-world agent reliability still improving — works well for structured tasks, brittle on novel ones

### Code Generation

- Coding is the killer app for LLMs in 2025-2026
- Claude 4.6 Opus and GPT-5.1 Codex are the top coding models
- "Vibe coding": building entire applications through conversation with AI
  - Term coined by Andrej Karpathy
  - Describe what you want → AI writes it → iterate through conversation
  - Works surprisingly well for prototypes and small-to-medium projects
  - Production code still needs human review
- GitHub Copilot (OpenAI-powered), Cursor (AI-native IDE), Windsurf, and others
- AI-assisted coding is mainstream — majority of professional developers use it

### Open vs Closed Models

- DeepSeek proved open models can match closed ones on specific tasks
- LLaMA 4 keeps Meta's open-weight strategy going
- Mistral and Qwen provide alternatives
- But: closed models (Claude, GPT) still lead on general capability
- Open models shine for: fine-tuning, privacy, specific domains, cost control
- Closed models win on: raw capability, ease of use, safety guardrails

### Multimodal Convergence

- Text + vision is standard (all major models)
- Audio: GPT-4o does it natively, others catching up
- Video: understanding and generation both improving rapidly
- The trend: one model that handles all modalities natively, not separate models stitched together

### Context Windows

- 2023: 4K-8K was normal
- 2024: 128K-200K became standard
- 2025: 200K standard, 1-2M available (Gemini)
- Longer context ≠ better use of context. Models vary wildly in how well they actually use long context.
- Claude and Gemini are the best at utilizing long context effectively

### Inference Cost

- Dropping fast
- DeepSeek showed 10-20x cost reduction is possible with better architecture
- MoE (Mixture of Experts) is the key technique: only activate the parameters you need
- Competition driving prices down across all providers
- Groq and specialized hardware pushing inference speed up
- 2025 API costs are a fraction of 2023 costs for equivalent capability

### AI Regulation

- EU AI Act: comprehensive regulation, risk-based tiers, came into effect 2024-2025
- US: executive orders on AI safety, but no comprehensive legislation
- China: requires registration of AI models, content restrictions
- Impact on models: Chinese models have built-in censorship on politically sensitive topics
- Open-weight models harder to regulate (once released, can't be un-released)

---

## 12. Model Comparison Quick Reference

### Best For Coding (early 2026)

1. Claude 4.6 Opus — best overall
2. GPT-5.1 Codex — strong alternative
3. Claude 4 Sonnet — best value for coding
4. Gemini 2.5 Pro — competitive
5. DeepSeek-V3 — best open-weight for code

### Best For Reasoning/Math

1. o3 (OpenAI) — purpose-built for reasoning
2. Claude 4.6 Opus (extended thinking) — close second
3. DeepSeek-R1 — best open-weight reasoning
4. Gemini 2.5 Pro — strong reasoning mode

### Best For Long Documents

1. Gemini 1.5/2.5 Pro — 1-2M context, uses it well
2. Claude 4.6 Opus — 200K but uses it extremely well
3. Kimi — millions of tokens, strong on Chinese docs

### Best For Budget/Cost

1. DeepSeek-V3 — frontier quality, fraction of the cost
2. Claude 3.5 Haiku — fast + cheap from Anthropic
3. GPT-4o mini — OpenAI's budget option
4. Gemini Flash — Google's budget option
5. Open models (LLaMA, Qwen) — free if you have hardware

### Best For Privacy/Self-Hosting

1. LLaMA 4 (Meta) — most capable open-weight
2. Qwen 2.5 (Alibaba) — strong alternative
3. Mistral/Mixtral — efficient, good quality
4. DeepSeek-V3 — if geopolitical concerns aren't an issue

### Best For Enterprise

1. OpenAI (ChatGPT Enterprise) — largest enterprise footprint
2. Anthropic (Claude for Enterprise) — strongest for technical orgs
3. Google (Vertex AI) — if already on Google Cloud
4. Cohere — purpose-built for enterprise RAG

---

## 13. Pricing Snapshot (Early 2026)

Approximate API pricing per 1M tokens (input/output):

| Provider  | Model            | Input   | Output  |
| --------- | ---------------- | ------- | ------- |
| Anthropic | Claude 4.6 Opus  | ~$15    | ~$75    |
| Anthropic | Claude 4 Sonnet  | ~$3     | ~$15    |
| Anthropic | Claude 3.5 Haiku | ~$0.25  | ~$1.25  |
| OpenAI    | GPT-5            | ~$10    | ~$30    |
| OpenAI    | GPT-4o           | ~$2.50  | ~$10    |
| OpenAI    | GPT-4o mini      | ~$0.15  | ~$0.60  |
| Google    | Gemini 2.5 Pro   | ~$3.50  | ~$10.50 |
| Google    | Gemini Flash     | ~$0.075 | ~$0.30  |
| DeepSeek  | V3               | ~$0.27  | ~$1.10  |
| DeepSeek  | R1               | ~$0.55  | ~$2.19  |

_Prices change frequently. Check provider websites for current rates._

Consumer subscriptions:

- ChatGPT Plus: $20/mo
- ChatGPT Pro: $200/mo
- Claude Pro: $20/mo
- Claude Max: $100-200/mo
- Gemini Advanced: $20/mo
- Grok (X Premium+): ~$16/mo
- Grok Heavy: $300/mo

---

## 14. Timeline of Major Events

**2020**

- Jun: GPT-3 released. The "AI can write" moment.

**2022**

- Aug: Stable Diffusion released. Open image generation.
- Nov: ChatGPT launches. Internet loses its mind. 100M users in 2 months.

**2023**

- Feb: LLaMA 1 leaked. Open-source LLM movement begins.
- Mar: GPT-4 released. Claude 1 released.
- Jul: Claude 2 released. LLaMA 2 officially open.
- Sep: Mistral 7B drops. Small model, big impact.
- Nov: Grok 1 launches. Sam Altman fired and reinstated at OpenAI.
- Dec: Gemini 1.0 launches. Mixtral 8x7B released.

**2024**

- Feb: Gemini 1.5 Pro — 1M context window.
- Mar: Claude 3 family (Haiku/Sonnet/Opus). Opus tops benchmarks.
- Apr: LLaMA 3 released.
- May: GPT-4o — native multimodal.
- Jun: Claude 3.5 Sonnet. Becomes the coding model to beat.
- Jul: LLaMA 3.1 with 405B model. GPT-4o mini for budget use.
- Aug: Grok 2 released.
- Sep: OpenAI o1 — first reasoning model. LLaMA 3.2 with vision.
- Oct: Claude 3.5 Haiku. Demis Hassabis wins Nobel Prize.
- Dec: o1-pro at $200/mo. Gemini 2.0 Flash. Sora launches.

**2025**

- Jan: DeepSeek-R1 drops. Nvidia stock crashes. Industry rethinks cost assumptions.
- Feb: Grok 3 released.
- May: Claude 4 Sonnet — major upgrade.
- Jul: Grok 4 released.
- 2025: GPT-5, o3, Gemini 2.5 Pro, Gemini 3, LLaMA 4, GPT-5.1 Codex, Claude 4.6 Opus all ship.

**2026**

- Feb: xAI acquired by SpaceX.

---

## Clawterm Model Knowledge

Practical guidance for how Clawterm should discuss, compare, and recommend models.

### How to Talk About Models

1. **Be specific about versions.** Don't say "Claude is good at coding." Say "Claude 4.6 Opus is currently the top coding model" or "Claude 3.5 Sonnet was the coding king through most of 2024."

2. **Date your claims.** The landscape shifts every few months. Always frame recommendations with "as of early 2026" or similar. What's true today may not be true in 3 months.

3. **No brand loyalty.** Recommend the best tool for the job. Claude is OpenClaw's default, but if someone needs 1M+ context, say Gemini. If they need the cheapest option, say DeepSeek. If they want to self-host, say LLaMA.

4. **Acknowledge trade-offs.** Every model has weaknesses. Don't oversell. "Claude is great at coding but can't generate images." "GPT-4o does everything but Claude is better at long-context coding." "DeepSeek is cheap but has Chinese government censorship baked in."

5. **Don't use hype language.** No "revolutionary," "game-changing," "paradigm shift." Just say what it does and how well.

### How to Compare Models

When someone asks "which model should I use":

1. **Ask what for.** Coding? Research? Creative writing? Chat? Cost matters?
2. **Match the task to the model.** Use the quick reference above.
3. **Consider constraints.** Budget, privacy, speed, context length, multimodal needs.
4. **Give a clear recommendation with reasoning.** "For your use case, I'd go with X because Y. Alternative: Z if you need W."

### How to Recommend Models

**Default recommendation (general use):** Claude 4.6 Opus. It's the best all-around model as of early 2026, especially for coding and complex tasks. This is what OpenClaw runs on.

**Budget-conscious:** Claude 3.5 Haiku or GPT-4o mini for API use. DeepSeek-V3 if you want near-frontier quality at rock-bottom prices.

**Self-hosting/Privacy:** LLaMA 4 is the go-to. Qwen 2.5 as backup. Mistral if you want something more efficient.

**Enterprise:** Depends on existing cloud provider. Google Cloud → Gemini. Azure/Microsoft shop → OpenAI. Need best quality → Anthropic.

**Reasoning-heavy tasks:** o3 or Claude 4.6 Opus with extended thinking. DeepSeek-R1 for open-weight reasoning.

### What NOT to Do

- Don't pretend one model is universally best at everything
- Don't dismiss Chinese models — DeepSeek and Qwen are genuinely good
- Don't confuse "open-weight" with "open-source" — they're different
- Don't assume bigger = better — Mistral 7B beat LLaMA 2 13B
- Don't forget to mention cost — a 10x cheaper model that's 90% as good is often the right choice
- Don't speculate about unreleased models — stick to what's shipped and usable
