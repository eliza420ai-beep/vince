# Knowledge Plugin Configuration Guide

Quick reference for optimizing `@elizaos/plugin-knowledge` setup.

## 🎯 Recommended Configuration

### Minimal Setup (Works Out of the Box)

```bash
# .env
LOAD_DOCS_ON_STARTUP=true
KNOWLEDGE_PATH=./knowledge
```

### 🚀 Optimized Setup (Recommended for Production)

This configuration enables **contextual embeddings** for 50% better retrieval accuracy and 90% cost reduction:

```bash
# .env

# ==========================================
# DOCUMENT LOADING
# ==========================================
LOAD_DOCS_ON_STARTUP=true
KNOWLEDGE_PATH=./knowledge

# ==========================================
# CONTEXTUAL EMBEDDINGS (50% Better Accuracy)
# ==========================================
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
MAX_CONCURRENT_REQUESTS=30
REQUESTS_PER_MINUTE=60
TOKENS_PER_MINUTE=150000
MAX_INPUT_TOKENS=4000
MAX_OUTPUT_TOKENS=4096

# ==========================================
# DEBUGGING (Optional)
# ==========================================
# LOG_LEVEL=debug  # Uncomment to see contextual embedding logs
```

## Configuration Modes

### Mode 1: Basic RAG (Default)

- ✅ Works out of the box
- ✅ No additional configuration needed
- ✅ Uses standard embeddings

### Mode 2: Contextual Embeddings (Recommended)

- ✅ **50% better retrieval accuracy**
- ✅ **90% cost reduction through caching**
- ✅ Better understanding of complex documents
- ⚙️ Requires: `CTX_KNOWLEDGE_ENABLED=true` and TEXT_PROVIDER/TEXT_MODEL

### Mode 3: OpenRouter + Caching (Cost-Efficient)

- ✅ Best cost efficiency with caching
- ✅ Access to multiple models via one API
- ⚙️ Requires: OpenRouter account and API key

```bash
# .env - OpenRouter Setup with Caching
CTX_KNOWLEDGE_ENABLED=true

# OpenRouter handles both text generation and embeddings
TEXT_PROVIDER=openrouter
TEXT_MODEL=anthropic/claude-3-haiku  # Best balance of quality/cost
# or
# TEXT_MODEL=anthropic/claude-3-5-sonnet  # Higher quality

OPENROUTER_API_KEY=sk-or-...

# Optional: Specify embedding model
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-large
```

**Cost Savings Example:**

- Without caching: $0.40 for 200-page document (~400 chunks)
- With OpenRouter caching: $0.04 for same document (**90% savings**)

## How Contextual Embeddings Work

Based on [Anthropic's contextual retrieval technique](https://docs.elizaos.ai/plugin-registry/knowledge/contextual-embeddings), contextual embeddings improve retrieval accuracy by 50%:

### Processing Flow

1. **Fixed Chunk Sizes** (Optimized for Contextual Enrichment)
   - **Chunk Size**: 500 tokens (~1,750 characters)
   - **Chunk Overlap**: 100 tokens
   - **Context Target**: 60-200 tokens of added context per chunk
   - These values are research-optimized: smaller chunks with rich context outperform larger chunks without context

2. **Document Analysis**
   - Full document passed to LLM along with each chunk
   - LLM identifies relevant context from the document
   - Content-aware templates detect document type (markdown, PDF, code, etc.)

3. **Context Enrichment**
   - Original chunk preserved with added context
   - Context explains: what, where, why (document section, related concepts)
   - Example: "In the $HYPE wheel strategy section on strike selection, the $26 strike offers..."

4. **Embedding Generation**
   - Enriched chunk embedded using your configured embedding model
   - Original text preserved, context added for better understanding

5. **Caching** (OpenRouter + Claude/Gemini)
   - First chunk: Full document cached
   - Subsequent chunks: Reuses cached document (90% cost reduction)
   - Cache duration: 5 minutes (automatic)
   - Result: Processing 100-page document ≈ same cost as 1 page!

## Benefits for Your Use Case

### Example: `hype-wheel-strategy.md`

**Without Contextual Embeddings:**

```
Query: "What strike price should I use?"

Retrieved chunk:
"The $26 strike offers 118% APR compared to 65% at $27."

Problem: Missing context about:
- Which asset? ($HYPE)
- What strategy? (Wheel strategy)
- Why this comparison? (Strike selection optimization)
- What position size? (3,600 tokens)
```

**With Contextual Embeddings:**

```
Query: "What strike price should I use?"

Retrieved chunk:
"In the $HYPE wheel strategy section on strike selection optimization,
for a 3,600 token position, the $26 strike offers 118% APR compared
to 65% at $27. This represents nearly double the yield, providing
~$1,000 additional weekly premium while maintaining acceptable
liquidity on Hypersurface."

Result: Clear understanding of:
✅ Asset context ($HYPE)
✅ Strategy context (wheel strategy)
✅ Position size (3,600 tokens)
✅ Comparison context ($26 vs $27)
✅ Platform context (Hypersurface)
```

**Why This Matters for Your Documents:**

- ✅ **Multi-phase narratives** (growth → drawdown → comeback) maintain context
- ✅ **Strike selection methodology** connects decisions to outcomes
- ✅ **Risk-reward calculations** include position and market context
- ✅ **Historical lessons** link past events to current strategies

## Testing Configuration

To verify contextual embeddings are working:

1. Set `LOG_LEVEL=debug` in `.env`
2. Start the agent: `bun start`
3. Look for logs: `"CTX enrichment ENABLED"` or `"ctx enrichment DISABLED"`
4. Test retrieval: Ask agent about $HYPE wheel strategy details

## Troubleshooting

### Contextual Embeddings Not Working

**Check:**

- `CTX_KNOWLEDGE_ENABLED=true` (must be lowercase `true`)
- `TEXT_PROVIDER` is set correctly
- `TEXT_MODEL` is valid for your provider
- API keys are valid for TEXT_PROVIDER

### High Costs

**Solution:**

- Use OpenRouter with caching enabled
- Process documents once, rely on caching for reprocessing
- Adjust `MAX_CONCURRENT_REQUESTS` to limit parallel processing

### Slow Processing

**Optimize:**

- Reduce `MAX_CONCURRENT_REQUESTS` to 15-20
- Check rate limits for your API provider
- Use smaller embedding models if speed is critical

## Advanced Features

For advanced features like:

- Content-based deduplication (automatic)
- Intelligent chunking (configurable)
- RAG metadata tracking (automatic)
- REST API for document management
- Performance optimization techniques

See [ADVANCED.md](./ADVANCED.md) for detailed documentation.

## Key Features Your Setup Uses

✅ **Content-Based Deduplication**: Documents automatically deduplicated using content-based IDs
✅ **Intelligent Chunking**: Smart text splitting with 500 token chunks and 100 token overlap
✅ **RAG Tracking**: Conversation memories enriched with knowledge usage metadata
✅ **Knowledge Provider**: Automatically injects top 5 relevant fragments into conversations
✅ **Contextual Embeddings**: 50% better retrieval accuracy when enabled

## References

- [Complete Developer Guide](https://docs.elizaos.ai/plugin-registry/knowledge/complete-documentation)
- [ElizaOS Knowledge Plugin Docs](https://docs.elizaos.ai/plugin-registry/knowledge)
- [Contextual Embeddings Guide](https://docs.elizaos.ai/plugin-registry/knowledge/contextual-embeddings)
- [Plugin GitHub Repo](https://github.com/elizaos-plugins/plugin-knowledge)
