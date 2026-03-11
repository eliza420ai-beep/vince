# Advanced Knowledge Plugin Features

Based on the [Complete Developer Guide](https://docs.elizaos.ai/plugin-registry/knowledge/complete-documentation) and [Architecture & Flow Diagrams](https://docs.elizaos.ai/plugin-registry/knowledge/architecture-flow), this document covers advanced features, architecture, and optimizations for your knowledge setup.

## 🏗️ Architecture Overview

Understanding the internal architecture helps optimize configuration and debug issues.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Knowledge Plugin                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Service    │  │   Provider   │  │    Actions   │      │
│  │  (Core)      │  │  (RAG Auto)  │  │  (Manual)    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │  Runtime       │                        │
│                    │  (Memory DB)   │                        │
│                    └────────────────┘                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Components:**

- **KnowledgeService**: Core service handling all knowledge operations
- **KnowledgeProvider**: Automatically injects relevant knowledge into conversations
- **Actions**: `PROCESS_KNOWLEDGE` and `SEARCH_KNOWLEDGE` for manual operations
- **Runtime**: ElizaOS runtime with memory/database integration

### Document Processing Flow

```
Document Upload/File
    │
    ├─► Content-Based ID Generation
    │   └─► Check for Duplicates
    │       ├─► If exists → Return existing ID
    │       └─► If new → Continue processing
    │
    ├─► Text Extraction
    │   ├─► PDF → extractPDF()
    │   ├─► DOCX → extractDOCX()
    │   └─► Text → Direct use
    │
    ├─► Content Deduplication
    │   └─► Hash-based check
    │
    ├─► Intelligent Chunking
    │   ├─► Split into 500 token chunks
    │   ├─► 100 token overlap
    │   └─► Respects structure (headers, paragraphs)
    │
    ├─► Contextual Enrichment (if enabled)
    │   ├─► Generate context for each chunk
    │   ├─► Prepend context to chunk
    │   └─► Cache context for 90% cost reduction
    │
    ├─► Embedding Generation
    │   ├─► Batch processing (10 chunks/batch)
    │   ├─► Rate limiting
    │   └─► Vector storage
    │
    └─► Storage
        ├─► Document metadata → 'documents' table
        └─► Chunk embeddings → 'knowledge' table
```

### Retrieval Flow (RAG)

```
User Message
    │
    ├─► Knowledge Provider Triggered
    │
    ├─► Generate Query Embedding
    │   └─► Same model as document embeddings
    │
    ├─► Vector Similarity Search
    │   ├─► Search 'knowledge' table
    │   ├─► Match threshold: 0.1 (configurable)
    │   └─► Top 5 fragments retrieved
    │
    ├─► Format Knowledge Context
    │   ├─► Add "# Knowledge" header
    │   ├─► Include fragments
    │   └─► Cap at ~4000 tokens
    │
    ├─► Inject into Agent Context
    │   └─► Combined with user message
    │
    ├─► Agent Response Generation
    │   └─► Uses knowledge + message context
    │
    └─► RAG Metadata Tracking
        ├─► Record which fragments were used
        ├─► Store similarity scores
        └─► Enrich conversation memory
```

### Component Interactions

```
┌─────────────┐
│   Web UI    │─────► Upload Documents
└──────┬──────┘     │
       │            ▼
       │      ┌─────────────┐
       │      │   Service   │
       └─────►│ addKnowledge│
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │ Processing  │
              │  Pipeline   │
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │  Runtime    │
              │  (Storage)  │
              └──────┬──────┘
                     │
                     │ (Query)
                     ▼
              ┌─────────────┐
              │  Provider   │─────► Inject into Conversations
              └─────────────┘
```

## 🎯 Advanced Features Overview

### 1. Content-Based Deduplication (Automatic)

The plugin **automatically prevents duplicate documents** using content-based IDs:

```typescript
// How it works internally:
const contentBasedId = generateContentBasedId(content, agentId, {
  includeFilename: options.originalFilename,
  contentType: options.contentType,
  maxChars: 2000  // Uses first 2KB of content
});

// Check if document already exists
const existingDocument = await this.runtime.getMemoryById(contentBasedId);
if (existingDocument) {
  // Returns existing document instead of creating duplicate
  return { clientDocumentId: contentBasedId, ... };
}
```

**Benefits:**

- ✅ No duplicate processing of same document
- ✅ Cost savings by avoiding reprocessing
- ✅ Consistent document IDs across sessions
- ✅ Automatic - no configuration needed

**For Your Use Case:**

- Uploading `hype-wheel-strategy.md` multiple times = processed once
- Updating the same document = detected and handled correctly
- Version control changes = deduplicated intelligently

### 2. Intelligent Chunking (Configurable)

Documents are split into searchable chunks with smart boundaries:

**Default Settings:**

```javascript
const defaultChunkOptions = {
  chunkSize: 500, // tokens per chunk
  overlapSize: 100, // token overlap between chunks
  separators: ["\n\n", "\n", ". ", " "], // Respects structure
  keepSeparator: true, // Maintains context
};
```

**Configuration (Optional):**

```bash
# .env - Custom chunk sizes (if needed)
EMBEDDING_CHUNK_SIZE=800
EMBEDDING_OVERLAP_SIZE=200
```

**Best Practices for Your Documents:**

For `hype-wheel-strategy.md` and similar strategy documents:

- **Default 500 tokens** works well for most sections
- **100 token overlap** preserves context across chunks
- **Respects markdown structure** (headers, paragraphs, lists)

**When to Adjust:**

- Very technical documents → Increase to 800 tokens
- Short, focused sections → Decrease to 300 tokens
- Code-heavy content → Increase overlap to 200 tokens

### 3. RAG Metadata Tracking (Automatic)

The plugin **tracks which knowledge was used** in each response:

```typescript
// Automatic tracking in conversation memories
await enrichConversationMemoryWithRAG(memoryId, {
  retrievedFragments: [
    {
      fragmentId: UUID,
      documentTitle: "hype-wheel-strategy.md",
      similarityScore: 0.92,
      contentPreview: "The $26 strike offers 118% APR...",
    },
  ],
  queryText: "What strike price should I use?",
  totalFragments: 5,
  retrievalTimestamp: Date.now(),
});
```

**Benefits:**

- ✅ **Audit trail**: See what knowledge influenced each response
- ✅ **Debugging**: Understand why certain information was retrieved
- ✅ **Improvement**: Identify gaps or areas needing more knowledge
- ✅ **Transparency**: Users can see knowledge sources

**Accessing RAG Metadata:**

```typescript
// In your agent, check conversation memory metadata
const memory = await runtime.getMemoryById(memoryId);
const ragMetadata = memory.metadata?.rag;

// ragMetadata contains:
// - Which documents were retrieved
// - Similarity scores
// - Content previews
// - Query text
```

### 4. Knowledge Provider (Automatic RAG Injection)

The Knowledge Provider **automatically injects relevant knowledge** into every message:

**How It Works:**

1. **Dynamic Retrieval**: Runs on every message to find relevant context
2. **Top 5 Results**: Retrieves up to 5 most relevant knowledge fragments
3. **Token Limit**: Caps knowledge at ~4000 tokens to prevent context overflow
4. **Formatting**: Adds "# Knowledge" header for clear separation

**Example Flow:**

```
User: "What strike price should I use for $HYPE?"

Knowledge Provider:
1. Searches knowledge base for relevant fragments
2. Retrieves top 5 matches about strike selection, $HYPE strategy
3. Formats with "# Knowledge" header
4. Injects into agent context

Agent Response:
Uses retrieved knowledge about $26 vs $27 strikes to provide
contextual recommendation, citing specific methodology from
hype-wheel-strategy.md
```

**Configuration:**

```bash
# Maximum knowledge fragments to retrieve (default: 5)
MAX_KNOWLEDGE_FRAGMENTS=5

# Maximum tokens for knowledge context (default: ~4000)
MAX_KNOWLEDGE_TOKENS=4000
```

### 5. REST API for Document Management

The plugin provides HTTP endpoints for programmatic document management:

#### Upload Document

```bash
POST http://localhost:3000/api/agents/{agentId}/plugins/knowledge/documents
Content-Type: multipart/form-data

{
  "file": <binary>,
  "metadata": {
    "tags": ["strategy", "hype"]
  }
}

Response: {
  "id": "doc_123",
  "status": "processing",
  "message": "Document uploaded successfully"
}
```

#### List Documents

```bash
GET http://localhost:3000/api/agents/{agentId}/plugins/knowledge/documents?page=1&limit=20

Response: {
  "documents": [
    {
      "id": "doc_123",
      "filename": "hype-wheel-strategy.md",
      "size": 45280,
      "createdAt": "2024-01-20T10:00:00Z",
      "chunkCount": 15
    }
  ],
  "total": 1,
  "page": 1,
  "pages": 1
}
```

#### Delete Document

```bash
DELETE http://localhost:3000/api/agents/{agentId}/plugins/knowledge/documents/doc_123

Response: {
  "success": true,
  "message": "Document and associated embeddings deleted"
}
```

#### Search Knowledge

```bash
GET http://localhost:3000/api/agents/{agentId}/plugins/knowledge/search?q=strike+selection&limit=5

Response: {
  "results": [
    {
      "id": "chunk_456",
      "content": "The $26 strike offers 118% APR compared to 65% at $27...",
      "score": 0.92,
      "metadata": {
        "source": "hype-wheel-strategy.md",
        "chunkIndex": 3
      }
    }
  ]
}
```

**Use Cases:**

- **Automated Updates**: Script to periodically update strategy documents
- **Integration**: Connect external systems to knowledge base
- **Bulk Operations**: Programmatically manage multiple documents
- **Monitoring**: Track document processing status

### 6. Performance Optimization

#### Rate Limiting

```bash
# .env - Control API rate limits
MAX_CONCURRENT_REQUESTS=30    # Parallel processing limit
REQUESTS_PER_MINUTE=60        # Request rate limit
TOKENS_PER_MINUTE=150000      # Token rate limit
```

**Best Practices:**

- Start with defaults (30 concurrent requests)
- Monitor API usage and adjust based on provider limits
- Reduce if experiencing rate limit errors
- Increase for faster processing (if within provider limits)

#### Batch Processing

```typescript
// Plugin handles batching automatically
const batchSize = 10;
for (let i = 0; i < chunks.length; i += batchSize) {
  const batch = chunks.slice(i, i + batchSize);
  const embeddings = await generateEmbeddings(batch);
  await sleep(1000); // Rate limiting
}
```

**Automatic Features:**

- ✅ Chunks processed in batches of 10
- ✅ Rate limiting between batches
- ✅ Error handling with retries
- ✅ Progress tracking

#### Memory Management

```bash
# .env - Control memory usage
MAX_INPUT_TOKENS=4000   # Max input size per request
MAX_OUTPUT_TOKENS=4096  # Max output size per request
```

**For Large Knowledge Bases:**

- Monitor database size as documents grow
- Clear cache periodically if needed
- Consider database cleanup for old/unused documents
- Use focused documents (one topic per document) for better retrieval

## 📋 Best Practices for Your Use Case

### Document Organization

**Current Structure:**

```
knowledge/
└── strategy-optimization/
    └── hype-wheel-strategy.md
```

**Recommended Expansion:**

```
knowledge/
├── strategy-optimization/
│   ├── hype-wheel-strategy.md          # ✅ Already created
│   ├── weekly-evaluation.md            # One topic: weekly evaluation
│   ├── strike-selection.md             # One topic: strike selection
│   └── risk-reward-analysis.md         # One topic: risk-reward
├── market-analysis/
│   ├── hypersurface-dynamics.md        # Platform-specific knowledge
│   └── market-structure.md             # DeFiLlama interpretation
└── examples/
    └── case-studies.md                 # Real examples and outcomes
```

**Why This Works:**

- ✅ **Focused Documents**: Each file covers one topic for better retrieval
- ✅ **Logical Grouping**: Related topics grouped together
- ✅ **Easy Updates**: Update individual documents without affecting others
- ✅ **Better Search**: More targeted retrieval per document

### Document Metadata

Add metadata tags for better organization:

```bash
# When uploading via API
{
  "metadata": {
    "tags": ["strategy", "hype", "covered-calls"],
    "category": "trading-strategy",
    "lastUpdated": "2024-01-20",
    "version": "1.0"
  }
}
```

**Benefits:**

- ✅ **Filtering**: Find documents by category/tags
- ✅ **Versioning**: Track document versions
- ✅ **Audit Trail**: See when documents were updated
- ✅ **Organization**: Group related documents

### Content Quality Guidelines

**For Strategy Documents:**

1. **Be Specific**: Concrete methodologies, not vague principles

   ```markdown
   ❌ "Select strikes based on volatility"
   ✅ "Select strikes 2-8% OTM when 30d volatility exceeds 50%"
   ```

2. **Include Examples**: Show how methodology is applied

   ```markdown
   ✅ "Example: $HYPE at $25 spot, 118% IV → $26 strike (+4% OTM)
   yields $1,000 weekly premium on 3,600 token position"
   ```

3. **Document Context**: Explain when and why to use

   ```markdown
   ✅ "Use $26 strike when: (1) volatility is compressing,
   (2) IV >100%, (3) seeking higher yield vs safety"
   ```

4. **Reference Data Sources**: Link to Price Monitor and Metrics Analyst
   ```markdown
   ✅ "Combine Price Monitor volatility data with Metrics Analyst
   TVL/volume ratios to assess assignment risk"
   ```

## 🔍 Monitoring & Debugging

### Enable Debug Logging

```bash
# .env
LOG_LEVEL=debug
```

**What You'll See:**

```
[DEBUG] CTX enrichment ENABLED
[DEBUG] Processing document: hype-wheel-strategy.md
[DEBUG] Generated 15 chunks from document
[DEBUG] Retrieving top 5 fragments for query: "strike selection"
[DEBUG] RAG metadata: { documentTitle: "hype-wheel-strategy.md", similarity: 0.92 }
```

### Check RAG Usage

Query conversation memories to see what knowledge was used:

```typescript
// In agent code or API
const memories = await runtime.getMemories({
  roomId: roomId,
  count: 10,
});

// Check RAG metadata
memories.forEach((memory) => {
  const ragMeta = memory.metadata?.rag;
  if (ragMeta) {
    console.log("Knowledge used:", ragMeta.retrievedFragments);
    console.log(
      "Similarity scores:",
      ragMeta.retrievedFragments.map((f) => f.similarityScore),
    );
  }
});
```

### Monitor Performance

**Key Metrics to Track:**

- Document processing time
- Embedding generation cost
- Retrieval accuracy (similarity scores)
- Response quality (manual review)

**Tools:**

- API response times
- Database query performance
- Provider API usage dashboards
- Agent response logs

## 🚀 Advanced Configuration Example

Complete `.env` configuration for production use:

```bash
# ==========================================
# BASIC CONFIGURATION
# ==========================================
LOAD_DOCS_ON_STARTUP=true
KNOWLEDGE_PATH=./knowledge

# ==========================================
# CONTEXTUAL EMBEDDINGS (50% Better Accuracy)
# ==========================================
CTX_KNOWLEDGE_ENABLED=true
TEXT_PROVIDER=anthropic
TEXT_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_API_KEY=your-key

# ==========================================
# EMBEDDING CONFIGURATION
# ==========================================
EMBEDDING_PROVIDER=openai
TEXT_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_API_KEY=your-key

# ==========================================
# CHUNKING CONFIGURATION (Optional)
# ==========================================
EMBEDDING_CHUNK_SIZE=500      # Default: 500 tokens
EMBEDDING_OVERLAP_SIZE=100    # Default: 100 tokens

# ==========================================
# PERFORMANCE TUNING
# ==========================================
MAX_CONCURRENT_REQUESTS=30
REQUESTS_PER_MINUTE=60
TOKENS_PER_MINUTE=150000
MAX_INPUT_TOKENS=4000
MAX_OUTPUT_TOKENS=4096

# ==========================================
# RETRIEVAL CONFIGURATION (Optional)
# ==========================================
MAX_KNOWLEDGE_FRAGMENTS=5     # Default: 5
MAX_KNOWLEDGE_TOKENS=4000     # Default: ~4000

# ==========================================
# DEBUGGING
# ==========================================
LOG_LEVEL=info  # Set to 'debug' for detailed logs
```

## 📊 Performance Characteristics

### Processing Times (Estimated)

**For `hype-wheel-strategy.md` (~45KB):**

| Stage                 | Time      | Notes                              |
| --------------------- | --------- | ---------------------------------- |
| Text Extraction       | <1s       | PDF extraction is fast             |
| Deduplication Check   | <100ms    | Content-based ID lookup            |
| Chunking              | <500ms    | ~15 chunks from document           |
| Contextual Enrichment | 5-15s     | If enabled, per chunk processing   |
| Embedding Generation  | 2-5s      | Batch processing (10 chunks/batch) |
| Storage               | <1s       | Database writes                    |
| **Total**             | **8-22s** | Without CTX: ~5s, With CTX: ~20s   |

**Factors:**

- Document size: Linear scaling
- Chunk count: Batch processing mitigates
- Contextual enrichment: Adds ~5-15s but improves accuracy
- API rate limits: Can slow processing if exceeded

### Storage Requirements

**Per Document:**

- Document metadata: ~1-5KB
- Chunk text: ~500 tokens × chunks × 4 bytes ≈ ~2KB per chunk
- Embeddings: 1536 dimensions × 4 bytes = ~6KB per chunk

**Example: `hype-wheel-strategy.md` (15 chunks):**

- Document metadata: ~2KB
- Chunk text: ~30KB
- Embeddings: ~90KB
- **Total: ~122KB per document**

**Scaling:**

- 10 documents: ~1.2MB
- 100 documents: ~12MB
- 1000 documents: ~120MB

### Scaling Considerations

**For Large Knowledge Bases:**

1. **Batch Processing**: Already handles 10 chunks/batch

   ```bash
   # Adjust if needed
   MAX_CONCURRENT_REQUESTS=30  # Increase for faster processing
   ```

2. **Chunking Strategy**: Larger chunks = fewer embeddings

   ```bash
   EMBEDDING_CHUNK_SIZE=800  # Fewer chunks, larger size
   ```

3. **Rate Limiting**: Prevents API throttling

   ```bash
   REQUESTS_PER_MINUTE=60  # Adjust based on provider limits
   ```

4. **Caching**: Contextual embeddings cache reduces reprocessing
   - First processing: Full cost
   - Reprocessing: ~90% cost reduction via cache

## 🔄 Data Flow Architecture

### Document Processing Pipeline

```
Input Sources
    │
    ├─► File Upload (Web UI/API)
    ├─► LOAD_DOCS_ON_STARTUP (Auto)
    ├─► Character Knowledge Array
    └─► PROCESS_KNOWLEDGE Action
         │
         ▼
┌────────────────────────┐
│  Content-Based ID      │
│  Generation            │
│  (Deduplication)       │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│  Text Extraction       │
│  (Format-specific)     │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│  Intelligent Chunking  │
│  (500 tokens, 100      │
│   token overlap)       │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│  Contextual            │
│  Enrichment (optional) │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│  Embedding Generation  │
│  (Batch, Rate-limited) │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│  Storage               │
│  ├─ documents table    │
│  └─ knowledge table    │
└────────────────────────┘
```

### Retrieval Flow Architecture

```
User Message
    │
    ├─► Agent Runtime
    │
    ├─► Knowledge Provider (Automatic)
    │   │
    │   ├─► Generate Query Embedding
    │   │
    │   ├─► Vector Similarity Search
    │   │   ├─► Search knowledge table
    │   │   ├─► Match threshold: 0.1
    │   │   └─► Top 5 fragments
    │   │
    │   ├─► Format Context
    │   │   ├─► "# Knowledge" header
    │   │   └─► Cap at 4000 tokens
    │   │
    │   └─► Inject into State
    │
    ├─► Agent Processes Context
    │   ├─► Knowledge context
    │   ├─► User message
    │   └─► Previous conversation
    │
    ├─► Generate Response
    │
    └─► RAG Metadata Enrichment
        ├─► Record fragments used
        ├─► Store similarity scores
        └─► Update conversation memory
```

### Error Handling Flow

```
Processing Operation
    │
    ├─► Try Operation
    │   │
    │   ├─► Success → Continue
    │   │
    │   └─► Error
    │       │
    │       ├─► Retryable? (Rate limit, timeout)
    │       │   ├─► Yes → Exponential Backoff
    │       │   │   └─► Retry (max 3 attempts)
    │       │   └─► No → Log Error
    │       │
    │       └─► Log Error
    │           └─► Return Error Response
    │
    └─► Completion
```

## 🎯 Optimization Insights

### For Your Use Case (Strategy Documents)

**Document Type:** Trading strategy documents (markdown)

**Characteristics:**

- Structured sections (headers, paragraphs, lists)
- Multi-phase narratives (growth, drawdown, comeback)
- Numerical data (strikes, premiums, percentages)
- Cross-references between concepts

**Optimization Recommendations:**

1. **Chunking Strategy**: Default (500/100) works well
   - Headers and structure preserved
   - Context maintained with overlap

2. **Contextual Enrichment**: Highly recommended
   - Improves understanding of multi-phase strategies
   - Better retrieval of related concepts
   - 90% cost reduction via caching

3. **Query Optimization**: Use specific terms

   ```
   ✅ "strike selection methodology for $HYPE"
   ✅ "$26 vs $27 strike decision"
   ❌ "options" (too generic)
   ```

4. **Document Organization**: One topic per document
   ```
   ✅ hype-wheel-strategy.md (one complete case study)
   ✅ strike-selection.md (one methodology)
   ❌ all-strategies.md (too broad)
   ```

## 📚 References

- [Complete Developer Guide](https://docs.elizaos.ai/plugin-registry/knowledge/complete-documentation)
- [Architecture & Flow Diagrams](https://docs.elizaos.ai/plugin-registry/knowledge/architecture-flow)
- [Contextual Embeddings](https://docs.elizaos.ai/plugin-registry/knowledge/contextual-embeddings)
- [API Reference](https://docs.elizaos.ai/plugin-registry/knowledge#api-reference)
