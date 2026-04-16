"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useTickets, useUpdateTicket } from "@/hooks/use-tickets";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Ticket, TicketStatus } from "@/types/ticket";
import { KanbanColumn } from "./column";
import { TicketCard } from "./ticket-card";
import { TicketDialog } from "./ticket-dialog";
import { JiraPanel } from "./jira-panel";

const COLUMNS: { status: TicketStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "in_progress", label: "In Progress" },
  { status: "review", label: "Review" },
  { status: "done", label: "Done" },
];

interface Project {
  id: string;
  name: string;
  path: string;
}

interface Props {
  projectId: string | null; // null = 전체 보기
  projectName: string;
  projects?: Project[];
  onProjectChange?: (id: string | null) => void;
}

export function KanbanBoard({
  projectId,
  projectName,
  projects,
  onProjectChange,
}: Props) {
  const { data, isLoading } = useTickets(projectId);
  const updateMut = useUpdateTicket(projectId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [createStatus, setCreateStatus] = useState<TicketStatus>("backlog");
  const [activeId, setActiveId] = useState<string | null>(null);
  // Jira 이슈 임포트용
  const [importIssue, setImportIssue] = useState<{
    key: string;
    summary: string;
    description: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const tickets = data?.tickets ?? [];
  const activeTicket = tickets.find((t) => t.id === activeId) ?? null;
  const showProjectBadge = !projectId; // 전체 보기일 때 프로젝트 뱃지 표시

  const byStatus = (s: TicketStatus) =>
    tickets
      .filter((t) => t.status === s)
      .sort(
        (a, b) =>
          a.order - b.order || a.createdAt.localeCompare(b.createdAt),
      );

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const active = e.active;
    const over = e.over;
    if (!over) return;

    const draggedTicket = tickets.find((t) => t.id === active.id);
    if (!draggedTicket) return;

    const overData = over.data?.current as
      | { type?: "column"; status?: TicketStatus; ticket?: Ticket }
      | undefined;
    const targetStatus: TicketStatus | undefined =
      overData?.type === "column"
        ? overData.status
        : (overData?.ticket?.status as TicketStatus | undefined);

    if (!targetStatus || targetStatus === draggedTicket.status) return;

    updateMut.mutate({ id: draggedTicket.id, status: targetStatus });
  };

  const openCreate = (status: TicketStatus) => {
    setEditing(null);
    setImportIssue(null);
    setCreateStatus(status);
    setDialogOpen(true);
  };
  const openEdit = (t: Ticket) => {
    setEditing(t);
    setImportIssue(null);
    setDialogOpen(true);
  };

  /** Jira 패널에서 임포트 시 호출 */
  const handleJiraImport = (issue: {
    key: string;
    summary: string;
    description: string;
  }) => {
    setEditing(null);
    setImportIssue(issue);
    setCreateStatus("backlog");
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3 min-w-0">
          {/* 프로젝트 드롭다운 */}
          {projects && onProjectChange && (
            <select
              value={projectId ?? "__all__"}
              onChange={(e) =>
                onProjectChange(
                  e.target.value === "__all__" ? null : e.target.value,
                )
              }
              className="text-xs rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="__all__">전체</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <div className="min-w-0">
            <h1 className="text-base font-semibold truncate">{projectName}</h1>
            <div className="text-[10px] text-[var(--color-foreground-dim)]">
              {tickets.length} tickets
            </div>
          </div>
        </div>
        {projectId && (
          <Button size="sm" onClick={() => openCreate("backlog")}>
            <Plus size={14} /> 새 티켓
          </Button>
        )}
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-[var(--color-foreground-muted)]">
          불러오는 중…
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <div className="flex-1 min-h-0 grid grid-cols-4 gap-3 p-3">
              {COLUMNS.map((c) => (
                <KanbanColumn
                  key={c.status}
                  status={c.status}
                  label={c.label}
                  tickets={byStatus(c.status)}
                  projectId={projectId ?? ""}
                  showProjectBadge={showProjectBadge}
                  onCreate={projectId ? openCreate : undefined}
                  onEdit={openEdit}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTicket ? (
                <div className="opacity-90 rotate-1">
                  <TicketCard
                    ticket={activeTicket}
                    projectId={projectId ?? ""}
                    onEdit={() => {}}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          {/* Jira 미해결 이슈 사이드 패널 */}
          {projectId && (
            <JiraPanel onImport={handleJiraImport} />
          )}
        </div>
      )}

      {projectId && (
        <TicketDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          projectId={projectId}
          ticket={editing}
          defaultStatus={editing ? undefined : createStatus}
          importIssue={importIssue}
        />
      )}
    </div>
  );
}
