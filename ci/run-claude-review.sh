#!/usr/bin/env bash
set -euo pipefail

PROMPT_FILE="/tmp/claude-review-prompt.md"
MCP_CONFIG="/tmp/claude-mcp.json"
SETTINGS_FILE=".claude/ci-code-review-settings.json"
OUTPUT_FILE="${CI_PROJECT_DIR}/claude-review-result.json"
CLAUDE_BIN="${CLAUDE_BIN:-$(command -v claude || true)}"
CLAUDE_BIN="${CLAUDE_BIN:-$HOME/.local/bin/claude}"

if [[ ! -x "$CLAUDE_BIN" ]]; then
  echo "Claude Code not found. Expected at $HOME/.local/bin/claude" >&2
  exit 1
fi

MODEL_FLAG=()
if [[ -n "${CLAUDE_MODEL:-}" ]]; then
  MODEL_FLAG=(--model "$CLAUDE_MODEL")
fi

# Pass Anthropic auth/endpoint explicitly so Claude Code picks up CI/CD variables.
CLAUDE_ENV=(ANTHROPIC_AUTH_TOKEN="${ANTHROPIC_AUTH_TOKEN:?Set ANTHROPIC_AUTH_TOKEN as a masked CI/CD variable}")
if [[ -n "${ANTHROPIC_BASE_URL:-}" ]]; then
  CLAUDE_ENV+=(ANTHROPIC_BASE_URL="$ANTHROPIC_BASE_URL")
fi

env "${CLAUDE_ENV[@]}" "$CLAUDE_BIN" \
  -p "$(cat "$PROMPT_FILE")" \
  --mcp-config "$MCP_CONFIG" \
  --strict-mcp-config \
  --settings "$SETTINGS_FILE" \
  --permission-mode dontAsk \
  --max-turns "${CLAUDE_MAX_TURNS:-25}" \
  --output-format json \
  "${MODEL_FLAG[@]}" \
  > "$OUTPUT_FILE"

# Surface the human-readable summary in the job log.
jq -r '.result // .structured_output // .' "$OUTPUT_FILE"
