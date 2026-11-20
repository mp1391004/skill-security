#!/usr/bin/env bash
# skill-security — lệnh kiểm nhanh. Chạy bằng bash (macOS, Linux, Git Bash trên Windows).
#   bash scripts/quick-check.sh local [http://localhost:3000]   # Cổng 1, trước deploy, chạy ở gốc repo
#   bash scripts/quick-check.sh prod  <domain>                   # Cổng 2, sau deploy (vd: shop.example.com)
# Không bao giờ in giá trị khoá — chỉ in tên file / mã trả về / số lượng.

set -u
MODE="${1:-}"
PASS=0; FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
info() { echo "  ℹ️  $1"; }
KEY_RE='PAYOS_|STRIPE_SECRET|GOCSPX-|AIza[0-9A-Za-z_-]{20,}|ghp_[0-9A-Za-z]{20,}|github_pat_|sk-[0-9A-Za-z_-]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-'

local_check() {
  BASE="${1:-http://localhost:3000}"
  echo "== Cổng 1 — localhost ($BASE) =="

  echo "[Khoá & Git]"
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    tracked=$(git ls-files | grep -E "(^|/)\.env($|\.)" | grep -v "\.env\.example$" || true)
    [ -z "$tracked" ] && ok ".env không nằm trong git" || bad ".env đang nằm trong git: $tracked"
    git check-ignore -q .env && ok ".gitignore chặn .env" || bad ".gitignore chưa chặn .env"
    if command -v gitleaks >/dev/null 2>&1; then
      gitleaks protect --staged --no-banner --redact >/dev/null 2>&1 && ok "gitleaks: thứ sắp commit sạch" || bad "gitleaks: thứ sắp commit có secret"
      gitleaks detect --no-banner --redact >/dev/null 2>&1 && ok "gitleaks: lịch sử sạch" || bad "gitleaks: lịch sử có secret → tạo khoá mới trước (02 §5)"
    else
      bad "chưa cài gitleaks → dừng, cài theo 02 §4a"
    fi
    [ -f .pre-commit-config.yaml ] && grep -q gitleaks .pre-commit-config.yaml && ok "có hook pre-commit gitleaks" || bad "thiếu .pre-commit-config.yaml với gitleaks"
    ls .github/workflows/*.yml >/dev/null 2>&1 && grep -lq gitleaks .github/workflows/*.yml && ok "có workflow quét secret trên GitHub" || bad "thiếu workflow secrets-scan"
  else
    bad "chưa phải git repo"
  fi

  echo "[Rò khoá ra client]"
  hits=$(grep -RIlE --exclude-dir=node_modules "$KEY_RE" .next/static public 2>/dev/null | head -5 || true)
  [ -z "$hits" ] && ok "không thấy khoá trong .next/static, public" || bad "có dấu khoá trong: $hits"

  echo "[API]"
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/admin/orders" 2>/dev/null || echo 000)
  case "$code" in 401|403) ok "API admin chặn người chưa đăng nhập ($code)";;
    000) info "không gọi được $BASE — app chưa chạy?";;
    404) info "/api/admin/orders không tồn tại — tự thử route admin khác";;
    *) bad "API admin trả $code khi chưa đăng nhập";; esac
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/payos/webhook" -H 'Content-Type: application/json' -d '{"fake":true}' 2>/dev/null || echo 000)
  case "$code" in 400|401|403) ok "webhook giả bị từ chối ($code)";;
    000|404) info "không có /api/payos/webhook — bỏ qua nếu không thu tiền";;
    *) bad "webhook giả trả $code → phải verify chữ ký (04 A1)";; esac

  echo "[Thư viện]"
  if [ -f package.json ] && command -v npm >/dev/null 2>&1; then
    npm audit --omit=dev --audit-level=high >/dev/null 2>&1 && ok "npm audit: không có high/critical" || bad "npm audit còn high/critical (xem: npm audit --omit=dev)"
  fi
}

prod_check() {
  D="${1:?Thiếu domain, vd: bash scripts/quick-check.sh prod shop.example.com}"
  D="${D#http://}"; D="${D#https://}"; D="${D%%/*}"
  echo "== Cổng 2 — https://$D =="

  code=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" "http://$D/")
  case "$code" in 301*https*|308*https*) ok "http → https ($code)";; *) bad "http chưa ép sang https ($code)";; esac

  H=$(curl -sI "https://$D/" | tr -d '\r')
  for h in strict-transport-security x-content-type-options referrer-policy x-frame-options permissions-policy; do
    echo "$H" | grep -qi "^$h:" && ok "có $h" || bad "thiếu $h"
  done
  echo "$H" | grep -qi "^x-powered-by:" && bad "còn X-Powered-By" || ok "không lộ X-Powered-By"

  A=$(curl -sI "https://$D/admin" | tr -d '\r')
  echo "$A" | grep -qi "^x-robots-tag:.*noindex" && ok "/admin noindex" || bad "/admin thiếu X-Robots-Tag: noindex"
  echo "$A" | grep -qi "^cache-control:.*no-store" && ok "/admin không cache" || bad "/admin thiếu Cache-Control: no-store"

  n=$(curl -s "https://$D/" | grep -ciE "$KEY_RE|localhost" || true)
  [ "${n:-0}" = "0" ] && ok "trang chủ không rò khoá / localhost" || bad "trang chủ có $n dòng nghi rò khoá hoặc localhost"

  curl -s "https://$D/robots.txt" | grep -qiE "Disallow:\s*/admin" && ok "robots.txt chặn /admin" || bad "robots.txt chưa Disallow /admin"
}

case "$MODE" in
  local) shift; local_check "${1:-}";;
  prod)  shift; prod_check "${1:-}";;
  *) echo "Dùng: bash scripts/quick-check.sh local [url] | prod <domain>"; exit 2;;
esac

echo
echo "Kết quả: $PASS đạt · $FAIL chưa đạt"
echo "Các mốc cần thao tác thật (IDOR, sửa giá, XSS, upload, rate limit) làm tay theo references/05-launch-gate.md"
[ "$FAIL" -eq 0 ]
