# Contextual Embeddings Deep Dive

Complete guide to contextual embeddings based on the [official documentation](https://docs.elizaos.ai/plugin-registry/knowledge/contextual-embeddings).

## 🎯 What are Contextual Embeddings?

Contextual embeddings improve retrieval accuracy by **50%** by enriching text chunks with surrounding document context before generating embeddings. This implementation is based on **Anthropic's proven contextual retrieval technique**.

### Traditional vs Contextual

**Traditional Embedding:**

```
Original chunk:
"The deployment process requires authentication."

Problem: Missing context about:
- Which deployment process?
- What kind of authentication?
- For which system?
```

**Contextual Embedding:**

```
Enriched chunk:
"In the Kubernetes deployment section for the payment service,
the deployment process requires authentication using OAuth2
tokens obtained from the identity provider."

Now embeddings understand:
✅ Kubernetes deployments
✅ Payment service specifically
✅ OAuth2 authentication
```

## 🔧 How It Works

### Technical Flow

```
1. Document Analysis
   │
   ├─► Full document + chunk passed to LLM
   │
   ├─► Content-aware template detection
   │   ├─► General text documents
   │   ├─► PDF documents (corrupted text handling)
   │   ├─► Mathematical content (equations, notation)
   │   ├─► Code files (imports, function signatures)
   │   └─► Technical documentation (terminology)
   │
   ├─► Context Generation
   │   ├─► LLM identifies relevant context from document
   │   ├─► Explains: what, where, why
   │   └─► Target: 60-200 tokens of context
   │
   ├─► Chunk Enrichment
   │   ├─► Original chunk preserved
   │   ├─► Context prepended/appended
   │   └─► Format: "[Context] Original chunk"
   │
   └─► Embedding Generation
       └─► Enriched chunk embedded using configured model
```

### Fixed Chunk Sizes (Optimized)

The plugin uses **research-optimized chunk sizes** specifically for contextual enrichment:

```javascript
const chunkConfig = {
  chunkSize: 500, // tokens (~1,750 characters)
  chunkOverlap: 100, // tokens
  contextTarget: 60 - 200, // tokens of added context
};
```

**Why These Sizes?**

- **Research-backed**: Smaller chunks with rich context outperform larger chunks without context
- **Optimal balance**: 500 tokens = enough content, not too large for context generation
- **100 token overlap**: Preserves context boundaries across chunks

**⚠️ Important**: Do NOT change these values unless you have specific requirements. These are optimized based on Anthropic's research.

## 💰 Cost Considerations

### Processing Times

| Stage              | Without Cache  | With OpenRouter Cache       |
| ------------------ | -------------- | --------------------------- |
| Initial processing | 1-3s per chunk | 1-3s per chunk (first time) |
| Subsequent chunks  | 1-3s per chunk | 0.1-0.3s per chunk          |
| 15-chunk document  | ~30-45s        | ~5-8s                       |

### Cost Estimation

Based on Claude 3 Haiku pricing (estimates):

| Document Size | Pages | Chunks | Without Caching | With OpenRouter Cache | Savings |
| ------------- | ----- | ------ | --------------- | --------------------- | ------- |
| Small         | 10    | ~20    | $0.02           | $0.002                | **90%** |
| Medium        | 50    | ~100   | $0.10           | $0.01                 | **90%** |
| Large         | 200   | ~400   | $0.40           | $0.04                 | **90%** |

**For Your `hype-wheel-strategy.md`:**

- **Estimated chunks**: ~15
- **Without caching**: ~$0.015
- **With OpenRouter caching**: ~$0.0015 (**90% savings**)

### OpenRouter Caching Magic

**How It Works:**

1. **First chunk**: Full document sent to LLM, cached for 5 minutes
2. **Subsequent chunks**: LLM request includes cache reference
3. **Cost reduction**: ~90% on chunks 2-15 (cache reuse)
4. **Automatic**: No configuration needed, works with Claude/Gemini via OpenRouter

**Result:** Processing 100-page document ≈ same cost as 1 page!

## ⚙️ Configuration

### Recommended Setup (Anthropic + OpenAI)

For best quality with your current setup:

```bash
# .env

# Enable contextual embeddings
CTX_KNOWLEDGE_ENABLED=true

# Use Anthropic for context generation (already in your agent)
TEXT_PROVIDER=anthropic
TEXT_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_API_KEY=your-anthropic-key

# OpenAI for embeddings (required even if using Anthropic for chat)
EMBEDDING_PROVIDER=openai
TEXT_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_API_KEY=your-openai-key
```

**Why This Setup:**

- ✅ Uses Claude 3.5 Sonnet (already configured in your agent)
- ✅ High-quality context generation
- ✅ OpenAI embeddings (cost-effective, proven quality)

### Cost-Efficient Setup (OpenRouter + Caching)

For best cost efficiency:

```bash
# .env

# Enable contextual embeddings
CTX_KNOWLEDGE_ENABLED=true

# OpenRouter with automatic caching
TEXT_PROVIDER=openrouter
TEXT_MODEL=anthropic/claude-3-haiku  # Best quality/cost balance
OPENROUTER_API_KEY=sk-or-...

# Optional: Specify embedding model
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-large
```

**Benefits:**

- ✅ **90% cost reduction** through automatic caching
- ✅ **Single API** for both text and embeddings
- ✅ **Automatic**: Caching works without configuration

### Model Recommendations

| Model                         | Quality    | Speed  | Cost   | Best For                            |
| ----------------------------- | ---------- | ------ | ------ | ----------------------------------- |
| `anthropic/claude-3-haiku`    | ⭐⭐⭐     | ⚡⚡⚡ | 💰     | **Best balance** (recommended)      |
| `anthropic/claude-3-5-sonnet` | ⭐⭐⭐⭐⭐ | ⚡⚡   | 💰💰💰 | **Highest quality** (current setup) |
| `google/gemini-1.5-flash`     | ⭐⭐⭐     | ⚡⚡⚡ | 💰     | **Fastest processing**              |
| `openai/gpt-4o-mini`          | ⭐⭐⭐⭐   | ⚡⚡   | 💰💰   | **Good quality, moderate cost**     |

## 📊 Real-World Example

### Without Contextual Embeddings

**Query:** "What strike price should I use for $HYPE?"

**Retrieved Chunk:**

```
"The $26 strike offers 118% APR compared to 65% at $27."
```

**Problem:** Missing critical context:

- Which asset? (Is this $HYPE, BTC, ETH?)
- What strategy? (Covered calls? Secured puts?)
- Position size? (Does this scale?)
- Why this comparison? (What changed?)

### With Contextual Embeddings

**Query:** "What strike price should I use for $HYPE?"

**Retrieved Chunk:**

```
"In the $HYPE wheel strategy section on strike selection optimization,
for a 3,600 token position, the $26 strike offers 118% APR compared
to 65% at $27. This represents nearly double the yield, providing
~$1,000 additional weekly premium while maintaining acceptable
liquidity on Hypersurface. The move from $27 to $26 was based on
volatility compression indicators and current options market structure,
accounting for expected premium capture while preserving upside
participation."
```

**Now Clear:**
✅ **Asset**: $HYPE (Hyperliquid token)
✅ **Strategy**: Wheel strategy
✅ **Position**: 3,600 tokens
✅ **Comparison**: $26 vs $27 strike
✅ **Rationale**: Volatility compression, market structure
✅ **Platform**: Hypersurface
✅ **Impact**: $1,000 additional weekly premium

## 🎯 Content-Aware Templates

The plugin automatically detects document types and uses specialized prompts:

### Markdown Documents (Your Use Case)

**Template:** Optimized for headers, sections, lists

- Preserves section hierarchy
- Maintains list context
- Links related concepts

**For `hype-wheel-strategy.md`:**

- ✅ Maintains phase structure (growth → drawdown → comeback)
- ✅ Preserves strike selection reasoning
- ✅ Links risk-reward calculations to positions

### PDF Documents

**Template:** Handles corrupted text, multi-column layouts

- Extracts text from complex layouts
- Handles OCR artifacts
- Preserves document structure

### Code Files

**Template:** Includes imports, function signatures

- Preserves code context
- Links related functions
- Maintains file structure

### Technical Documentation

**Template:** Preserves terminology, cross-references

- Maintains technical terms
- Links related concepts
- Preserves cross-references

## 🚀 Best Practices

### 1. Use OpenRouter for Cost Efficiency

**Recommended:**

```bash
TEXT_PROVIDER=openrouter
TEXT_MODEL=anthropic/claude-3-haiku
```

**Why:**

- ✅ Automatic 90% cost reduction via caching
- ✅ Single API for text + embeddings
- ✅ Access to multiple models

### 2. Keep Default Chunk Sizes

**Don't change unless necessary:**

- 500 tokens: Research-optimized
- 100 overlap: Preserves context boundaries
- Changing these requires re-processing all documents

### 3. Monitor Processing

**Enable debug logging:**

```bash
LOG_LEVEL=debug
```

**Check for:**

- `"CTX enrichment ENABLED"` - Contextual embeddings active
- `"CTX enrichment DISABLED"` - Traditional embeddings
- Cache hit/miss rates
- Processing times per chunk

### 4. Process Documents Strategically

**First-time processing:**

- Process during off-peak hours (costs are higher)
- Batch process multiple documents together

**Subsequent queries:**

- Fast retrieval from vector store
- No reprocessing needed (unless document changes)

### 5. Model Selection

**For Your Use Case (Strategy Documents):**

| Scenario                 | Recommended Model             | Reason                             |
| ------------------------ | ----------------------------- | ---------------------------------- |
| **Production (Quality)** | `claude-3-5-sonnet`           | Highest quality context generation |
| **Production (Cost)**    | `claude-3-haiku`              | Best quality/cost balance          |
| **Development**          | `claude-3-haiku`              | Faster, cheaper for testing        |
| **Large Scale**          | `claude-3-haiku` + OpenRouter | 90% cost reduction essential       |

## 🐛 Troubleshooting

### Context Not Being Added

**Symptoms:** Agent responses don't show enriched context.

**Check:**

```bash
# Enable debug logging
LOG_LEVEL=debug

# Start agent and look for:
"CTX enrichment ENABLED"  # ✅ Working
"CTX enrichment DISABLED" # ❌ Not working
```

**Common Issues:**

- `CTX_KNOWLEDGE_ENABLED=true` must be lowercase `true` (not "TRUE" or "True")
- `TEXT_PROVIDER` and `TEXT_MODEL` must both be set
- API key for TEXT_PROVIDER must be valid

### Slow Processing

**Symptoms:** Document processing takes too long.

**Solutions:**

1. **Use OpenRouter caching:**

   ```bash
   TEXT_PROVIDER=openrouter
   TEXT_MODEL=anthropic/claude-3-haiku  # Faster than Sonnet
   ```

2. **Use faster models:**
   - `claude-3-haiku`: Fastest Anthropic model
   - `gemini-1.5-flash`: Fastest overall

3. **Reduce concurrent requests:**
   ```bash
   MAX_CONCURRENT_REQUESTS=15  # Default is 30
   ```

### High Costs

**Symptoms:** Processing costs are too high.

**Solutions:**

1. **Enable OpenRouter caching** (90% reduction):

   ```bash
   TEXT_PROVIDER=openrouter
   TEXT_MODEL=anthropic/claude-3-haiku
   ```

2. **Use smaller models for context:**
   - `claude-3-haiku` instead of `claude-3-5-sonnet`
   - 3x cost reduction with similar quality

3. **Process during off-peak hours:**
   - Process documents once
   - Rely on caching for subsequent queries

4. **Batch processing:**
   - Process multiple documents together
   - Benefit from shared cache

## 📈 Performance Characteristics

### Processing Time Breakdown

**For `hype-wheel-strategy.md` (~15 chunks):**

| Stage                  | Time           | Notes                      |
| ---------------------- | -------------- | -------------------------- |
| Document Analysis      | <1s            | LLM call per chunk         |
| Context Generation     | 1-3s/chunk     | Without cache              |
| Context Generation     | 0.1-0.3s/chunk | With OpenRouter cache      |
| Embedding Generation   | 2-5s           | Batch processing           |
| **Total (No Cache)**   | **~30-45s**    | All chunks processed       |
| **Total (With Cache)** | **~5-8s**      | Cache used for chunks 2-15 |

### Memory Requirements

**Per Document:**

- Document text: ~2KB metadata + full document size
- Chunk text: ~500 tokens × chunks × 4 bytes ≈ ~2KB per chunk
- Enriched chunks: +60-200 tokens context per chunk
- Embeddings: 1536 dimensions × 4 bytes = ~6KB per chunk

**For `hype-wheel-strategy.md` (15 chunks):**

- Document: ~45KB original
- Enriched chunks: ~60KB (with context)
- Embeddings: ~90KB
- **Total: ~195KB** (vs ~122KB without context)

## ✅ Summary

Contextual embeddings provide:

1. **50% Better Retrieval Accuracy**: Rich context improves semantic understanding
2. **90% Cost Reduction**: OpenRouter caching makes reprocessing affordable
3. **Content-Aware Processing**: Templates optimized for different document types
4. **Research-Optimized**: Based on Anthropic's proven techniques
5. **Production Ready**: Handles edge cases, caching, rate limiting automatically

**For Your Use Case:**

- ✅ Perfect for complex strategy documents like `hype-wheel-strategy.md`
- ✅ Maintains context across multi-phase narratives
- ✅ Links related concepts (strike selection → risk-reward → outcomes)
- ✅ Cost-effective with OpenRouter caching

**Quick Start:**

```bash
# Add to .env
CTX_KNOWLEDGE_ENABLED=true
TEXT_PROVIDER=anthropic  # or openrouter for caching
TEXT_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_API_KEY=your-key
```

That's it! Documents will be processed with contextual embeddings automatically.

## 📚 References

- [Official Contextual Embeddings Guide](https://docs.elizaos.ai/plugin-registry/knowledge/contextual-embeddings)
- [Complete Developer Guide](https://docs.elizaos.ai/plugin-registry/knowledge/complete-documentation)
- [Architecture & Flow Diagrams](https://docs.elizaos.ai/plugin-registry/knowledge/architecture-flow)
