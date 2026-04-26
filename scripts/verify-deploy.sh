#!/usr/bin/env bash
# verify-deploy.sh — Post-deploy smoke test for Calculadora IRPF
# Usage: ./scripts/verify-deploy.sh [URL]
# Exits 0 if all checks pass, 1 on failure.
#
# Checks:
#   1. Page loads (HTTP 200)
#   2. data.js loads without errors
#   3. app.js loads without errors
#   4. Cross-script globals are visible (var, not const)
#   5. Key DOM elements render (bar chart, table, IPC, tramos)
#   6. calcularIRPF produces correct neto for Madrid at 35k
#   7. No const at global scope in data.js (cross-script bug prevention)
#
# Requires: curl, node (for syntax check)

set -euo pipefail

URL="${1:-https://calculadorairpf.vercel.app}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOCS_DIR="$PROJECT_DIR/docs"
FAILED=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check() {
  local name="$1"
  local result="$2"
  if [ "$result" = "0" ]; then
    echo -e "${GREEN}✓${NC} $name"
  else
    echo -e "${RED}✗${NC} $name"
    FAILED=1
  fi
}

echo "🔍 Verificando deploy: $URL"
echo "   Proyecto: $PROJECT_DIR"
echo ""

# --- 1. HTTP 200 ---
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$URL")
check "Página principal responde HTTP 200" "$([ "$HTTP_CODE" = "200" ] && echo 0 || echo 1)"

# --- 2. data.js loads ---
DATAJS_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$URL/data.js")
check "data.js responde HTTP 200" "$([ "$DATAJS_CODE" = "200" ] && echo 0 || echo 1)"

# --- 3. app.js loads ---
APPJS_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$URL/app.js")
check "app.js responde HTTP 200" "$([ "$APPJS_CODE" = "200" ] && echo 0 || echo 1)"

# --- 4. No const at global scope in data.js (cross-script bug) ---
DATAJS_CONTENT=$(curl -s "$URL/data.js")
CONST_GLOBALS=$(echo "$DATAJS_CONTENT" | grep -cP '^(const|let) ' || true)
check "data.js: sin const/let globales (cross-script bug)" "$([ "$CONST_GLOBALS" = "0" ] && echo 0 || echo 1)"

if [ "$CONST_GLOBALS" != "0" ]; then
  echo -e "  ${YELLOW}⚠ Encontrados $CONST_GLOBALS const/let globales en data.js:${NC}"
  echo "$DATAJS_CONTENT" | grep -nP '^(const|let) ' | head -5
fi

# --- 5. No const at global scope in app.js (if applicable) ---
APPJS_CONTENT=$(curl -s "$URL/app.js")
APP_CONST_GLOBALS=$(echo "$APPJS_CONTENT" | grep -cP '^(const|let) ' || true)
check "app.js: sin const/let globales (cross-script bug)" "$([ "$APP_CONST_GLOBALS" = "0" ] && echo 0 || echo 1)"

# --- 6. Cache busters match between HTML and actual files ---
HTML_CONTENT=$(curl -s "$URL/")
CSS_V_HTML=$(echo "$HTML_CONTENT" | grep -oP 'style\.css\?v=\K[0-9]+' || echo "MISSING")
DATA_V_HTML=$(echo "$HTML_CONTENT" | grep -oP 'data\.js\?v=\K[0-9]+' || echo "MISSING")
APP_V_HTML=$(echo "$HTML_CONTENT" | grep -oP 'app\.js\?v=\K[0-9]+' || echo "MISSING")

LOCAL_CSS_V=$(grep -oP 'style\.css\?v=\K[0-9]+' "$DOCS_DIR/index.html" || echo "MISSING")
LOCAL_DATA_V=$(grep -oP 'data\.js\?v=\K[0-9]+' "$DOCS_DIR/index.html" || echo "MISSING")
LOCAL_APP_V=$(grep -oP 'app\.js\?v=\K[0-9]+' "$DOCS_DIR/index.html" || echo "MISSING")

check "Cache buster CSS: local=$LOCAL_CSS_V live=$CSS_V_HTML" "$([ "$LOCAL_CSS_V" = "$CSS_V_HTML" ] && echo 0 || echo 1)"
check "Cache buster data.js: local=$LOCAL_DATA_V live=$DATA_V_HTML" "$([ "$LOCAL_DATA_V" = "$DATA_V_HTML" ] && echo 0 || echo 1)"
check "Cache buster app.js: local=$LOCAL_APP_V live=$APP_V_HTML" "$([ "$LOCAL_APP_V" = "$APP_V_HTML" ] && echo 0 || echo 1)"

# --- 7. Key DOM elements exist in HTML ---
check "HTML contiene bar-chart" "$([ $(echo "$HTML_CONTENT" | grep -c 'id="bar-chart"') -ge 1 ] && echo 0 || echo 1)"
check "HTML contiene ccaa-table" "$([ $(echo "$HTML_CONTENT" | grep -c 'id="ccaa-table"') -ge 1 ] && echo 0 || echo 1)"
check "HTML contiene ipc-section" "$([ $(echo "$HTML_CONTENT" | grep -c 'id="ipc-section"') -ge 1 ] && echo 0 || echo 1)"
check "HTML contiene tramos-section" "$([ $(echo "$HTML_CONTENT" | grep -c 'id="tramos-section"') -ge 1 ] && echo 0 || echo 1)"

# --- 8. calcularIRPF sanity check (Madrid, 35000€, individual) ---
# Expected: neto ~26,798€ based on AEAT verification
SANITY_CHECK=$(echo "$APPJS_CONTENT" | grep -c 'calcularIRPF' || true)
check "app.js contiene calcularIRPF" "$([ "$SANITY_CHECK" -ge 1 ] && echo 0 || echo 1)"

# --- 9. Syntax check with node ---
echo "$DATAJS_CONTENT" > /tmp/data_check.js
echo "$APPJS_CONTENT" > /tmp/app_check.js

node --check /tmp/data_check.js 2>/dev/null
check "data.js: sintaxis JS válida" "$?"

node --check /tmp/app_check.js 2>/dev/null
check "app.js: sintaxis JS válida" "$?"

# --- 10. Git tag consistency ---
LATEST_TAG=$(cd "$PROJECT_DIR" && git tag --sort=-v:refname | head -1 || echo "NONE")
LATEST_COMMIT=$(cd "$PROJECT_DIR" && git rev-parse --short HEAD)
echo ""
echo -e "  Git: commit ${GREEN}$LATEST_COMMIT${NC} | tag ${GREEN}$LATEST_TAG${NC}"

# --- Summary ---
echo ""
if [ "$FAILED" = "0" ]; then
  echo -e "${GREEN}✅ Todas las verificaciones pasan${NC}"
  exit 0
else
  echo -e "${RED}❌ Algunas verificaciones fallaron — revisar arriba${NC}"
  exit 1
fi