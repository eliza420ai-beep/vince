# Knowledge Base for Strategy Optimization Agent

This directory contains the proprietary knowledge that powers the Strategy Optimization Agent. The knowledge base uses ElizaOS's RAG (Retrieval-Augmented Generation) system via the `@elizaos/plugin-knowledge` plugin to provide contextual understanding of options trading strategies.

## 🚀 Quick Start (5 Minutes)

The Knowledge Plugin works out of the box! Here's the simplest setup:

### Step 1: Plugin is Already Added ✅

The plugin is already configured in `src/agents/strategy-optimization.ts`. No changes needed!

### Step 2: Auto-Load Documents

Add to your `.env` file:

```bash
# Auto-load documents from knowledge/ directory on startup
LOAD_DOCS_ON_STARTUP=true

# Tell plugin to use knowledge/ instead of default docs/ folder
KNOWLEDGE_PATH=./knowledge
```

### Step 3: Start Your Agent

```bash
bun start
# or
elizaos start
```

Documents in `knowledge/strategy-optimization/` will be automatically processed!

### Step 4: Use the Web Interface

1. Open `http://localhost:3000` in your browser
2. Select your agent (StrategyOptimizer)
3. Click the **Knowledge tab** in the right panel
4. You can now:
   - 📤 Upload new documents (drag & drop!)
   - 🔍 Search existing documents
   - 📋 View all processed documents
   - 🗑️ Delete documents you no longer need

### Step 5: Ask Your Agent

Once documents are loaded, ask naturally:

- "What does the $HYPE wheel strategy say about strike selection?"
- "Search your knowledge for risk-reward analysis"
- "What's your experience with the $26 vs $27 strike decision?"

## Enhanced Knowledge Management

We're using **`@elizaos/plugin-knowledge`** for improved knowledge management with:

### Core Features (Automatic)

- **Content-based deduplication**: Prevents duplicate documents using content-based IDs
- **Intelligent chunking**: Smart text splitting with 500 token chunks and 100 token overlap
- **RAG metadata tracking**: Conversation memories enriched with knowledge usage metadata
- **Knowledge Provider**: Automatically injects top 5 relevant fragments into conversations

### Configuration Features

- **Better RAG capabilities**: Enhanced document processing and semantic search
- **Automatic document loading**: Load documents from the `knowledge/` directory on startup
- **Contextual embeddings**: 50% better retrieval accuracy when enabled (optional)
- **Multiple file format support**: PDF, Markdown, text, code files, and more

### Management Features

- **Web interface**: Manage documents through the web UI at `http://localhost:3000`
- **REST API**: Programmatic document management via HTTP endpoints
- **Document actions**: `PROCESS_KNOWLEDGE` and `SEARCH_KNOWLEDGE` actions for agent interactions

> 💡 **Tip**: See [ADVANCED.md](./ADVANCED.md) for detailed documentation on advanced features like REST API, RAG tracking, and performance optimization.

## Directory Structure

```
knowledge/
├── README.md (this file)
├── strategy-optimization/
│   ├── hype-wheel-strategy.md        # Real-world $HYPE wheel strategy implementation and case study
│   ├── weekly-evaluation.md          # How we evaluate options strategies weekly
│   ├── volatility-assessment.md      # Volatility assessment frameworks
│   ├── strike-selection.md           # Covered calls and secured puts strike selection
│   ├── risk-reward-analysis.md       # Risk-reward ratio calculations
│   ├── hypersurface-dynamics.md      # Hypersurface platform specifics
│   └── market-structure.md           # Interpreting TVL, volume, and liquidity
└── examples/
    └── case-studies.md               # Example recommendations and outcomes
```

## Knowledge Files

### Required Knowledge Files

The Strategy Optimization Agent requires knowledge files to demonstrate how contextual interpretation transforms raw data. Create these files with your proprietary expertise:

#### 1. `strategy-optimization/weekly-evaluation.md`

Describe your team's methodology for evaluating options strategies weekly. Include:

- Volatility assessment approaches
- Market sentiment analysis methods
- Risk-reward ratio calculation frameworks
- Weekly rebalancing protocols
- How to integrate multiple data sources

Example structure:

```markdown
# Weekly Options Strategy Evaluation Methodology

## Overview

Our weekly evaluation process synthesizes multiple data sources to select optimal strikes...

## Volatility Assessment

We assess volatility through multiple lenses:

- Historical volatility from price data
- Implied volatility from options markets
- Protocol-level volatility from TVL/volume ratios

## Market Sentiment Analysis

...
```

#### 2. `strategy-optimization/strike-selection.md`

Document your strike selection methodology for covered calls and secured puts. Include:

- Covered call strike selection criteria
- Secured put strike selection criteria
- OTM (Out-of-the-Money) distance calculations
- Premium capture vs. protection balance
- How raw price/volatility data transforms into strike selection

#### 3. `strategy-optimization/market-structure.md`

Explain how to interpret DeFiLlama metrics in context of options trading. Include:

- How TVL/volume ratios indicate liquidity risk
- Protocol fee trends as indicators of market structure changes
- What metrics matter for options vs. general trading
- How to read "between the lines" of raw metrics

#### 4. `strategy-optimization/hypersurface-dynamics.md`

Document Hypersurface platform-specific knowledge. Include:

- Options liquidity patterns by strike
- Bid-ask spread considerations
- Platform-specific risk factors
- How Hypersurface differs from traditional options markets

#### 5. `strategy-optimization/risk-reward-analysis.md`

Describe your risk-reward frameworks. Include:

- How to calculate risk-reward ratios for covered calls
- How to calculate risk-reward ratios for secured puts
- Position sizing considerations
- Maximum acceptable risk thresholds

## Configuring Knowledge with the Plugin

The Strategy Optimization Agent uses **`@elizaos/plugin-knowledge`** for enhanced knowledge management.

### Plugin Configuration

The plugin is automatically configured in `src/agents/strategy-optimization.ts`:

```typescript
plugins: [
  // ... other plugins
  "@elizaos/plugin-knowledge", // Enhanced knowledge management with RAG
],
settings: {
  ragKnowledge: true, // Enables RAG knowledge retrieval
  // ... other settings
},
```

### Automatic Document Loading

To automatically load documents from the `knowledge/` directory on startup, add to your `.env`:

```bash
# Auto-load documents from knowledge/ directory on startup
LOAD_DOCS_ON_STARTUP=true

# Optional: Custom knowledge directory path (default: ./knowledge)
KNOWLEDGE_PATH=./knowledge
```

### 🚀 Enhanced Configuration: Contextual Embeddings (Recommended)

For **50% better retrieval accuracy** and **90% cost reduction through caching**, enable contextual embeddings:

```bash
# Enable contextual embeddings (50% better accuracy)
CTX_KNOWLEDGE_ENABLED=true

# Use Anthropic Claude 3.5 Sonnet for context generation (already configured in your agent)
TEXT_PROVIDER=anthropic
TEXT_MODEL=claude-3-5-sonnet-20241022

# Or use OpenRouter with Claude for cost efficiency + caching
# TEXT_PROVIDER=openrouter
# TEXT_MODEL=anthropic/claude-3.5-sonnet
# OPENROUTER_API_KEY=sk-...

# Embedding model (for generating final embeddings after context enrichment)
EMBEDDING_PROVIDER=openai
TEXT_EMBEDDING_MODEL=text-embedding-3-small
```

**What This Does:**

- Enriches each document chunk with surrounding context before embedding
- Improves semantic search accuracy by ~50%
- Caches document context to reduce costs by ~90% on reprocessing
- Perfect for complex strategy documents like `hype-wheel-strategy.md`

**Alternative: OpenRouter + Claude (Cost-Efficient)**

If you want better cost efficiency with caching:

```bash
CTX_KNOWLEDGE_ENABLED=true
TEXT_PROVIDER=openrouter
TEXT_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_API_KEY=sk-...
EMBEDDING_PROVIDER=openai
TEXT_EMBEDDING_MODEL=text-embedding-3-small
```

### Performance Tuning (Optional)

For optimal performance with large documents:

```bash
# Parallel processing limits
MAX_CONCURRENT_REQUESTS=30

# Rate limiting
REQUESTS_PER_MINUTE=60
TOKENS_PER_MINUTE=150000

# Chunk size configuration
MAX_INPUT_TOKENS=4000
MAX_OUTPUT_TOKENS=4096
```

### Using the Knowledge Plugin

#### 1. Automatic Loading (Recommended)

**Setup:**

```bash
# .env
LOAD_DOCS_ON_STARTUP=true
KNOWLEDGE_PATH=./knowledge
```

**Usage:**

- Place documents in `knowledge/strategy-optimization/`
- Start agent: `bun start`
- Documents are automatically processed on startup

#### 2. Web Interface (Recommended for Management)

**Access:**

1. Start agent: `bun start`
2. Open `http://localhost:3000` in browser
3. Select your agent (StrategyOptimizer)
4. Click **Knowledge tab** in right panel

**Features:**

- 📤 **Upload**: Drag & drop files or click to upload
- 🔍 **Search**: Search through all documents
- 📋 **View**: See all processed documents with metadata
- 🗑️ **Delete**: Remove documents you no longer need
- ✅ **Status**: See processing status in real-time

**Example Workflow:**

```
1. Upload: Drag `new-strategy.pdf` into Knowledge tab
2. Wait: Document is processed automatically
3. Ask: "What does the new strategy document say about volatility?"
4. Agent: Retrieves relevant sections and responds with context
```

#### 3. Agent Actions

Your agent automatically gets these capabilities:

**PROCESS_KNOWLEDGE Action:**

- "Remember this document: `/path/to/file.md`"
- "Process this text: [paste content]"
- Agent processes and stores the content for future retrieval

**SEARCH_KNOWLEDGE Action:**

- "Search your knowledge for strike selection methodology"
- "What do you know about $HYPE volatility patterns?"
- "Find information about risk-reward calculations"

**Example Chat:**

```
You: Search your knowledge for information about the $26 strike decision
Agent: Based on my knowledge of the $HYPE wheel strategy, the $26 strike was
       selected because it offers 118% APR compared to 65% at $27, representing
       nearly double the yield. The position-level impact shows ~$1,000 additional
       weekly premium on a 3,600 $HYPE position...
```

#### 4. Organizing Documents in Subfolders

You can organize documents in subfolders for better structure:

```
knowledge/
├── strategy-optimization/
│   ├── hype-wheel-strategy.md
│   ├── weekly-evaluation.md
│   └── strike-selection.md
├── examples/
│   └── case-studies.md
└── risk-analysis/
    └── risk-reward-analysis.md
```

All subfolders are automatically discovered and processed when `LOAD_DOCS_ON_STARTUP=true`.

#### 5. Programmatic Access

For advanced use cases, the plugin provides a `KnowledgeService` for programmatic document management (see [Complete Developer Guide](https://docs.elizaos.ai/plugin-registry/knowledge/complete-developer-guide)).

### Legacy Directory-Based Configuration

The character's `knowledge` array is now optional with the plugin. The plugin handles document loading more efficiently:

```typescript
// Legacy approach (still works but plugin handles it better)
knowledge: [
  { directory: 'strategy-optimization', shared: false },
],

// With plugin: Just enable LOAD_DOCS_ON_STARTUP=true
// Plugin automatically discovers and processes all files
```

## How Knowledge Transforms Recommendations

### Example: Without Knowledge (Raw Data Only)

```
BTC price: $67k
Volatility: 45%
Recommendation: $70k strike (+4.5% OTM)
```

### Example: With Knowledge (Contextual Analysis)

```
BTC price: $67k
Volatility: 45%
TVL/Volume ratio: Low (indicates volatility risk)
Hypersurface liquidity: Better at $68.5k than $70k
Weekly volatility regime: Compression expected

Knowledge-based reasoning:
- Low TVL/volume suggests higher assignment risk
- Liquidity optimization favors $68.5k
- Volatility compression supports closer strikes

Recommendation: $68.5k strike (+2.2% OTM)
```

## Proving the Value of Context

The knowledge base enables the Strategy Optimization Agent to:

1. **Contrast interpretations**: Show raw data vs. contextual analysis
2. **Reference specific frameworks**: Cite methodology from knowledge files
3. **Demonstrate outcomes**: Show how contextual recommendations outperform naive ones
4. **Explain reasoning**: Trace recommendations back to knowledge base insights
5. **Track knowledge usage**: RAG metadata shows which knowledge influenced each response (automatic)

## Testing Knowledge Integration

To verify knowledge is being used:

1. Ask the Strategy Optimization Agent: "How does your recommendation differ from raw data?"
2. Ask for specific methodology: "What framework do you use for volatility assessment?"
3. Request reasoning trace: "Walk me through how you transformed price data into a strike recommendation"

The agent should reference concepts from your knowledge files and demonstrate contextual reasoning.

## Best Practices

### Document Management

1. **Use the `knowledge/` folder** (Recommended)
   - ✅ Version controlled (git)
   - ✅ Auto-loaded on startup
   - ✅ Consistent across deployments
   - ✅ One topic per document

2. **Use web interface for dynamic content**
   - ✅ User-uploaded documents
   - ✅ Frequently changing content
   - ✅ Testing different documents
   - ✅ One-off documents

3. **DON'T hardcode large content**
   - ❌ Avoid large `knowledge` arrays in character config
   - ✅ Use files for real documents
   - ✅ Only use `knowledge` array for tiny snippets (<100 tokens)

### Content Quality

1. **Be specific**: Knowledge files should contain concrete methodologies, not vague principles
2. **Use examples**: Include worked examples showing knowledge application
3. **Document edge cases**: Explain how knowledge handles unusual market conditions
4. **Keep updated**: Update knowledge as your strategies evolve
5. **Reference data sources**: Explain how knowledge integrates with Price Monitor and Metrics Analyst data

### Organization

1. **One topic per document**: Better retrieval accuracy
2. **Use descriptive names**: `hype-wheel-strategy.md` not `doc1.md`
3. **Organize in subfolders**: `strategy-optimization/`, `market-analysis/`
4. **Document structure**: Use markdown headers, lists, sections

See [EXAMPLES.md](./EXAMPLES.md) for detailed examples and real-world usage patterns.

## 📋 Installation & Setup

The `@elizaos/plugin-knowledge` plugin is already installed and configured in the project. Follow these steps to optimize it:

### Step 1: Install Dependencies

```bash
bun install
```

### Step 2: Configure Environment Variables

Add these to your `.env` file for optimal knowledge management:

```bash
# ==========================================
# BASIC CONFIGURATION (Required)
# ==========================================

# Auto-load documents from knowledge/ directory on startup
LOAD_DOCS_ON_STARTUP=true

# Optional: Custom knowledge directory path (default: ./knowledge)
KNOWLEDGE_PATH=./knowledge

# ==========================================
# CONTEXTUAL EMBEDDINGS (Highly Recommended)
# ==========================================

# Enable contextual embeddings for 50% better retrieval accuracy
CTX_KNOWLEDGE_ENABLED=true

# Use Anthropic Claude 3.5 Sonnet (already in your agent config)
TEXT_PROVIDER=anthropic
TEXT_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_API_KEY=your-anthropic-key

# Embedding model for final embeddings
EMBEDDING_PROVIDER=openai
TEXT_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_API_KEY=your-openai-key

# ==========================================
# PERFORMANCE TUNING (Optional)
# ==========================================

# Parallel processing (adjust based on your system)
MAX_CONCURRENT_REQUESTS=30

# Rate limiting
REQUESTS_PER_MINUTE=60
TOKENS_PER_MINUTE=150000

# Chunk size limits
MAX_INPUT_TOKENS=4000
MAX_OUTPUT_TOKENS=4096

# ==========================================
# LOGGING (For Debugging)
# ==========================================

# Set to debug to see contextual embedding logs
# LOG_LEVEL=debug
```

### Step 3: Add Knowledge Files

Place your markdown/PDF files in `knowledge/strategy-optimization/`:

**Already Created:**

- ✅ `hype-wheel-strategy.md` - Real-world $HYPE wheel strategy case study

**Recommended Additional Files:**

- 📝 `weekly-evaluation.md` - Weekly strategy evaluation methodology
- 📝 `strike-selection.md` - Strike selection frameworks
- 📝 `market-structure.md` - DeFiLlama metrics interpretation
- 📝 `hypersurface-dynamics.md` - Platform-specific knowledge
- 📝 `risk-reward-analysis.md` - Risk-reward frameworks

**Supported File Types:**

- **Text:** `.txt`, `.md`, `.csv`, `.json`, `.xml`, `.yaml`
- **Documents:** `.pdf`, `.doc`, `.docx`
- **Code:** `.js`, `.ts`, `.py`, `.java`, `.cpp`, `.html`, `.css`, and more

### Step 4: Start the Agent

```bash
bun start
# or
elizaos start
```

**What Happens:**

- ✅ Documents in `knowledge/` are automatically discovered
- ✅ All files are processed into searchable chunks
- ✅ Embeddings are generated (with contextual enrichment if enabled)
- ✅ Documents are ready for RAG retrieval in conversations

### Step 5: Verify Setup

**Check Web Interface:**

1. Open `http://localhost:3000`
2. Select StrategyOptimizer agent
3. Click Knowledge tab
4. Verify `hype-wheel-strategy.md` appears in the list

**Test in Chat:**

```
You: What do you know about the $HYPE wheel strategy?
Agent: [Should reference content from hype-wheel-strategy.md]
```

## Optimization Checklist

### ✅ Completed

1. ✅ Plugin installed and configured (`@elizaos/plugin-knowledge` in dependencies)
2. ✅ Agent configured with plugin (in `src/agents/strategy-optimization.ts`)
3. ✅ `ragKnowledge: true` enabled in character settings
4. ✅ First knowledge file created (`hype-wheel-strategy.md`)

### 📋 Recommended Next Steps

5. 🔧 **Enable Contextual Embeddings** (50% better accuracy):
   - Add `CTX_KNOWLEDGE_ENABLED=true` to `.env`
   - Configure `TEXT_PROVIDER` and `TEXT_MODEL` (already using Anthropic)
   - This significantly improves retrieval quality for complex strategy documents

6. 🔧 **Auto-loading Configuration**:
   - Add `LOAD_DOCS_ON_STARTUP=true` to `.env`
   - Documents in `knowledge/` will be processed automatically

7. 📝 **Create Additional Knowledge Files**:
   - `weekly-evaluation.md` - Weekly strategy evaluation methodology
   - `strike-selection.md` - Strike selection frameworks
   - `market-structure.md` - DeFiLlama metrics interpretation
   - `hypersurface-dynamics.md` - Platform-specific knowledge
   - `risk-reward-analysis.md` - Risk-reward frameworks

8. 🧪 **Test Knowledge Retrieval**:
   - Ask: "How does your recommendation differ from raw data?"
   - Ask: "What framework do you use for volatility assessment?"
   - Ask: "What's your experience with the $HYPE wheel strategy?"

9. ✅ **Verify Contextual Analysis**:
   - Agent should reference knowledge files in recommendations
   - Should demonstrate gap between raw data and contextual analysis
   - Should cite specific methodologies from your knowledge base

## Benefits of This Setup

- **50% Better Retrieval**: Contextual embeddings improve semantic search accuracy
- **90% Cost Reduction**: Caching reduces reprocessing costs significantly
- **Automatic Processing**: Documents loaded and processed on startup
- **Better Context**: Complex strategy documents are better understood
- **Cost Efficient**: Uses your existing Anthropic/OpenAI setup optimally

The knowledge base transforms raw CoinGecko and DeFiLlama data into actionable, strategy-optimized outputs through enhanced RAG capabilities with contextual embeddings provided by `@elizaos/plugin-knowledge`.

## 🎯 Three Ways to Add Knowledge

Based on the [examples guide](https://docs.elizaos.ai/plugin-registry/knowledge/examples), here are the three ways to add knowledge:

### 1. Auto-Load from Folder (✅ Recommended)

**Best for:** Production documents, version-controlled knowledge

```bash
# .env
LOAD_DOCS_ON_STARTUP=true
KNOWLEDGE_PATH=./knowledge

# Structure
knowledge/
└── strategy-optimization/
    └── hype-wheel-strategy.md  ← Put documents here
```

**Benefits:**

- ✅ Automatic loading on startup
- ✅ Version controlled (git)
- ✅ Consistent across deployments
- ✅ No manual upload needed

### 2. Upload via Web Interface

**Best for:** Dynamic content, testing, user uploads

```
1. Start agent: bun start
2. Open: http://localhost:3000
3. Select agent → Knowledge tab
4. Drag & drop files
```

**Benefits:**

- ✅ No restart needed
- ✅ Immediate processing
- ✅ Easy testing
- ✅ Good for one-off documents

### 3. Hardcode Small Snippets (❌ Avoid for Real Docs)

**Only for:** Tiny snippets (<100 tokens)

```typescript
// ❌ DON'T do this for real documents
knowledge: ["Full 500-line strategy document here..."];

// ✅ DO use files instead
knowledge / strategy - optimization / hype - wheel - strategy.md;
```

See [EXAMPLES.md](./EXAMPLES.md) for detailed examples and best practices.

## ❓ Troubleshooting

### Documents Not Loading

**Symptoms:** Documents aren't appearing in the Knowledge tab or agent can't find them.

**Check:**

- ✅ `LOAD_DOCS_ON_STARTUP=true` is in your `.env` file
- ✅ `knowledge/` folder exists in project root
- ✅ Files are in supported formats (`.md`, `.pdf`, `.txt`, etc.)
- ✅ Agent has restarted after adding `LOAD_DOCS_ON_STARTUP=true`
- ✅ Check agent logs for processing errors

**Solution:**

```bash
# Verify .env has:
LOAD_DOCS_ON_STARTUP=true
KNOWLEDGE_PATH=./knowledge

# Restart agent after changing .env
bun start
```

### Can't Access Web Interface

**Symptoms:** Can't access `http://localhost:3000` or Knowledge tab not visible.

**Check:**

- ✅ Agent is running (`bun start` or `elizaos start`)
- ✅ Using correct URL: `http://localhost:3000`
- ✅ No other application using port 3000
- ✅ Browser console shows no errors

**Solution:**

```bash
# Check if agent is running
# Should see "Agent started" or similar message

# Try different port if 3000 is in use
PORT=3001 bun start
# Then access http://localhost:3001
```

### Agent Can't Find Information

**Symptoms:** Agent doesn't reference knowledge base or says "I don't know".

**Check:**

- ✅ Document was successfully processed (check Knowledge tab)
- ✅ Using clear, specific search terms
- ✅ Document actually contains the information you're asking about
- ✅ `ragKnowledge: true` is set in character settings (✅ already configured)

**Try:**

```
# More specific queries work better:
❌ "What do you know?"
✅ "What does the $HYPE wheel strategy say about strike selection?"

❌ "Tell me about options"
✅ "Search your knowledge for covered call strategies"
```

### Contextual Embeddings Not Working

**Symptoms:** Not seeing improved retrieval accuracy.

**Check:**

- ✅ `CTX_KNOWLEDGE_ENABLED=true` (must be lowercase `true`)
- ✅ `TEXT_PROVIDER` and `TEXT_MODEL` are configured correctly
- ✅ API keys are valid for your TEXT_PROVIDER
- ✅ Check logs with `LOG_LEVEL=debug` to see "CTX enrichment ENABLED"

**Verify:**

```bash
# Add to .env for debugging
LOG_LEVEL=debug

# Restart and check logs for:
# "CTX enrichment ENABLED" or "ctx enrichment DISABLED"
```

### API Key Issues

**Q: Do I need OPENAI_API_KEY even if using Anthropic for chat?**
A: Yes! The plugin uses OpenAI embeddings (`text-embedding-3-small`) even if your chat model is Anthropic. Add `OPENAI_API_KEY=sk-...` to `.env`.

**Q: Can I use different embedding models?**
A: Yes! Configure via:

```bash
EMBEDDING_PROVIDER=openai
TEXT_EMBEDDING_MODEL=text-embedding-3-small
# Or text-embedding-3-large for better quality
```

### Performance Issues

**Symptoms:** Slow document processing or agent responses.

**Optimize:**

```bash
# Reduce parallel processing
MAX_CONCURRENT_REQUESTS=15

# Adjust rate limits
REQUESTS_PER_MINUTE=30
TOKENS_PER_MINUTE=75000

# Use smaller embedding model for speed
TEXT_EMBEDDING_MODEL=text-embedding-3-small  # vs text-embedding-3-large
```

## 📚 Documentation

### Local Guides

- **[CONFIGURATION.md](./CONFIGURATION.md)** - Configuration options and modes
- **[EXAMPLES.md](./EXAMPLES.md)** - Real-world examples, best practices, and usage patterns
- **[CONTEXTUAL-EMBEDDINGS.md](./CONTEXTUAL-EMBEDDINGS.md)** - Deep dive on contextual embeddings (50% better accuracy)
- **[ADVANCED.md](./ADVANCED.md)** - Advanced features, REST API, and optimization

### Official Documentation

- **[Quick Start Guide](https://docs.elizaos.ai/plugin-registry/knowledge/quick-start)** - Get started in 5 minutes
- **[Complete Developer Guide](https://docs.elizaos.ai/plugin-registry/knowledge/complete-documentation)** - Comprehensive technical reference
- **[Contextual Embeddings](https://docs.elizaos.ai/plugin-registry/knowledge/contextual-embeddings)** - 50% better accuracy guide
- **[Architecture & Flow](https://docs.elizaos.ai/plugin-registry/knowledge/architecture-flow-diagrams)** - Internal workings
- **[Plugin GitHub](https://github.com/elizaos-plugins/plugin-knowledge)** - Source code and issues
