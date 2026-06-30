#!/usr/bin/env bash
# Push current branch to origin and client remotes.
set -euo pipefail
BRANCH="${1:-$(git branch --show-current)}"
echo "Pushing branch: $BRANCH"
git push origin "$BRANCH"
if git remote get-url client &>/dev/null; then
  git push client "$BRANCH"
  echo "Pushed to client remote."
else
  echo "No 'client' remote. Add: git remote add client https://github.com/SVOGANLLC/smegarm.git"
fi
