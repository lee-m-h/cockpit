"use client";

import { useState } from "react";
import { useActiveProjectStore } from "@/store/active-project-store";
import { useProjects } from "@/hooks/use-projects";
import { KanbanBoard } from "@/components/kanban/board";

export default function KanbanPage() {
  const activeId = useActiveProjectStore((s) => s.activeProjectId);
  const setActive = useActiveProjectStore((s) => s.setActive);
  const { data } = useProjects();
  const projects = data?.projects ?? [];

  // null = 전체 보기
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    activeId,
  );

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
