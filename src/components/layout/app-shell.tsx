"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
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

/** ⌘+숫자 단축키 매핑 */
const NAV_SHORTCUTS: Record<string, string> = {
  "1": "/projects",
  "2": "/terminal",
  "3": "/kanban",
  "4": "/git",
  "5": "/settings",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const onTerminal = pathname === "/terminal";

  // ⌘+1~5 단축키로 탭 전환 (Mac: Cmd, Windows/Linux: Ctrl)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.shiftKey || e.altKey) return;
      const target = NAV_SHORTCUTS[e.key];
      if (!target) return;
      // input/textarea/contenteditable에서는 무시
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      router.push(target);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

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
