#!/usr/bin/env bash
# Cockpit 간편 실행 스크립트 — 팀원 공유용
#
# 사용법:
#   ./start.sh             # 백그라운드 실행 + 브라우저 오픈
#   ./start.sh --fg        # 포그라운드(터미널 점유) 실행
#   ./start.sh --stop      # 실행 중인 Cockpit 중지
#
set -euo pipefail

cd "$(dirname "$0")"

PID_FILE=".cockpit.pid"
LOG_DIR="logs"
LOG_FILE="$LOG_DIR/cockpit.log"

# ---------- helpers ----------
log() { printf "\033[1;34m[cockpit]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[cockpit]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[cockpit]\033[0m %s\n" "$*" >&2; }

stop_cockpit() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      log "중지 중 (pid=$pid)…"
      kill "$pid" 2>/dev/null || true
      sleep 1
      kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
    log "중지됨."
  else
    warn "실행 중인 Cockpit이 없습니다."
  fi
}

# ---------- stop mode ----------
if [[ "${1:-}" == "--stop" ]]; then
  stop_cockpit
  exit 0
fi

# ---------- auto update ----------
if [[ -d ".git" ]]; then
  log "최신 버전 확인 중…"
  git fetch origin main --quiet 2>/dev/null || true
  LOCAL=$(git rev-parse HEAD 2>/dev/null)
  REMOTE=$(git rev-parse origin/main 2>/dev/null)
  if [[ "$LOCAL" != "$REMOTE" ]]; then
    log "업데이트 발견! 적용 중…"
    git pull --ff-only origin main 2>/dev/null && {
      log "업데이트 완료. 의존성 재설치…"
      pnpm install --frozen-lockfile 2>/dev/null || pnpm install
      pnpm prisma generate >/dev/null
      pnpm prisma migrate deploy 2>/dev/null || true
      log "업데이트 적용 완료!"
    } || warn "자동 업데이트 실패 — 현재 버전으로 실행합니다."
  else
    log "최신 버전입니다."
  fi
fi

# ---------- env check ----------
if ! command -v node >/dev/null 2>&1; then
  err "Node.js가 설치되어 있지 않습니다. https://nodejs.org 에서 Node 20 LTS 이상을 설치하세요."
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  err "Node 20 이상이 필요합니다. 현재 버전: $(node -v)"
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  warn "pnpm이 설치되어 있지 않습니다. npm으로 설치합니다: npm install -g pnpm"
  npm install -g pnpm
fi

# ---------- already running? ----------
if [[ -f "$PID_FILE" ]]; then
  existing_pid=$(cat "$PID_FILE")
  if kill -0 "$existing_pid" 2>/dev/null; then
    log "Cockpit이 이미 실행 중입니다 (pid=$existing_pid)."
    if [[ "${1:-}" != "--fg" ]]; then
      log "브라우저를 엽니다…"
      open "http://127.0.0.1:${PORT:-4000}" 2>/dev/null || true
    fi
    exit 0
  else
    rm -f "$PID_FILE"
  fi
fi

# ---------- install deps ----------
if [[ ! -d "node_modules" ]]; then
  log "의존성을 설치합니다 (pnpm install)…"
  pnpm install
else
  # package.json 변경 감지
  if [[ "package.json" -nt "node_modules/.package-install-stamp" ]] 2>/dev/null || [[ ! -f "node_modules/.package-install-stamp" ]]; then
    log "package.json 변경 감지 — 의존성 재설치…"
    pnpm install
    touch node_modules/.package-install-stamp
  fi
fi

# ---------- env file ----------
# .env는 committed(공통 기본값), .env.local은 개인 오버라이드(optional)
if [[ ! -f ".env" ]]; then
  err ".env 파일이 없습니다. 저장소를 다시 clone하거나 .env.example을 .env.local로 복사하세요."
  exit 1
fi

# ---------- prisma ----------
log "Prisma 클라이언트 생성…"
pnpm prisma generate >/dev/null

log "DB 마이그레이션…"
pnpm prisma migrate deploy 2>/dev/null || pnpm prisma migrate dev --name init --skip-seed

# ---------- run ----------
mkdir -p "$LOG_DIR"
PORT="${PORT:-4000}"
HOST="${HOST:-127.0.0.1}"

if [[ "${1:-}" == "--fg" ]]; then
  log "포그라운드로 실행합니다 (http://$HOST:$PORT). 중지: Ctrl+C"
  exec pnpm dev
fi

log "백그라운드로 실행합니다 (http://$HOST:$PORT)"
# nohup + disown으로 셸 종료 후에도 유지
nohup pnpm dev >"$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
disown || true

# 서버 기동 대기 (최대 30초)
log "기동 대기 중…"
for i in {1..30}; do
  if curl -fs "http://$HOST:$PORT/api/health" >/dev/null 2>&1; then
    log "준비 완료! 브라우저를 엽니다."
    open "http://$HOST:$PORT" 2>/dev/null || true
    log "로그: tail -f $LOG_FILE"
    log "중지: ./start.sh --stop"
    exit 0
  fi
  sleep 1
done

err "서버가 30초 안에 응답하지 않았습니다. 로그를 확인하세요: $LOG_FILE"
exit 1
