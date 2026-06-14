#!/usr/bin/env bash
set -euo pipefail

echo "setup-claude-review.sh v2 (ANTHROPIC_AUTH_TOKEN only)"
echo "Pipeline commit: ${CI_COMMIT_SHA:-unknown}"

# Resolve GitLab API URL and token for the GitLab MCP server.
export GITLAB_API_URL="${GITLAB_API_URL:-${CI_API_V4_URL}}"
export GITLAB_PERSONAL_ACCESS_TOKEN="${GITLAB_ACCESS_TOKEN:-${CI_JOB_TOKEN}}"

# Anthropic auth via CI/CD variables (gateway or direct endpoint).
if [[ -z "${ANTHROPIC_AUTH_TOKEN:-}" ]]; then
  echo "ANTHROPIC_AUTH_TOKEN is not available in this job." >&2
  echo "If you already added it under Settings → CI/CD → Variables, check:" >&2
  echo "  - Variable key is exactly ANTHROPIC_AUTH_TOKEN" >&2
  echo "  - Protected variables only apply to protected branches/tags" >&2
  echo "  - Environment-scoped variables require a matching environment on the job" >&2
  echo "  - This pipeline must run code that expects ANTHROPIC_AUTH_TOKEN (not ANTHROPIC_API_KEY)" >&2
  exit 1
fi
export ANTHROPIC_AUTH_TOKEN
export ANTHROPIC_MODEL
export JIRA_PROJECT_KEY
[[ -n "${ANTHROPIC_BASE_URL:-}" ]] && export ANTHROPIC_BASE_URL
echo "Anthropic auth configured${ANTHROPIC_BASE_URL:+, ANTHROPIC_BASE_URL set}"
: "${JIRA_BASE_URL:?Set JIRA_BASE_URL (e.g. https://your-org.atlassian.net)}"
: "${JIRA_EMAIL:?Set JIRA_EMAIL}"
: "${JIRA_API_TOKEN:?Set JIRA_API_TOKEN as a masked CI/CD variable}"

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
