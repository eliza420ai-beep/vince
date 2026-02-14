# Knowledge Vault

This directory is a **Knowledge Vault**: inbox, todos, projects, resources, meetings. Use it with Claude Code and/or Obsidian for local-first knowledge management.

## Structure

- **00-inbox/** — Capture point. Process items into 03-resources.
- **01-todos/** — inbox.md (capture), active.md (working on), arxiv.md (completed with date).
- **02-projects/** — Project-specific CLAUDE.md files for persistent context.
- **03-resources/** — Processed notes (from inbox).
- **04-claude-code/skills/** — Optional skills; sync to ~/.claude/skills/ per gist.
- **05-prompts/** — Prompt library.
- **06-meetings/** — Recordings and summaries.
- **_templates/** — Obsidian templates.
- **_assets/** — Images, attachments.

## Rules

- Process inbox items into 03-resources (structured notes with frontmatter/summary).
- Use 02-projects for project context; each project can have its own CLAUDE.md.
- Keep 01-todos: inbox → active → arxiv; archive format: `- [x] Task ✅ YYYY-MM-DD`.
- For full behavior, skills, and automation, see vault/README.md and the [Knowledge Vault gist](https://gist.github.com/naushadzaman/164e85ec3557dc70392249e548b423e9).
