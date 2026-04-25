#!/bin/bash
# Sync the current branch to GitHub.
# Repository: https://github.com/sribintangDev/igcse-add-maths-crash
# Uses the Replit GitHub integration (github:1.0.0) via the Git Data API.
# No personal access token required.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$WORKSPACE_ROOT"
echo "Syncing to GitHub via Replit GitHub integration..."
pnpm --filter @workspace/scripts run github-sync
