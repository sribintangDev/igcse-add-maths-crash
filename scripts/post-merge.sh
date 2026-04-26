#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push

# Re-configure git to use the committed hooks directory
git config core.hooksPath .githooks
chmod +x .githooks/post-commit
