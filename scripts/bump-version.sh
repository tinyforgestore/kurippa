#!/usr/bin/env bash
# bump-version.sh — update package.json + tauri.conf.json + Cargo.toml to a new version, commit, and push tag.
# Usage: ./scripts/bump-version.sh <version>  e.g.  ./scripts/bump-version.sh 1.2.0
set -euo pipefail

VERSION="${1:-}"

if [[ -z "$VERSION" ]]; then
  echo "Error: version argument is required." >&2
  echo "Usage: $0 <version>   e.g.  $0 1.2.0" >&2
  exit 1
fi

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: version must be in semver format (e.g. 1.2.0). Got: $VERSION" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PACKAGE_JSON="$REPO_ROOT/package.json"
TAURI_CONF="$REPO_ROOT/src-tauri/tauri.conf.json"
CARGO_TOML="$REPO_ROOT/src-tauri/Cargo.toml"
CARGO_LOCK="$REPO_ROOT/src-tauri/Cargo.lock"

CURRENT_VERSION=$(node -e "console.log(require('$PACKAGE_JSON').version)")
LOWER=$(printf '%s\n' "$CURRENT_VERSION" "$VERSION" | sort -V | head -1)
if [[ "$LOWER" != "$CURRENT_VERSION" || "$CURRENT_VERSION" == "$VERSION" ]]; then
  echo "Error: $VERSION must be greater than current version ($CURRENT_VERSION)." >&2
  exit 1
fi

echo "Bumping version to $VERSION …"

node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('$PACKAGE_JSON', 'utf8'));
pkg.version = '$VERSION';
fs.writeFileSync('$PACKAGE_JSON', JSON.stringify(pkg, null, 2) + '\n');
"
echo "  ✓ package.json → $VERSION"

node -e "
const fs = require('fs');
const conf = JSON.parse(fs.readFileSync('$TAURI_CONF', 'utf8'));
conf.version = '$VERSION';
fs.writeFileSync('$TAURI_CONF', JSON.stringify(conf, null, 2) + '\n');
"
echo "  ✓ src-tauri/tauri.conf.json → $VERSION"

# Replace version in [package] section only.
# sed -i syntax differs between BSD (macOS) and GNU (Linux).
if [[ "$(uname)" == "Darwin" ]]; then
  sed -i '' -E "/^\[package\]/,/^\[/ s/^(version = )\"[^\"]+\"/\1\"$VERSION\"/" "$CARGO_TOML"
  sed -i '' -E "/^name = \"kurippa\"/{n; s/^(version = )\"[^\"]+\"/\1\"$VERSION\"/;}" "$CARGO_LOCK"
else
  sed -i -E "/^\[package\]/,/^\[/ s/^(version = )\"[^\"]+\"/\1\"$VERSION\"/" "$CARGO_TOML"
  sed -i -E "/^name = \"kurippa\"/{n; s/^(version = )\"[^\"]+\"/\1\"$VERSION\"/;}" "$CARGO_LOCK"
fi
echo "  ✓ src-tauri/Cargo.toml → $VERSION"
echo "  ✓ src-tauri/Cargo.lock → $VERSION"

cd "$REPO_ROOT"
git add "$PACKAGE_JSON" "$TAURI_CONF" "$CARGO_TOML" "$CARGO_LOCK"
git commit -m "chore: bump version to $VERSION"
git tag "v$VERSION"
git push origin HEAD
git push origin "v$VERSION"

echo "Done. Tag v$VERSION pushed."
