"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Terminal as TerminalIcon,
  KanbanSquare,
  GitBranch,
  PanelLeftClose,
  PanelLeft,
  Plane,
  FolderKanban,
  Settings as SettingsIcon,
} from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import { ActiveProjectBadge } from "./active-project-badge";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/terminal", label: "Terminal", icon: TerminalIcon },
  { href: "/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/git", label: "Git", icon: GitBranch },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen border-r border-[var(--color-border)] bg-[var(--color-surface)]",
        "transition-[width] duration-150 ease-out",
        collapsed ? "w-14" : "w-56",
      )}
    >
      {/* 헤더: 로고 + 접기 */}
      <div className="flex items-center justify-between h-14 px-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded bg-[var(--color-accent)]/20 flex items-center justify-center flex-shrink-0">
            <Plane size={18} className="text-[var(--color-accent)]" />
          </div>
          {!collapsed && (
            <span className="font-semibold truncate">Cockpit</span>
          )}
        </div>
        <button
          onClick={toggle}
          className="p-1.5 rounded hover:bg-[var(--color-surface-hover)] text-[var(--color-foreground-muted)] flex-shrink-0"
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          title={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* 내비게이션 */}
      <nav className="flex-1 p-2 flex flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                  : "text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]",
                collapsed && "justify-center px-0",
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* 활성 프로젝트 배지 */}
      <ActiveProjectBadge collapsed={collapsed} />

      {/* 푸터 */}
      {!collapsed && (
        <div className="p-3 border-t border-[var(--color-border)] text-[10px] text-[var(--color-foreground-dim)]">
          v{process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"}
        </div>
      )}
    </aside>
  );
}
