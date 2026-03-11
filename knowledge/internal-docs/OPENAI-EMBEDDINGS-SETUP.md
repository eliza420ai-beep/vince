# OpenAI Embeddings Configuration Guide

Quick reference for configuring OpenAI plugin **ONLY for embeddings** (not text generation) when using Anthropic for text generation.

## 🎯 Configuration Pattern

**Text Generation:** Anthropic Claude 3.5 Sonnet  
**Embeddings:** OpenAI (text-embedding-3-small)

This is the [recommended setup](https://docs.elizaos.ai/plugin-registry/llm/openai) for RAG with Anthropic.

## 📋 Environment Variables

Add these to your `.env` file:

```bash
# ==========================================
# TEXT GENERATION: Anthropic (Primary)
# ==========================================
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_LARGE_MODEL=claude-3-5-sonnet-20241022

# ==========================================
# EMBEDDINGS: OpenAI (Embeddings Only)
# ==========================================
# Required for RAG/knowledge plugin
OPENAI_API_KEY=sk-...

# Embedding model configuration (per OpenAI plugin docs)
# Option 1: Use OPENAI_EMBEDDING_MODEL (OpenAI plugin standard)
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Option 2: Use TEXT_EMBEDDING_MODEL (knowledge plugin standard)
# TEXT_EMBEDDING_MODEL=text-embedding-3-small

# Note: Both work, but OPENAI_EMBEDDING_MODEL is the OpenAI plugin's native variable
# Defaults to text-embedding-3-small if neither is set
```

## 🚀 Contextual Embeddings Setup (Recommended)

For **50% better retrieval accuracy**, enable contextual embeddings:

```bash
# Enable contextual embeddings
CTX_KNOWLEDGE_ENABLED=true

# Context generation uses Anthropic (already configured)
TEXT_PROVIDER=anthropic
TEXT_MODEL=claude-3-5-sonnet-20241022

# Embeddings use OpenAI
EMBEDDING_PROVIDER=openai
TEXT_EMBEDDING_MODEL=text-embedding-3-small
```

## 📊 Available OpenAI Embedding Models

According to the [OpenAI plugin documentation](https://docs.elizaos.ai/plugin-registry/llm/openai):

| Model                    | Quality    | Speed  | Cost | Best For                                 |
| ------------------------ | ---------- | ------ | ---- | ---------------------------------------- |
| `text-embedding-3-small` | ⭐⭐⭐     | ⚡⚡⚡ | 💰   | **Default** - Best balance (recommended) |
| `text-embedding-3-large` | ⭐⭐⭐⭐⭐ | ⚡⚡   | 💰💰 | Higher quality, slightly slower          |
| `text-embedding-ada-002` | ⭐⭐       | ⚡⚡⚡ | 💰   | Legacy model (still supported)           |

**Recommendation:** Use `text-embedding-3-small` for most use cases. Upgrade to `text-embedding-3-large` only if you need the highest quality embeddings.

## ✅ Verification

To verify OpenAI is configured correctly for embeddings:

1. **Check logs** on startup:

   ```bash
   LOG_LEVEL=debug bun start
   ```

   Look for embedding model registration logs.

2. **Test RAG retrieval**:
   - Ask the Strategy Optimizer about content in `knowledge/` directory
   - If embeddings work, the agent will retrieve relevant knowledge chunks

3. **Monitor costs**:
   - OpenAI dashboard: Check embedding API usage
   - Anthropic dashboard: Check text generation usage
   - Should see embeddings only from OpenAI, text generation only from Anthropic

## 🔒 Ensuring Text Generation Uses Anthropic Only

The configuration ensures Anthropic is primary for text generation:

```typescript
// In strategy-optimization.ts
settings: {
  model: process.env.ANTHROPIC_LARGE_MODEL || "claude-3-5-sonnet-20241022",
  // This explicitly sets Anthropic as the text model
}
```

OpenAI plugin will only be used for:

- ✅ `ModelType.TEXT_EMBEDDING` calls
- ✅ Knowledge plugin embedding generation
- ❌ NOT used for `ModelType.TEXT_SMALL` or `ModelType.TEXT_LARGE`

## 💡 Cost Optimization

**Embeddings are cheap:**

- `text-embedding-3-small`: ~$0.02 per 1M tokens
- Minimal cost compared to text generation

**Text generation is the expensive part:**

- Claude 3.5 Sonnet: ~$3-15 per 1M tokens (depending on input/output)
- This is where Anthropic is used

**Cost breakdown example:**

- 100-page document (~400 chunks): ~$0.001 for embeddings (OpenAI)
- Same document contextual analysis: ~$0.10-0.50 for text generation (Anthropic)

## 📚 References

- [OpenAI Plugin Documentation](https://docs.elizaos.ai/plugin-registry/llm/openai)
- [Anthropic Plugin Documentation](https://docs.elizaos.ai/plugin-registry/llm/anthropic)
- [Knowledge Plugin Configuration](./CONFIGURATION.md)
- [Contextual Embeddings Guide](./CONTEXTUAL-EMBEDDINGS.md)
