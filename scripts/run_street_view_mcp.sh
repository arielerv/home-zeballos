#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="$repo_root/.env"

if [[ ! -f "$env_file" ]]; then
  printf 'Street View MCP: missing %s\n' "$env_file" >&2
  exit 2
fi

key_line="$(grep -m 1 '^GOOGLE_API_KEY=' "$env_file" || true)"
if [[ -z "$key_line" ]]; then
  printf 'Street View MCP: GOOGLE_API_KEY is not set in .env\n' >&2
  exit 2
fi

api_key="${key_line#*=}"
if [[ -z "$api_key" ]]; then
  printf 'Street View MCP: GOOGLE_API_KEY is empty in .env\n' >&2
  exit 2
fi

export API_KEY="$api_key"
exec uv run --no-project --with-requirements "$repo_root/scripts/requirements-mcp.txt" \
  python3 "$repo_root/scripts/street_view_mcp_stdio.py"
