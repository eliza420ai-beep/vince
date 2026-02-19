# Reverse Prompting & Prompt Design

## Understanding Reverse Prompting

Reverse prompting (also called reverse prompt engineering) is a technique where you start with a desired AI output and work backward to infer or generate the ideal prompt that would produce it. Instead of trial-and-error crafting, you analyze successful outputs to create reusable, optimized prompts. Especially useful for refining AI interactions, achieving consistency, diagnosing issues, or customizing agents.

Key benefits:

- **Consistency**: Helps create templates for repeatable high-quality outputs.
- **Efficiency**: Reduces iteration by learning from what works.
- **Customization**: Great for tailoring AI agents like OpenClaw, where prompts drive behavior, skills, and tasks.
- **Debugging**: Reveals hidden patterns in how an AI interprets inputs.

Common methods:

1. **Output-to-Prompt Inference**: Feed an AI (e.g., Claude or GPT via OpenClaw) an example output and ask it to generate the prompt that likely created it. Refine and test.
2. **Interview-Style (Role Reversal)**: Let the AI "interview" you by asking questions to build a prompt collaboratively.
3. **Deconstruction**: Break down an output into components (structure, style, key elements) and reverse-engineer the prompt manually or with AI help.

## Applying Reverse Prompting to OpenClaw

OpenClaw is an open-source, self-hosted AI agent runtime that acts as a personal assistant. It runs locally, integrates with messaging apps (e.g., WhatsApp, Telegram), and uses LLMs (like Anthropic's Claude or OpenAI's models) to execute tasks via skills, tools, and injected prompts. Its core behavior is defined by files like `SOUL.md` (core identity/persona), `AGENTS.md` (agent configurations), `TOOLS.md` (tool descriptions), and skill-specific `SKILL.md` files in your `~/.openclaw/workspace/` directory. These are injected into the model's context, making reverse prompting ideal for customizing or optimizing them.

Since OpenClaw is "yours" (customizable instance), reverse prompting can help you:

- Refine its responses for better accuracy or personality.
- Create new skills by reverse-engineering successful task outputs.
- Debug or enhance existing prompts to reduce errors like hallucinations or off-topic replies.
- Build automations (e.g., cron jobs) by generating prompts from example outcomes.

### Step-by-Step Guide

1. **Set Up Your Environment**:
   - Ensure OpenClaw is installed and running (e.g., via `openclaw onboard` CLI).
   - Configure your model (recommend Claude Opus for better context handling and prompt-injection resistance).
   - Connect to a channel (e.g., Telegram) for interaction.

2. **Basic Reverse Prompting via Chat**:
   - Send a message to your OpenClaw agent with an example output and instruct it to reverse-engineer the prompt.
   - Example interaction (in Telegram or similar):

     ```
     /new  // Start a fresh session to avoid context pollution
     Analyze this output and generate the most effective prompt that would produce it:

     [Paste your desired/example output here, e.g., a summarized email or code snippet]
     ```

   - OpenClaw will respond with a suggested prompt. Test it by copying and sending it back (e.g., `/reset` then paste the generated prompt).
   - Tip: Use `/think high` before the command to increase reasoning depth for better analysis.

3. **Role-Reversal (AI Interviews You)**:
   - This is powerful for complex tasks. Let OpenClaw build the prompt by querying you.
   - Example:
     ```
     Act as a prompt engineer. I want to [describe goal, e.g., "automate email summaries"]. Ask me questions one by one to gather details, then generate an optimized prompt for this task.
     ```
   - Respond to its questions iteratively. It will compile a refined prompt at the end.

4. **Customizing OpenClaw's Core Prompts**:
   - Edit files in `~/.openclaw/workspace/` to inject custom prompts.
   - Use reverse prompting to improve them:
     - Run a task in OpenClaw and capture the output.
     - Feed it back: "Reverse-engineer the system prompt that led to this response."
     - Update `SOUL.md` (defines persona) or `SKILL.md` with the refined version.
   - Example `SOUL.md` content (from OpenClaw's default; reverse-prompt to tweak):
     ```
     You are OpenClaw, a helpful, witty AI assistant shaped like a lobster. Be concise, proactive, and use tools when needed.
     ```

     - Reverse it: If you like a witty response, feed it to OpenClaw and ask for a better prompt version.

5. **For Skills and Automations**:
   - OpenClaw has a skills registry (ClawHub). To create/reverse a skill:
     - Execute a manual task (e.g., "Summarize my GitHub issues").
     - If output is good: "Generate a SKILL.md prompt template from this result."
     - Save as a new skill file and install via `openclaw skill install <path>`.
   - For jobs (e.g., scheduled tasks): Reverse from a successful run log to create prompt-based cron entries.

6. **Advanced Tips**:
   - **Combine with Tools**: Use OpenClaw's browser tool for web research in reverse prompting (e.g., "Search examples of email summaries, then reverse-prompt the best one").
   - **Handle Long Contexts**: Use `/compact` to summarize sessions before reverse prompting.
   - **Security Note**: Avoid sensitive data in outputs you analyze, as OpenClaw has system access. Use sandboxing for untrusted sessions.
   - **Iteration Loop**: Test generated prompts 3-5 times, refining each time (e.g., "Improve this prompt based on why the output deviated").
   - **Tools for Help**: Integrate with models like GPT-4o for meta-prompting if Claude struggles.

## Examples

- **Content Creation**: Output: "A fun, 200-word blog post on AI agents." Reverse: OpenClaw generates: "Write a 200-word engaging blog post about AI agents, using humor and real-world examples."
- **Code Task**: Output: Python script for file sorting. Reverse: "Create a prompt for generating a Python script that sorts files by date."
- **OpenClaw-Specific**: If OpenClaw's response is verbose: Feed it back with "Make a prompt that enforces concise replies."

---

_If this doesn't match what you meant (e.g. a specific OpenClaw feature or skill), provide more details like an example output or task._
