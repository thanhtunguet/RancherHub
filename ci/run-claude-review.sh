#!/usr/bin/env bash
set -euo pipefail

PROMPT_FILE="/tmp/claude-review-prompt.md"
MCP_CONFIG="/tmp/claude-mcp.json"
SETTINGS_FILE=".claude/ci-code-review-settings.json"
OUTPUT_FILE="${CI_PROJECT_DIR}/claude-review-result.json"

MODEL_FLAG=()
if [[ -n "${CLAUDE_MODEL:-}" ]]; then
  MODEL_FLAG=(--model "$CLAUDE_MODEL")
fi

claude \
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
