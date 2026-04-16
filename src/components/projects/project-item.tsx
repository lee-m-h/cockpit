"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star, MoreHorizontal, Folder, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  useDeleteProject,
  useUpdateProject,
} from "@/hooks/use-projects";
import { useActiveProjectStore } from "@/store/active-project-store";
import { cn } from "@/lib/utils";
import type { Project, ProjectFolder } from "@/types/project";

interface Props {
  project: Project;
  folders: ProjectFolder[];
  onEdit: (p: Project) => void;
}

export function ProjectItem({ project, folders, onEdit }: Props) {
  const pathname = usePathname();
  const isActive = pathname === `/projects/${project.id}`;
  const activeId = useActiveProjectStore((s) => s.activeProjectId);
  const setActive = useActiveProjectStore((s) => s.setActive);
  const updateMut = useUpdateProject();
  const deleteMut = useDeleteProject();

  const isActiveProject = activeId === project.id;

  const toggleFav = () =>
    updateMut.mutate({ id: project.id, isFavorite: !project.isFavorite });

  const moveToFolder = (folderId: string | null) =>
    updateMut.mutate({ id: project.id, folderId });

  const remove = () => {
    if (!confirm(`프로젝트 "${project.name}"을(를) 삭제할까요?`)) return;
    if (isActiveProject) setActive(null, null);
    deleteMut.mutate(project.id);
  };

  const revealInFinder = async () => {
    try {
      await fetch("/api/system/open", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: project.path }),
      });
    } catch {
      // ignore
    }
  };

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
        isActive
          ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
          : "text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)]",
      )}
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFav();
        }}
        className={cn(
          "p-0.5 rounded hover:bg-[var(--color-surface-hover)] flex-shrink-0",
          project.isFavorite
            ? "text-[var(--color-warning)]"
            : "text-[var(--color-foreground-dim)] opacity-0 group-hover:opacity-100",
        )}
        aria-label={project.isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}
        title={project.isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}
      >
        <Star size={12} fill={project.isFavorite ? "currentColor" : "none"} />
      </button>

      <span className="flex-1 min-w-0 truncate">{project.name}</span>

      {isActiveProject && (
        <span className="text-[10px] text-[var(--color-accent)] bg-[var(--color-accent)]/15 px-1.5 rounded">
          active
        </span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="p-0.5 rounded text-[var(--color-foreground-dim)] hover:bg-[var(--color-surface-hover)] opacity-0 group-hover:opacity-100"
            aria-label="메뉴"
          >
            <MoreHorizontal size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => setActive(project.id, project.path)}
          >
            활성 프로젝트로 설정
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onEdit(project)}>
            이름·폴더 수정
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={toggleFav}>
            {project.isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={revealInFinder}>
            <ExternalLink size={12} />
            파일 탐색기에서 열기
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Folder size={14} /> 폴더 이동
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onSelect={() => moveToFolder(null)}>
                (미분류)
              </DropdownMenuItem>
              {folders.map((f) => (
                <DropdownMenuItem
                  key={f.id}
                  onSelect={() => moveToFolder(f.id)}
                >
                  {f.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={remove}
            className="text-[var(--color-danger)]"
          >
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Link>
  );
}
