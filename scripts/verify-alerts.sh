#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BANNED_PATTERN='Alert\.alert\(|ActionSheetIOS\.showActionSheetWithOptions\('

if rg -n "$BANNED_PATTERN" src --glob '*.{ts,tsx}'; then
  echo "[FAIL] Native alerts found. Use AppAlertProvider + useAppAlert instead."
  exit 1
fi

if ! rg -n "<AppAlertProvider>" App.tsx >/dev/null; then
  echo "[FAIL] AppAlertProvider is not mounted in App.tsx."
  exit 1
fi

echo "[OK] Alert verification passed."
