#!/usr/bin/env bash
set -euo pipefail

# Resolve GitLab API URL and token for the GitLab MCP server.
export GITLAB_API_URL="${GITLAB_API_URL:-${CI_API_V4_URL}}"
export GITLAB_PERSONAL_ACCESS_TOKEN="${GITLAB_ACCESS_TOKEN:-${CI_JOB_TOKEN}}"

# Anthropic auth: direct API key or gateway (AUTH_TOKEN + optional BASE_URL).
if [[ -n "${ANTHROPIC_AUTH_TOKEN:-}" ]]; then
  export ANTHROPIC_AUTH_TOKEN
  [[ -n "${ANTHROPIC_BASE_URL:-}" ]] && export ANTHROPIC_BASE_URL
  # Gateway route: Claude Code prefers API_KEY when set; clear it if unset in CI.
  export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
  echo "Anthropic auth: gateway (ANTHROPIC_AUTH_TOKEN set${ANTHROPIC_BASE_URL:+, ANTHROPIC_BASE_URL configured})"
elif [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
  export ANTHROPIC_API_KEY
  [[ -n "${ANTHROPIC_BASE_URL:-}" ]] && export ANTHROPIC_BASE_URL
  echo "Anthropic auth: direct API key${ANTHROPIC_BASE_URL:+, ANTHROPIC_BASE_URL configured}"
else
  echo "Anthropic auth missing. Set ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN in Settings → CI/CD → Variables." >&2
  echo "If variables are marked Protected, the pipeline branch must be protected too." >&2
  exit 1
fi
: "${JIRA_BASE_URL:?Set JIRA_BASE_URL (e.g. https://your-org.atlassian.net)}"
: "${JIRA_EMAIL:?Set JIRA_EMAIL}"
: "${JIRA_API_TOKEN:?Set JIRA_API_TOKEN as a masked CI/CD variable}"
: "${JIRA_PROJECT_KEY:?Set JIRA_PROJECT_KEY (e.g. RANCHER)}"

export JIRA_ISSUE_TYPE="${JIRA_ISSUE_TYPE:-Task}"
export JIRA_LABELS="${JIRA_LABELS:-code-review,claude-ci}"

# Expand env placeholders in the MCP config template.
envsubst '${GITLAB_API_URL} ${GITLAB_PERSONAL_ACCESS_TOKEN} ${JIRA_BASE_URL} ${JIRA_EMAIL} ${JIRA_API_TOKEN}' \
  < ci/mcp.json.template > /tmp/claude-mcp.json

# Expand MR context into the review prompt.
envsubst \
  '${CI_PROJECT_ID} ${CI_PROJECT_PATH} ${CI_MERGE_REQUEST_IID} ${CI_MERGE_REQUEST_TITLE} ${CI_MERGE_REQUEST_SOURCE_BRANCH_NAME} ${CI_MERGE_REQUEST_TARGET_BRANCH_NAME} ${CI_PIPELINE_URL} ${CI_MERGE_REQUEST_PROJECT_URL} ${JIRA_PROJECT_KEY} ${JIRA_ISSUE_TYPE} ${JIRA_LABELS}' \
  < ci/claude-mr-review-prompt.md > /tmp/claude-review-prompt.md

echo "MCP config written to /tmp/claude-mcp.json (gitlab + jira servers)"
