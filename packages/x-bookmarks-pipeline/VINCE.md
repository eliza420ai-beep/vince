# VINCE bundle

This directory is the **[x-bookmarks-pipeline](https://github.com/eliza420ai-beep/x-bookmarks-pipeline)** Rust crate, checked in under `packages/` so VINCE can call it via `cargo` and `bun run x-bookmarks:*`.

- **Docs:** [docs/X-BOOKMARKS-PIPELINE.md](../../docs/X-BOOKMARKS-PIPELINE.md)
- **Upstream README:** [README.md](./README.md)

Update the subtree when you want new upstream behavior:

```bash
cd packages/x-bookmarks-pipeline
git remote add upstream https://github.com/eliza420ai-beep/x-bookmarks-pipeline.git  # once
git fetch upstream && git merge upstream/main
```
