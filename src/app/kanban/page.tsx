"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useActiveProjectStore } from "@/store/active-project-store";
import { useProjects } from "@/hooks/use-projects";
import { KanbanBoard } from "@/components/kanban/board";

export default function KanbanPage() {
  const activeId = useActiveProjectStore((s) => s.activeProjectId);
  const setActive = useActiveProjectStore((s) => s.setActive);
  const { data } = useProjects();
  const projects = data?.projects ?? [];
  const searchParams = useSearchParams();
  const hasTicketParam = !!searchParams?.get("ticket");

  // null = 전체 보기. 알림 클릭 진입(?ticket=...)이면 어떤 프로젝트든 찾을 수 있도록 전체 보기로 시작
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    hasTicketParam ? null : activeId,
  );

  // 선택된 프로젝트가 삭제됐으면 활성 프로젝트로 폴백
  useEffect(() => {
    if (!selectedProjectId) return;
    const exists = projects.find((p) => p.id === selectedProjectId);
    if (!exists) setSelectedProjectId(activeId);
  }, [selectedProjectId, projects, activeId]);

  const handleProjectChange = (id: string | null) => {
    setSelectedProjectId(id);
    if (id) {
      const proj = projects.find((p) => p.id === id);
      if (proj) setActive(id, proj.path);
    }
  };

  const selectedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId) ?? null
    : null;

  return (
    <KanbanBoard
      key={selectedProjectId ?? "__all__"}
      projectId={selectedProjectId}
      projectName={selectedProject?.name ?? "전체 프로젝트"}
      projects={projects}
      onProjectChange={handleProjectChange}
    />
  );
}
