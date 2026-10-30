# Pulse Dashboard — Project Context

This file is the persistent operational context for ChatGPT/Codex. Read it before making changes to this project.

## Repository
- GitHub repository: `publkey-prog/pulse-dashboard`
- Default branch: `main`

## Live sites
- Production / main Pulse Dashboard: `https://pulse.publkey.com/`
- Preview sandbox: `https://pulse.publkey.com/preview/`

## Deployment chain
Changes pushed to `main` trigger GitHub Actions workflow:
- Workflow: `.github/workflows/deploy-cpanel.yml`
- Display name: `Deploy to cPanel`
- Deployment path: GitHub -> GitHub Actions -> SSH/cPanel -> `pulse.publkey.com`

The workflow verifies deployed files against the live site after upload.

## Safety rule
The preview sandbox is the default place for temporary test projects.

- Temporary/demo projects should be published to: `public/preview/`
- Do NOT replace or modify the main Pulse Dashboard unless the user explicitly asks.
- Do NOT remove `public/preview/` during production restores.
- The workflow is intentionally configured to preserve `preview/` when restoring the main dashboard package.

## How to publish a temporary project
1. Inspect this file and the current workflow before editing.
2. Place/update the preview project under `public/preview/`.
3. For a single-page demo, update `public/preview/index.html`.
4. Commit/push to `main`.
5. Wait for the `Deploy to cPanel` GitHub Actions run to complete.
6. Confirm the run conclusion is `success`.
7. Verify the result at `https://pulse.publkey.com/preview/`.

## Current behavior
The preview sandbox is intentionally independent from the main Pulse Dashboard. A preview deployment must not overwrite the production root.

## Recovery / new-chat instruction
If conversation history is unavailable, do NOT assume the deployment setup is missing.

When the user mentions any of:
- "наша песочница"
- "Pulse Dashboard"
- `pulse.publkey.com`
- `/preview/`

first inspect:
1. this `PROJECT_CONTEXT.md`;
2. `.github/workflows/deploy-cpanel.yml`;
3. `public/preview/`;
4. recent GitHub Actions runs.

Only after that should you decide whether deployment access is available.

## Known working reference
A confirmed successful preview deployment was made through the existing pipeline by updating `public/preview/index.html` and letting the GitHub Actions workflow deploy it automatically.

## Change discipline
- Keep this file updated whenever deployment paths, repositories, workflow names, hosting details, or sandbox rules change.
- Treat GitHub as the working source of truth.
- Keep a backup copy of this context in the user's ChatGPT Library.
