"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Terminal as TerminalIcon,
  KanbanSquare,
  GitBranch,
  Star,
  GitCommit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProject, useUpdateProject } from "@/hooks/use-projects";
import { useActiveProjectStore } from "@/store/active-project-store";
import { FileTree } from "./file-tree";

export function ProjectDetail({ projectId }: { projectId: string }) {
  const { data: project, isLoading, error } = useProject(projectId);
  const updateMut = useUpdateProject();
  const setActive = useActiveProjectStore((s) => s.setActive);
  const activeId = useActiveProjectStore((s) => s.activeProjectId);
  const router = useRouter();

  // 상세 진입 시 자동으로 활성 프로젝트로 설정
  useEffect(() => {
    if (project && activeId !== project.id) {
      setActive(project.id, project.path);
    }
  }, [project, activeId, setActive]);

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-[var(--color-foreground-muted)]">
        불러오는 중…
      </div>
    );
  }
  if (error || !project) {
    return (
      <div className="p-6 text-sm text-[var(--color-danger)]">
        프로젝트를 찾을 수 없습니다.
      </div>
    );
  }

  const openTerminal = () => {
    router.push(
      `/terminal?newTabCwd=${encodeURIComponent(project.path)}`,
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      {/* 헤더 */}
      <header className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{project.name}</h1>
            <button
              onClick={() =>
                updateMut.mutate({
                  id: project.id,
                  isFavorite: !project.isFavorite,
                })
              }
              className={`p-1 rounded hover:bg-[var(--color-surface-hover)] ${
                project.isFavorite
                  ? "text-[var(--color-warning)]"
                  : "text-[var(--color-foreground-dim)]"
              }`}
              aria-label="즐겨찾기"
              title="즐겨찾기"
            >
              <Star
                size={14}
                fill={project.isFavorite ? "currentColor" : "none"}
              />
            </button>
            {project.isGitRepo && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-success)] bg-[var(--color-success)]/15 px-2 py-0.5 rounded">
                <GitCommit size={11} /> git repo
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[var(--color-foreground-muted)] font-mono break-all">
            {project.path}
          </p>
        </div>
      </header>

      {/* 액션 */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={openTerminal}>
          <TerminalIcon size={14} /> 터미널 열기
        </Button>
        <Button variant="outline" disabled title="Cycle 3 예정">
          <KanbanSquare size={14} /> 칸반 (예정)
        </Button>
        <Button variant="outline" disabled title="Cycle 4 예정">
          <GitBranch size={14} /> Git (예정)
        </Button>
      </div>

      {/* 파일 트리 */}
      <section>
        <h2 className="mb-2 text-xs font-semibold text-[var(--color-foreground-muted)] uppercase tracking-wider">
          파일
        </h2>
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/30">
          <FileTree projectId={project.id} />
        </div>
      </section>
    </div>
  );
}
