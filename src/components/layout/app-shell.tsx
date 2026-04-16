"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

// 터미널 워크스페이스는 AppShell 하위에 항상 마운트되어 있으며,
// /terminal 라우트가 아닐 때 hidden으로만 가려진다.
// 이렇게 하면 다른 페이지로 이동했다가 돌아와도 xterm/WebSocket이 살아있어 출력이 보존된다.
const TerminalWorkspace = dynamic(
  () =>
    import("../terminal/terminal-workspace").then((m) => m.TerminalWorkspace),
  { ssr: false },
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onTerminal = pathname === "/terminal";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-background)] text-[var(--color-foreground)]">
      <Sidebar />
      <main className="flex-1 min-w-0 min-h-0 relative flex flex-col">
        {/* 페이지 컨텐츠 — 터미널 라우트일 때는 숨김 */}
        <div
          className={cn(
            "flex-1 min-w-0 min-h-0 flex flex-col",
            onTerminal && "hidden",
          )}
        >
          {children}
        </div>
        {/* 터미널 — 항상 마운트, 터미널 라우트가 아니면 숨김 */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col",
            !onTerminal && "hidden",
          )}
        >
          <TerminalWorkspace />
        </div>
      </main>
    </div>
  );
}
