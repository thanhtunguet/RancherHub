#!/usr/bin/env bash
set -euo pipefail

: "${JIRA_BASE_URL:?Set JIRA_BASE_URL}"
: "${JIRA_EMAIL:?Set JIRA_EMAIL}"
: "${JIRA_API_TOKEN:?Set JIRA_API_TOKEN}"
JIRA_WORKLOG_ISSUE_KEY="${JIRA_WORKLOG_ISSUE_KEY:-SCRUM-1}"

TIME_SPENT="${JIRA_WORKLOG_TIME_SPENT:-15m}"
OUTPUT_FILE="${CI_PROJECT_DIR:-.}/claude-review-result.json"
JIRA_BASE_URL="${JIRA_BASE_URL%/}"

findings_count="unknown"
jira_tickets="unknown"
summary="Review completed (no Claude output file)."

if [[ -f "$OUTPUT_FILE" ]]; then
  review_json="$(jq -c '
    if (.result | type) == "string" then
      (.result | fromjson? // empty)
    elif (.result | type) == "object" then
      .result
    else
      empty
    end
  ' "$OUTPUT_FILE" 2>/dev/null || true)"

  if [[ -n "${review_json:-}" ]] && jq -e . >/dev/null 2>&1 <<<"$review_json"; then
    findings_count="$(jq -r '.findings_count // "unknown"' <<<"$review_json")"
    jira_count="$(jq -r '.jira_issues_created | length' <<<"$review_json" 2>/dev/null || echo unknown)"
    jira_tickets="${jira_count}"
    summary="$(jq -r '.summary // empty' <<<"$review_json")"
    if [[ -z "$summary" ]]; then
      if [[ "$findings_count" == "0" ]]; then
        summary="No actionable issues found."
      else
        summary="See merge request review comment for details."
      fi
    fi
  else
    summary="Claude review finished; structured JSON summary was not parsed."
  fi
fi

mr_line=""
if [[ -n "${CI_MERGE_REQUEST_IID:-}" ]]; then
  mr_url="${CI_MERGE_REQUEST_PROJECT_URL:-}/-/merge_requests/${CI_MERGE_REQUEST_IID}"
  mr_line="MR !${CI_MERGE_REQUEST_IID}: ${CI_MERGE_REQUEST_TITLE:-} — ${mr_url}"
else
  mr_line="Branch: ${CI_COMMIT_REF_NAME:-unknown} (${CI_COMMIT_SHA:-unknown})"
fi

comment_text="[Claude Code CI] Automated merge request review
Pipeline: ${CI_PIPELINE_URL:-n/a}
${mr_line}
Findings: ${findings_count} | Jira tickets created: ${jira_tickets}
${summary}"

payload="$(jq -n \
  --arg timeSpent "$TIME_SPENT" \
  --arg text "$comment_text" \
  '{
    timeSpent: $timeSpent,
    comment: {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: $text }]
        }
      ]
    }
  }')"

worklog_url="${JIRA_BASE_URL}/rest/api/3/issue/${JIRA_WORKLOG_ISSUE_KEY}/worklog"
echo "Posting ${TIME_SPENT} worklog to ${JIRA_WORKLOG_ISSUE_KEY}..."

http_code="$(curl -fsS -o /tmp/jira-worklog-response.json -w '%{http_code}' \
  -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -X POST \
  "$worklog_url" \
  -d "$payload")"

if [[ "$http_code" != "200" && "$http_code" != "201" ]]; then
  echo "Jira worklog failed (HTTP ${http_code}):" >&2
  cat /tmp/jira-worklog-response.json >&2 || true
  exit 1
fi

worklog_id="$(jq -r '.id // empty' /tmp/jira-worklog-response.json)"
echo "Worklog posted to ${JIRA_WORKLOG_ISSUE_KEY} (id: ${worklog_id:-ok}, time: ${TIME_SPENT})"
