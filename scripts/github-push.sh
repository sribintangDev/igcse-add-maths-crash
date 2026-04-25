#!/bin/bash
# Push current branch to GitHub (origin remote).
# Repository: https://github.com/sribintangDev/igcse-add-maths-crash
# The GitHub integration (github:1.0.0) must be connected in this Repl.

set -e

REMOTE_URL="https://github.com/sribintangDev/igcse-add-maths-crash.git"
BRANCH="${1:-main}"

# Ensure the origin remote is set correctly
if ! git remote get-url origin &>/dev/null; then
  git remote add origin "$REMOTE_URL"
  echo "Added origin remote: $REMOTE_URL"
else
  CURRENT=$(git remote get-url origin)
  if [ "$CURRENT" != "$REMOTE_URL" ]; then
    git remote set-url origin "$REMOTE_URL"
    echo "Updated origin remote to: $REMOTE_URL"
  fi
fi

echo "Pushing branch '$BRANCH' to GitHub…"
git push origin "$BRANCH"
echo "Done. View at: https://github.com/sribintangDev/igcse-add-maths-crash"
