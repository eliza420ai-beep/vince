# Knowledge Plugin Examples & Best Practices

Practical examples and recipes based on the [official examples guide](https://docs.elizaos.ai/plugin-registry/knowledge/examples).

## 🎯 How Knowledge Actually Works

The Knowledge Plugin allows agents to learn from documents in **three ways**:

1. **Auto-load from `knowledge/` folder** (✅ **Recommended for your use case**)
2. **Upload via Web Interface** (Best for dynamic content)
3. **Hardcode small snippets** (Only for tiny bits of info - avoid for real docs)

## 📋 Real-World Setup for Your Agent

### Current Setup (Strategy Optimization Agent)

**Your Current Configuration:**

```
knowledge/
├── strategy-optimization/
│   └── hype-wheel-strategy.md  ✅ Already created
└── README.md
```

**Configuration:**

```bash
# .env
LOAD_DOCS_ON_STARTUP=true
KNOWLEDGE_PATH=./knowledge
```

**What Happens:**

1. Agent starts
2. Automatically finds all files in `knowledge/` directory
3. Processes each document into searchable chunks
4. Logs: `"Loaded 1 documents from knowledge folder on startup"`

### Example Workflow

**Step 1: Prepare Documents**

Create well-organized knowledge files:

```
knowledge/
├── strategy-optimization/
│   ├── hype-wheel-strategy.md        ✅ Already created
│   ├── weekly-evaluation.md          📝 Create this
│   ├── strike-selection.md           📝 Create this
│   └── risk-reward-analysis.md       📝 Create this
├── market-analysis/
│   ├── hypersurface-dynamics.md      📝 Platform-specific
│   └── market-structure.md           📝 DeFiLlama interpretation
└── examples/
    └── case-studies.md               📝 Real outcomes
```

**Step 2: Start Agent**

```bash
bun start
```

**Console Output:**

```
[INFO] Loaded 1 documents from knowledge folder on startup
[INFO] Processing: hype-wheel-strategy.md
[INFO] Generated 15 chunks from document
[INFO] Knowledge base ready
```

**Step 3: Ask Questions**

```
You: "What does the $HYPE wheel strategy say about strike selection?"
Agent: [Automatically searches knowledge, finds relevant sections from
        hype-wheel-strategy.md, provides contextual answer]

You: "What's your experience with the $26 vs $27 strike decision?"
Agent: [Retrieves specific section about $26 strike optimization,
        cites methodology from knowledge base]
```

## ✅ Best Practices for Your Use Case

### DO: Use the Knowledge Folder (Recommended)

**✅ Recommended approach for strategy documents:**

```bash
# 1. Put documents in knowledge/strategy-optimization/
knowledge/
└── strategy-optimization/
    ├── hype-wheel-strategy.md
    ├── weekly-evaluation.md
    └── strike-selection.md

# 2. Set LOAD_DOCS_ON_STARTUP=true in .env
LOAD_DOCS_ON_STARTUP=true
KNOWLEDGE_PATH=./knowledge

# 3. Start agent
bun start

# 4. Documents are automatically loaded ✅
```

**Benefits:**

- ✅ Version controlled (commit to git)
- ✅ Consistent across deployments
- ✅ Automatically loaded on startup
- ✅ No manual upload needed

### DO: Use Web Upload for Dynamic Content

**✅ When to use the web interface:**

1. **User-specific content:**
   - User-uploaded strategy documents
   - Custom analysis reports
   - One-off research notes

2. **Frequently changing documents:**
   - Daily market analysis updates
   - Weekly strategy adjustments
   - Real-time research findings

3. **Testing:**
   - Test new document formats
   - Try different strategy variations
   - Experiment with different content

**How to Use:**

```
1. Start agent: bun start
2. Open: http://localhost:3000
3. Select StrategyOptimizer agent
4. Click Knowledge tab
5. Drag & drop file or click to upload
6. Document processed immediately ✅
```

### DON'T: Hardcode Large Content

**❌ Avoid this:**

```typescript
// DON'T do this in character.ts
knowledge: [
  "# $HYPE Wheel Strategy\n\nThe $26 strike offers... (500 lines)",
  "# Weekly Evaluation\n\nOur weekly evaluation... (1000 lines)",
  // This is inefficient and hard to maintain!
];
```

**✅ Instead, use files:**

```
knowledge/
└── strategy-optimization/
    ├── hype-wheel-strategy.md  ← Put it here
    └── weekly-evaluation.md    ← Put it here
```

**Why Files Are Better:**

- ✅ Version control (git)
- ✅ Easy to update
- ✅ Better processing (deduplication, chunking)
- ✅ Can be referenced elsewhere
- ✅ No code changes needed to update knowledge

**When to Use `knowledge` Array:**

- ✅ Tiny snippets only (< 100 tokens)
- ✅ Static information (office hours, contact info)
- ✅ One-liners that don't need documents

```typescript
// ✅ OK for tiny snippets
knowledge: [
  "Our trading window: Monday-Friday, 9 AM - 5 PM EST",
  "Emergency contact: [email protected]",
];
```

## 📚 Real-World Examples

### Example 1: Strategy Document (Your Current Use Case)

**File:** `knowledge/strategy-optimization/hype-wheel-strategy.md`

**Content:** Full strategy document with:

- Multi-phase trading history
- Strike selection methodology
- Risk-reward calculations
- Historical context

**How Agent Uses It:**

```
User: "What strike price should I use for $HYPE?"

Agent Process:
1. Knowledge Provider searches for "strike price $HYPE"
2. Finds relevant chunks from hype-wheel-strategy.md
3. Retrieves: "$26 strike offers 118% APR compared to 65% at $27"
4. Injects into context: "# Knowledge\n[retrieved chunks]"
5. Agent uses this to provide recommendation

Response: "Based on our $HYPE wheel strategy knowledge, the $26 strike
offers 118% APR compared to 65% at $27, representing nearly double the
yield with ~$1,000 additional weekly premium on a 3,600 token position..."
```

### Example 2: Adding a New Strategy Document

**Step 1: Create File**

```bash
# Create new knowledge file
touch knowledge/strategy-optimization/weekly-evaluation.md
```

**Step 2: Write Content**

```markdown
# Weekly Options Strategy Evaluation Methodology

## Overview

Our weekly evaluation process synthesizes multiple data sources...

## Volatility Assessment

We assess volatility through multiple lenses:

- Historical volatility from price data
- Implied volatility from options markets
  ...

## Weekly Routine

1. Check Price Monitor for current prices
2. Analyze Metrics Analyst data for TVL/volume ratios
3. Apply our framework for strike selection
   ...
```

**Step 3: Restart Agent**

```bash
# Agent will automatically detect new file
bun start

# Console shows:
[INFO] Loaded 2 documents from knowledge folder on startup
[INFO] Processing: weekly-evaluation.md
```

**Step 4: Verify**

```
You: "What's your weekly evaluation methodology?"
Agent: [Retrieves and references weekly-evaluation.md]
```

### Example 3: Upload via Web Interface

**Scenario:** Quick test with a new strategy variation

**Steps:**

1. Create `test-strategy.md` on your computer
2. Start agent: `bun start`
3. Open `http://localhost:3000`
4. Select StrategyOptimizer
5. Click Knowledge tab
6. Drag `test-strategy.md` into upload area
7. Document processed immediately ✅

**Console Output:**

```
[INFO] Processing uploaded document: test-strategy.md
[INFO] Generated 12 chunks from document
[INFO] Document ready for retrieval
```

**Test Immediately:**

```
You: "What does test-strategy.md say about volatility?"
Agent: [Uses newly uploaded document]
```

**When Done Testing:**

- Delete via Knowledge tab (web interface)
- Or keep it if useful

## 🔍 How Agents Use Knowledge

### Automatic Knowledge Search

**How It Works Behind the Scenes:**

```typescript
// 1. User sends message
User: "What strike price should I use for $HYPE?"

// 2. Knowledge Provider automatically triggered
Knowledge Provider:
  - Generates query embedding
  - Searches knowledge table for relevant chunks
  - Retrieves top 5 fragments with similarity > 0.1
  - Formats with "# Knowledge" header

// 3. Injected into agent context
Agent Context:
  "# Knowledge

   In the $HYPE wheel strategy section on strike selection,
   the $26 strike offers 118% APR compared to 65% at $27...

   [More relevant chunks...]

   User message: What strike price should I use for $HYPE?"

// 4. Agent generates response using knowledge + message
Agent: "Based on our $HYPE wheel strategy, I recommend the $26
        strike because it offers 118% APR, nearly double the
        65% yield at $27. For a 3,600 token position, this
        provides ~$1,000 additional weekly premium..."
```

### Knowledge Provider Flow

```
User Message
    │
    ├─► Agent Runtime
    │
    ├─► Knowledge Provider (Automatic)
    │   │
    │   ├─► Search Knowledge Base
    │   │   ├─► Generate query embedding
    │   │   ├─► Vector similarity search
    │   │   └─► Top 5 fragments retrieved
    │   │
    │   ├─► Format Context
    │   │   ├─► Add "# Knowledge" header
    │   │   ├─► Include retrieved chunks
    │   │   └─► Cap at ~4000 tokens
    │   │
    │   └─► Inject into State
    │
    ├─► Agent Processes Context
    │   ├─► Knowledge context
    │   ├─► User message
    │   └─► Previous conversation
    │
    └─► Generate Response
        └─► Uses knowledge + context
```

**Key Points:**

- ✅ **Automatic**: No special commands needed
- ✅ **Transparent**: You can check RAG metadata to see what was used
- ✅ **Efficient**: Only retrieves relevant chunks (top 5)
- ✅ **Contextual**: Knowledge formatted for agent understanding

## 🧪 Testing Your Setup

### Quick Verification

**1. Check Startup Logs**

```bash
bun start

# Look for:
[INFO] Loaded 1 documents from knowledge folder on startup
[INFO] Processing: hype-wheel-strategy.md
[INFO] Generated 15 chunks from document
```

**2. Ask About Documents**

```
You: "What documents do you have about $HYPE strategy?"
Agent: "I have information about the $HYPE wheel strategy from
        hype-wheel-strategy.md, which covers strike selection,
        risk management, and historical trading phases..."

You: "What do you know about strike selection?"
Agent: "Based on my knowledge of the $HYPE wheel strategy, strike
        selection involves comparing premiums at different strikes.
        For example, the $26 strike offers 118% APR compared to
        65% at $27..."
```

**3. Use Knowledge Tab**

```
1. Open http://localhost:3000
2. Select StrategyOptimizer
3. Click Knowledge tab
4. Verify hype-wheel-strategy.md is listed
5. Check chunk count: "15 chunks"
```

### Verify Knowledge Retrieval

**Test Specific Content:**

```
You: "What does your knowledge say about the $26 strike decision?"
Agent: Should reference specific content from hype-wheel-strategy.md:
        - 118% APR vs 65% at $27
        - ~$1,000 additional weekly premium
        - Position size (3,600 tokens)
        - Rationale (volatility compression, liquidity)
```

**Check RAG Metadata (Advanced):**

```typescript
// In agent code or API, check conversation memory
const memory = await runtime.getMemoryById(memoryId);
const ragMetadata = memory.metadata?.rag;

// Should show:
// - Retrieved fragments from hype-wheel-strategy.md
// - Similarity scores (e.g., 0.92)
// - Content previews
// - Query text that triggered retrieval
```

## 📁 Document Organization Best Practices

### Recommended Structure

**For Your Trading Strategy Use Case:**

```
knowledge/
├── strategy-optimization/      # Core strategy knowledge
│   ├── hype-wheel-strategy.md  ✅ Real-world case study
│   ├── weekly-evaluation.md    📝 Methodology
│   ├── strike-selection.md     📝 Selection frameworks
│   └── risk-reward-analysis.md 📝 Risk frameworks
├── market-analysis/            # Market interpretation
│   ├── hypersurface-dynamics.md 📝 Platform knowledge
│   └── market-structure.md     📝 Metrics interpretation
└── examples/                   # Real outcomes
    └── case-studies.md         📝 Actual examples
```

**Why This Structure:**

- ✅ **Logical grouping**: Related topics together
- ✅ **Easy to find**: Clear folder names
- ✅ **Scalable**: Add more folders as needed
- ✅ **Maintainable**: One topic per document

### Document Naming Conventions

**✅ Good Names:**

```
hype-wheel-strategy.md           # Clear, descriptive
weekly-evaluation.md             # Specific topic
strike-selection.md              # Action-focused
risk-reward-analysis.md          # Descriptive
```

**❌ Bad Names:**

```
doc1.md                          # Not descriptive
strategy.md                      # Too generic
notes.md                         # Vague
everything.md                    # Too broad
```

### One Topic Per Document

**✅ Recommended:**

```
knowledge/strategy-optimization/
├── strike-selection.md          # One topic: strike selection
├── risk-reward-analysis.md      # One topic: risk-reward
└── weekly-evaluation.md         # One topic: evaluation
```

**❌ Avoid:**

```
knowledge/strategy-optimization/
└── all-strategies.md            # Too broad, harder to retrieve
```

**Why One Topic:**

- ✅ Better retrieval accuracy
- ✅ Easier to update specific topics
- ✅ Clearer document purpose
- ✅ More focused chunks

## 🎯 Real-World Usage Patterns

### Pattern 1: Strategy Updates (Your Use Case)

**Scenario:** Weekly strategy evaluation, updating knowledge with new insights

**Approach:**

```
1. Create weekly-evaluation.md in knowledge/strategy-optimization/
2. Document your weekly methodology
3. Restart agent: bun start
4. Agent automatically loads updated document
5. Ask agent about weekly evaluation → Uses new knowledge
```

**Or via Web Interface (Dynamic):**

```
1. Update weekly-evaluation.md locally
2. Upload via web interface (no restart needed)
3. Agent immediately uses updated knowledge
```

### Pattern 2: Testing New Strategies

**Scenario:** Want to test a new strategy approach

**Approach:**

```
1. Create test-strategy.md
2. Upload via web interface (http://localhost:3000)
3. Ask agent about test strategy
4. Evaluate results
5. If good: Move to knowledge/strategy-optimization/
6. If not: Delete via web interface
```

### Pattern 3: Multi-Document Queries

**Scenario:** Agent needs to synthesize information from multiple documents

**How It Works:**

```
You: "Compare our $HYPE strategy with BTC strategies"

Agent Process:
1. Searches for "$HYPE strategy" → Finds hype-wheel-strategy.md chunks
2. Searches for "BTC strategies" → Finds btc-strategy.md chunks
3. Synthesizes information from both documents
4. Provides comparative analysis

Response: "Our $HYPE wheel strategy focuses on high-IV assets with
          118% APR yields, while our BTC strategy emphasizes stability
          with 1-1.3% weekly yields through lower volatility..."
```

## 🐛 Troubleshooting Examples

### Documents Not Loading

**Problem:**

```
No documents found in logs, Knowledge tab is empty
```

**Check:**

```bash
# 1. Verify .env has:
LOAD_DOCS_ON_STARTUP=true
KNOWLEDGE_PATH=./knowledge

# 2. Check folder exists:
ls knowledge/strategy-optimization/

# 3. Verify files are readable:
cat knowledge/strategy-optimization/hype-wheel-strategy.md

# 4. Check agent logs for errors:
[INFO] Loaded 0 documents... # ❌ Problem
[INFO] Loaded 1 documents... # ✅ Working
```

**Solution:**

```bash
# Restart agent after changing .env
bun start

# Should see:
[INFO] Loaded 1 documents from knowledge folder on startup
```

### Agent Can't Find Information

**Problem:**

```
Agent: "I don't have information about that"
But you know it's in hype-wheel-strategy.md
```

**Check:**

1. **Document loaded?** Check Knowledge tab
2. **Content exists?** Verify file has the information
3. **Query too generic?** Try more specific terms

**Try:**

```
❌ "What do you know?" (too generic)
✅ "What does the $HYPE wheel strategy say about strike selection?"

❌ "Tell me about options" (too broad)
✅ "Search your knowledge for covered call strike selection methodology"

❌ "How do I trade?" (too vague)
✅ "What's the methodology for selecting $26 vs $27 strikes?"
```

### Slow Processing

**Problem:**

```
Document processing takes too long
```

**Optimize:**

```bash
# Reduce parallel processing
MAX_CONCURRENT_REQUESTS=15  # Default is 30

# Use faster models
TEXT_MODEL=anthropic/claude-3-haiku  # Faster than Sonnet
```

## 📊 Summary

### Three Ways to Add Knowledge

| Method                    | Best For                 | How                                    | When                                 |
| ------------------------- | ------------------------ | -------------------------------------- | ------------------------------------ |
| **Auto-load from folder** | Production documents     | Put in `knowledge/` folder             | ✅ **Recommended for your use case** |
| **Web interface upload**  | Dynamic content, testing | Drag & drop at `http://localhost:3000` | User uploads, quick tests            |
| **Hardcode in array**     | Tiny snippets only       | `knowledge: [...]` in character        | Static one-liners only               |

### Your Current Setup

✅ **What's Working:**

- Plugin configured in agent
- Auto-loading enabled (`LOAD_DOCS_ON_STARTUP=true`)
- Custom path configured (`KNOWLEDGE_PATH=./knowledge`)
- First document created (`hype-wheel-strategy.md`)

📋 **Recommended Next Steps:**

1. Add more strategy documents (weekly-evaluation.md, strike-selection.md)
2. Test knowledge retrieval with specific queries
3. Enable contextual embeddings for 50% better accuracy (optional)
4. Monitor RAG metadata to see what knowledge influences responses

### Key Takeaways

1. **Use files, not hardcoding**: Documents are version-controlled and easier to manage
2. **One topic per document**: Better retrieval accuracy
3. **Auto-loading is best**: Consistent, automatic, version-controlled
4. **Web interface for dynamic content**: Great for testing and user uploads
5. **Agent searches automatically**: No special commands needed

## 📚 References

- [Examples & Recipes Guide](https://docs.elizaos.ai/plugin-registry/knowledge/examples)
- [Quick Start Guide](https://docs.elizaos.ai/plugin-registry/knowledge/quick-start)
- [Complete Developer Guide](https://docs.elizaos.ai/plugin-registry/knowledge/complete-documentation)
