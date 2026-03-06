# Codex Prompt: Asset Naming Follow-Up

The duplicate-extension issue has already been resolved in this repo.

Current guardrails:

- Brand runtime assets live under `public/brand/`.
- `pnpm lint:assets` blocks duplicate-extension regressions in app/runtime files.
- `pwsh ./scripts/generate-launch-assets.ps1` regenerates the launch-ready favicon, PWA, OG, and mascot assets locally.

If this issue reappears, update the affected filenames to their canonical `.png` or `.svg` form and rerun the checks above.
