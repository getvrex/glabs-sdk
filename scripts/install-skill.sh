#!/usr/bin/env bash
# Install the glabs-cli skill for Claude Code
# Usage: curl -fsSL https://raw.githubusercontent.com/getvrex/glabs-sdk/main/scripts/install-skill.sh | bash

set -euo pipefail

REPO="https://raw.githubusercontent.com/getvrex/glabs-sdk/main"
SKILL_DIR=".claude/skills/glabs-cli"
REF_DIR="$SKILL_DIR/references"

echo "Installing glabs-cli skill for Claude Code..."

mkdir -p "$REF_DIR"

curl -fsSL "$REPO/.claude/skills/glabs-cli/SKILL.md" -o "$SKILL_DIR/SKILL.md"
curl -fsSL "$REPO/.claude/skills/glabs-cli/references/commands-reference.md" -o "$REF_DIR/commands-reference.md"
curl -fsSL "$REPO/.claude/skills/glabs-cli/references/development-guide.md" -o "$REF_DIR/development-guide.md"

echo "Installed glabs-cli skill to $SKILL_DIR"
echo "Restart Claude Code to activate."
