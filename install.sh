#!/usr/bin/env bash
# Cockpit 설치 스크립트
# 사용법: curl -fsSL https://raw.githubusercontent.com/lee-m-h/cockpit/main/install.sh | bash
#
# 하는 일:
# 1. ~/.cockpit 에 clone (이미 있으면 pull)
# 2. cockpit 명령어를 셸 프로파일에 등록
# 3. 바로 실행
set -euo pipefail

INSTALL_DIR="$HOME/.cockpit-app"
REPO="https://github.com/lee-m-h/cockpit.git"
BRANCH="main"

log() { printf "\033[1;34m[cockpit]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[cockpit]\033[0m %s\n" "$*" >&2; }

# ---------- Node.js 체크 ----------
if ! command -v node >/dev/null 2>&1; then
  err "Node.js가 필요합니다. https://nodejs.org 에서 Node 20+ 설치 후 다시 시도하세요."
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  err "Node 20 이상이 필요합니다. 현재: $(node -v)"
  exit 1
fi

# ---------- pnpm 체크 ----------
if ! command -v pnpm >/dev/null 2>&1; then
  log "pnpm 설치 중…"
  npm install -g pnpm
fi

# ---------- Clone / Update ----------
if [[ -d "$INSTALL_DIR/.git" ]]; then
  log "기존 설치 업데이트 중…"
  cd "$INSTALL_DIR"
  git pull --ff-only origin "$BRANCH" 2>/dev/null || {
    log "pull 실패 — 재설치합니다."
    cd "$HOME"
    rm -rf "$INSTALL_DIR"
    git clone "$REPO" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
  }
else
  log "Cockpit 설치 중… ($INSTALL_DIR)"
  rm -rf "$INSTALL_DIR"
  git clone "$REPO" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# ---------- 셸 명령어 등록 ----------
SHELL_CMD='alias cockpit="$HOME/.cockpit-app/start.sh"'
SHELL_PROFILE=""

if [[ -n "${ZSH_VERSION:-}" ]] || [[ "$SHELL" == */zsh ]]; then
  SHELL_PROFILE="$HOME/.zshrc"
elif [[ -n "${BASH_VERSION:-}" ]] || [[ "$SHELL" == */bash ]]; then
  SHELL_PROFILE="$HOME/.bash_profile"
  [[ -f "$HOME/.bashrc" ]] && SHELL_PROFILE="$HOME/.bashrc"
fi

if [[ -n "$SHELL_PROFILE" ]]; then
  if ! grep -q "cockpit-app/start.sh" "$SHELL_PROFILE" 2>/dev/null; then
    echo "" >> "$SHELL_PROFILE"
    echo "# Cockpit" >> "$SHELL_PROFILE"
    echo "$SHELL_CMD" >> "$SHELL_PROFILE"
    log "cockpit 명령어를 $SHELL_PROFILE 에 등록했습니다."
  fi
  # 현재 셸에도 즉시 적용
  eval "$SHELL_CMD"
fi

# ---------- 실행 ----------
log "설치 완료! 실행합니다…"
echo ""
echo "  다음부터는 아무 디렉토리에서나:"
echo ""
echo "    cockpit          # 실행"
echo "    cockpit --stop   # 중지"
echo ""

exec ./start.sh "$@"
