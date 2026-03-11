# Knowledge Quality Guidelines

This guide outlines best practices for maintaining high-quality knowledge content in the knowledge base.

## Quality Principles

### 1. Methodology Over Data

**Priority**: Focus on **HOW TO THINK** about topics, not just historical data.

**Good Examples:**

- ✅ "When funding rates flip from negative to positive, this indicates..."
- ✅ "The framework for evaluating TVL/MCap ratios involves..."
- ✅ "Strike selection principles for covered calls should consider..."

**Avoid:**

- ❌ Quoting specific prices as if they're current ("Bitcoin is $50k")
- ❌ Using outdated metrics without context ("TVL was $10B in March")
- ❌ Data-heavy chunks without methodology explanation

### 2. Conceptual Content Over Raw Numbers

**Priority**: Explain concepts, frameworks, and analytical approaches.

**Good Examples:**

- ✅ "The concept of funding rate interpretation..."
- ✅ "A framework for analyzing volatility regimes..."
- ✅ "The principle behind strike selection..."

**Avoid:**

- ❌ Lists of numbers without explanation
- ❌ Data tables without methodology context
- ❌ Historical examples presented as current data

### 3. Minimize Meta-Instructions

**Priority**: Focus on actual knowledge, not instructions about tool usage.

**What to Remove:**

- ❌ "Use this tool to retrieve..."
- ❌ "Call this API with..."
- ❌ "Follow these steps to..."
- ❌ "Action: ..." or "Handler: ..."
- ❌ Plugin/service registration instructions

**What to Keep:**

- ✅ Actual methodology and frameworks
- ✅ Analytical approaches
- ✅ Strategic thinking patterns
- ✅ Conceptual explanations

### 4. Essay-Aware Chunking

**Priority**: Preserve context and complete methodologies across chunks.

**Best Practices:**

- Structure essays with clear sections (intro, body, conclusion)
- Use section headers to mark chunk boundaries
- Ensure complete methodologies aren't split across chunks
- Preserve context when chunking (use overlap)

**Example Structure:**

```markdown
# Essay Title

## Introduction

[Context and overview]

## Methodology Section

[Complete methodology explanation - keep together]

## Framework Section

[Complete framework - keep together]

## Examples

[Historical examples - clearly marked as illustrative]

## Conclusion

[Summary and key takeaways]
```

## Quality Metrics

### Target Metrics

- **Methodology Score**: >60% (content focuses on HOW TO THINK)
- **Conceptual Score**: >50% (conceptual/analytical content)
- **Meta-Instruction Ratio**: <20% (minimal tool usage instructions)
- **Overall Quality**: >70% (balanced methodology + conceptual content)

### Monitoring

Run quality audits regularly:

```bash
bun run scripts/audit-knowledge-quality.ts
```

This will identify:

- Files with high meta-instruction ratios
- Files with many outdated numbers
- Files with low methodology content
- Overall quality scores

## Content Guidelines

### For Essays

1. **Add Metadata Headers**:

   ```markdown
   > **Note**: This essay contains historical examples from [date].
   > Numbers and prices are illustrative, not current data.
   > Focus: Methodology and frameworks for analysis.
   ```

2. **Structure for Chunking**:
   - Use clear section headers
   - Keep complete methodologies together
   - Mark examples clearly as illustrative

3. **Emphasize Methodology**:
   - Explain HOW TO THINK about topics
   - Provide frameworks and analytical approaches
   - Show pattern recognition, not just patterns

### For Prompt Templates

1. **Remove Tool Instructions**:
   - Remove MCP tool usage instructions
   - Remove API call examples
   - Keep the analytical framework and structure

2. **Focus on Structure**:
   - Keep the prompt structure and format
   - Keep the analytical approach
   - Keep the output format expectations

3. **Mark as Methodology**:
   - These are frameworks for analysis
   - They show HOW TO STRUCTURE prompts
   - They provide thinking patterns

## Chunking Best Practices

### Current Chunking Strategy

- **Chunk Size**: 500-1000 tokens (configurable)
- **Overlap**: 100-200 tokens (configurable)
- **Boundaries**: Prefer sentence boundaries
- **Context**: Preserve section context

### Essay-Aware Chunking

When chunking essays:

1. **Detect Structure**: Identify intro, body, conclusion sections
2. **Chunk at Boundaries**: Prefer section boundaries over arbitrary splits
3. **Preserve Context**: Include section headers in chunks
4. **Complete Methodologies**: Don't split methodology explanations

### Example: Good Chunking

**Original Essay:**

```markdown
# Funding Rate Analysis

## Introduction

Funding rates are a key indicator...

## Methodology: Interpreting Funding Rates

When funding rates flip from negative to positive, this indicates...
[Complete methodology explanation - 500 tokens]

## Framework: Entry Timing

The 8-hour candle close approach involves...
[Complete framework - 400 tokens]
```

**Good Chunking:**

- Chunk 1: Introduction + Methodology (complete)
- Chunk 2: Methodology (end) + Framework (complete)
- Chunk 3: Framework (end) + Examples

**Bad Chunking:**

- ❌ Splitting methodology mid-explanation
- ❌ Separating framework from methodology
- ❌ Losing section context

## Maintenance Workflow

### Regular Tasks

1. **Weekly**: Run quality audit

   ```bash
   bun run audit:knowledge
   ```

2. **Monthly**: Review and fix flagged issues
   - Remove meta-instructions
   - Add metadata headers to essays (if new essays added)
   - Enhance methodology content for low-quality files

3. **Quarterly**: Review overall metrics
   ```bash
   bun run metrics:knowledge
   ```

### Enhancement Workflow

When quality scores are low, use the enhancement scripts:

1. **Add Headers** (Quick Win - Free):

   ```bash
   bun run enhance:headers --backup
   ```

2. **AI-Enhance Low-Quality Files** (Cost: ~$0.50-5.00):

   ```bash
   bun run enhance:ai --backup --limit 10  # Test first
   bun run enhance:ai --backup              # Then all files
   ```

3. **Extract Methodology** (For worst files):

   ```bash
   bun run enhance:methodology --backup
   ```

4. **Batch Process** (For large-scale improvements):

   ```bash
   bun run enhance:batch --backup
   ```

5. **Verify Improvements**:
   ```bash
   bun run audit:knowledge
   bun run metrics:knowledge
   ```

See `scripts/KNOWLEDGE-ENHANCEMENT-GUIDE.md` for detailed instructions.

### Fixing Issues

**High Meta-Instruction Ratio:**

- Remove tool usage instructions
- Remove API call examples
- Keep analytical frameworks

**Many Outdated Numbers:**

- Add metadata headers indicating numbers are illustrative
- Focus on methodology, not specific numbers
- Use numbers to illustrate concepts, not as data

**Low Methodology Content:**

- Add framework explanations
- Add analytical approaches
- Add "how to think" guidance

## Testing Quality Impact

After making quality improvements, test the impact:

```bash
bun run scripts/test-knowledge-quality.ts
```

This will show:

- Improvement in retrieval accuracy
- Better methodology retrieval
- Higher quality scores

## Success Criteria

A high-quality knowledge base should:

1. ✅ **Retrieve Methodology**: RAG finds methodology/framework content
2. ✅ **High Test Scores**: 20-30%+ improvement in test scores
3. ✅ **Quality Metrics**: >70% overall quality score
4. ✅ **Low Meta-Noise**: <20% meta-instruction ratio
5. ✅ **Methodology Focus**: >60% methodology content

## Resources

- **Adding New Knowledge**: [ADDING-KNOWLEDGE.md](ADDING-KNOWLEDGE.md) – prefer ingestion; for manual adds use the essay template or Knowledge Base Note + headers; for existing pastes prepend the note and optionally run audit + ai-enhance.
- **Essay Template**: [knowledge-essay-template.md](knowledge-essay-template.md) – Methodology & Framework, Knowledge Base Note, ## Metadata, ## Context/Main/Conclusion.
- **Quality Audit**: `scripts/audit-knowledge-quality.ts`
- **Metrics Monitoring**: `scripts/knowledge-metrics.ts`
- **Quality Testing**: `scripts/test-knowledge-quality.ts`
- **Configuration**: `knowledge/internal-docs/CONFIGURATION.md`
