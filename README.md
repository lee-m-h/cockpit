# 🛩 Cockpit

**통합 개발 워크벤치** — 분할 터미널, 칸반, Git 저장소 관리를 한 화면에서.

F&F 팀 내부용 개발 도구로, 기존에 분리되어 있던 `claude-chat` · `claude-kanban` · `git-pilot`의 기능을 **단일 Next.js 앱**으로 합친 것입니다.

## ✨ 기능

### 현재 (Cycle 1 + 2)
- 🗂️ **프로젝트 허브** (`/projects`) — 로컬 폴더를 프로젝트로 등록, 폴더로 그룹핑, 즐겨찾기, 파일 트리 탐색
- 🖥️ **분할 가능한 멀티 터미널** — xterm.js + node-pty 기반 진짜 pty 세션. 좌우/상하 자유 분할, 탭 여러 개
- 🔗 **활성 프로젝트 연동** — 사이드바 하단 배지에서 활성 프로젝트 전환. 새 터미널 탭이 자동으로 해당 cwd에서 시작
- 🎨 다크 테마 기본, 접히는 사이드바
- ⌨️ 단축키: `⌘T` 새 탭, `⌘W` 탭 닫기

### Coming Soon
- 📋 **Kanban** (Cycle 3) — 프로젝트별 티켓 보드 + Claude 자동 실행 훅 (기존 claude-kanban 이식)
- 🌿 **Git** (Cycle 4) — 커밋 그래프, 브랜치, diff 뷰어 (기존 git-pilot 이식)
- 📦 Electron 데스크탑 앱 (.dmg 배포)

## 🚀 빠른 시작

### 요구사항
- macOS (Linux 호환, Windows는 추후)
- **Node.js 20+** (권장: `nvm` 또는 `volta`로 관리)
- **pnpm** (자동 설치됨)
- **Claude CLI** (`claude` 명령) — 터미널에서 Claude를 쓰려면 별도 설치·인증 필요
  ```bash
  # 설치 안내: https://docs.claude.com/claude-code
  ```

### 설치 & 실행

```bash
git clone <repo-url> cockpit
cd cockpit
./start.sh
```

끝. 자동으로:
1. 의존성 설치 (pnpm)
2. Prisma 클라이언트 생성 + DB 마이그레이션
3. 백그라운드로 Next.js 서버 기동 (기본 포트 `4000`)
4. 브라우저 자동 오픈 → http://127.0.0.1:4000

### 운영 명령

```bash
./start.sh            # 백그라운드 시작 + 브라우저 오픈
./start.sh --fg       # 포그라운드 실행 (Ctrl+C로 중지)
./start.sh --stop     # 중지
tail -f logs/cockpit.log   # 실시간 로그
```

### 환경 변수 (`.env.local`)

`start.sh` 첫 실행 시 `.env.example`을 복사해 `.env.local`이 생성됩니다. 주요 항목:

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | `4000` | HTTP/WebSocket 포트 |
| `HOST` | `127.0.0.1` | 바인딩 주소 (외부 노출 시 `0.0.0.0` — 보안 주의) |
| `SHELL_PATH` | `/bin/zsh` | 터미널 기본 셸 (화이트리스트: zsh, bash, sh) |
| `DEFAULT_CWD` | `$HOME` | 새 터미널 기본 작업 디렉토리 |
| `DATABASE_URL` | `file:./prisma/dev.db` | SQLite DB 경로 |

## 🏗 스택

| 영역 | 라이브러리 |
|------|-----------|
| 프레임워크 | Next.js 15 (App Router) + custom server |
| UI | React 19, TypeScript, Tailwind CSS 4 |
| 터미널 | @xterm/xterm + node-pty + WebSocket |
| 분할 | react-resizable-panels |
| 상태 | Zustand |
| DB | SQLite + Prisma |
| 아이콘 | lucide-react |

## 📁 프로젝트 구조

```
cockpit/
├── server.ts                  # Next + WebSocket 통합 서버
├── prisma/schema.prisma       # SQLite 스키마
├── start.sh                   # 팀 공유용 실행 스크립트
├── src/
│   ├── app/                   # Next App Router (layout, pages, api)
│   ├── components/
│   │   ├── layout/            # AppShell, Sidebar
│   │   └── terminal/          # Workspace, Tabs, Split, Pane
│   ├── server/
│   │   ├── pty-manager.ts     # pty 프로세스 관리
│   │   └── ws-handler.ts      # WebSocket 핸들러
│   ├── store/                 # Zustand 스토어
│   ├── lib/                   # prisma, ws-client, utils
│   └── types/
└── docs/
```

## 🛠 개발

```bash
pnpm dev              # tsx로 server.ts 실행 (HMR 지원)
pnpm typecheck        # 타입 체크만
pnpm lint
pnpm prisma:migrate   # 스키마 변경 후 마이그레이션
```

## 🩹 트러블슈팅

### `node-pty` 설치 실패
네이티브 바이너리 빌드가 필요합니다.
- macOS: `xcode-select --install`
- Linux: `apt install build-essential python3`

### 포트 충돌
다른 앱이 4000 포트를 쓰는 경우:
```bash
PORT=4001 ./start.sh
```

### 좀비 pty 프로세스
서버가 비정상 종료되면 pty가 남을 수 있습니다:
```bash
pkill -f "zsh.*COCKPIT_SESSION"
```

## 🔒 보안 주의

- 기본값은 **`127.0.0.1` 로컬 바인딩** — 외부 접근 불가
- 사내 서버에 띄우더라도 `HOST=0.0.0.0` 설정 시 **터미널 접근이 곧 서버 접근**임. 공유 환경에서는 사용 금지.
- WebSocket origin 체크로 same-origin만 허용
- 셸은 `/bin/zsh`, `/bin/bash`, `/bin/sh` 화이트리스트

## 📖 PDCA 문서

이 프로젝트는 PDCA 사이클로 구현되었습니다.

- [Plan](../docs/pdca/TASK-20260415-1/plan.md)
- [Design](../docs/pdca/TASK-20260415-1/design.md)
- Report (Check 완료 후 생성)

## 📝 라이선스

F&F 내부 사용 전용. 외부 배포 금지.
