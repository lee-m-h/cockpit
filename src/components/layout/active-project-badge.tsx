"use client";

import { useEffect } from "react";
import { useProjects } from "@/hooks/use-projects";
import { useActiveProjectStore } from "@/store/active-project-store";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronUp, Star, Plane } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  collapsed: boolean;
}

export function ActiveProjectBadge({ collapsed }: Props) {
  const { data } = useProjects();
  const activeId = useActiveProjectStore((s) => s.activeProjectId);
  const setActive = useActiveProjectStore((s) => s.setActive);

  // stale ID 정리 + 최초 로드 시 기본값 선택
  useEffect(() => {
    if (!data) return;
    if (data.projects.length === 0) {
      if (activeId) setActive(null, null);
      return;
    }
    const exists = data.projects.find((p) => p.id === activeId);
    if (!exists) {
      const preferred =
        data.projects.find((p) => p.isFavorite) ?? data.projects[0];
      setActive(preferred.id, preferred.path);
    } else if (exists.path !== useActiveProjectStore.getState().activeProjectPath) {
      // path 변경 감지 시 동기화
      setActive(exists.id, exists.path);
    }
  }, [data, activeId, setActive]);

  const active = data?.projects.find((p) => p.id === activeId) ?? null;

  if (!data) {
    return null;
  }

  if (data.projects.length === 0) {
    if (collapsed) return null;
    return (
      <div className="p-2 text-[11px] text-[var(--color-foreground-dim)] border-t border-[var(--color-border)]">
        프로젝트 없음
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--color-border)] p-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
              "hover:bg-[var(--color-surface-hover)]",
              "text-left",
            )}
            title={active ? `활성 프로젝트: ${active.name}` : "프로젝트 선택"}
          >
            <div className="w-6 h-6 rounded bg-[var(--color-accent)]/15 flex items-center justify-center flex-shrink-0">
              <Plane size={12} className="text-[var(--color-accent)]" />
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-[var(--color-foreground-dim)] uppercase tracking-wider">
                    Active
                  </div>
                  <div className="truncate text-xs font-medium">
                    {active ? active.name : "선택하세요"}
                  </div>
                </div>
                <ChevronUp size={12} className="text-[var(--color-foreground-dim)] flex-shrink-0" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={collapsed ? "start" : "end"}
          side="top"
          className="w-64"
        >
          <DropdownMenuRadioGroup
            value={activeId ?? ""}
            onValueChange={(v) => {
              const p = data.projects.find((p) => p.id === v);
              if (p) setActive(p.id, p.path);
            }}
          >
            {data.projects
              .slice()
              .sort((a, b) => {
                if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
                return a.name.localeCompare(b.name);
              })
              .map((p) => (
                <DropdownMenuRadioItem key={p.id} value={p.id}>
                  {p.isFavorite && (
                    <Star
                      size={10}
                      className="text-[var(--color-warning)]"
                      fill="currentColor"
                    />
                  )}
                  <span className="truncate">{p.name}</span>
                </DropdownMenuRadioItem>
              ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setActive(null, null)}>
            활성 해제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
