"use client";

import { useRouter } from "next/navigation";
import {
  MoreVertical,
  Play,
  RefreshCw,
  Check,
  Pencil,
  Trash2,
  Terminal as TerminalIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  useDeleteTicket,
  useStartTicket,
  useUpdateTicket,
  useReworkTicket,
} from "@/hooks/use-tickets";
import { useTerminalStore, useIsTicketRunning } from "@/store/terminal-store";
import { cn } from "@/lib/utils";
import type { Ticket } from "@/types/ticket";

interface Props {
  ticket: Ticket;
  projectId: string;
  showProjectBadge?: boolean;
  onEdit: (t: Ticket) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
}

export function TicketCard({
  ticket,
  projectId,
  showProjectBadge,
  onEdit,
  dragHandleProps,
  isDragging,
}: Props) {
  const router = useRouter();
  const updateMut = useUpdateTicket(projectId);
  const deleteMut = useDeleteTicket(projectId);
  const startMut = useStartTicket(projectId);
  const reworkMut = useReworkTicket(projectId);
  const createTab = useTerminalStore((s) => s.createTab);
  const isRunning = useIsTicketRunning(ticket.id);

  const runTicket = async () => {
    try {
      const res = await startMut.mutateAsync(ticket.id);
      await createTab({
        cwd: res.cwd,
        initialInput: res.initialInput,
        tabName: ticket.jiraKey ?? ticket.title.slice(0, 20),
        ticketId: ticket.id,
      });
      router.push("/terminal");
    } catch (err) {
      alert(`실행 실패: ${(err as Error).message}`);
    }
  };

  const markDone = () =>
    updateMut.mutate({ id: ticket.id, status: "done" });

  const requestRework = () => {
    const reason = window.prompt("재작업 요청 내용을 입력하세요:", "");
    if (reason === null) return;
    reworkMut.mutate({ id: ticket.id, reason: reason || undefined });
  };

  const remove = () => {
    if (!confirm(`티켓 "${ticket.title}"을 삭제할까요?`)) return;
    deleteMut.mutate(ticket.id);
  };

  return (
    <div
      {...dragHandleProps}
      className={cn(
        "group rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-sm",
        "hover:border-[var(--color-border-strong)]",
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-center gap-1 mb-1.5 min-h-[18px]">
        {isRunning && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-green-500/15 text-green-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            실행 중
          </span>
        )}
        {showProjectBadge && ticket.projectName && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/15 text-blue-400 font-mono truncate max-w-[100px]">
            {ticket.projectName}
          </span>
        )}
        {ticket.jiraKey && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-surface-hover)] text-[var(--color-foreground-muted)] font-mono">
            {ticket.jiraKey}
          </span>
        )}
        {ticket.sessionId && (
          <span
            className="px-1 py-0.5 rounded text-[10px] text-[var(--color-foreground-dim)]"
            title="Claude 세션 재사용 가능"
          >
            <TerminalIcon size={10} />
          </span>
        )}
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              className="p-0.5 rounded text-[var(--color-foreground-dim)] hover:bg-[var(--color-surface-hover)]"
              aria-label="메뉴"
            >
              <MoreVertical size={13} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {ticket.status !== "done" && (
              <DropdownMenuItem onSelect={runTicket}>
                <Play size={12} /> {ticket.sessionId ? "재개" : "실행"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => onEdit(ticket)}>
              <Pencil size={12} /> 편집
            </DropdownMenuItem>
            {ticket.status !== "done" && (
              <DropdownMenuItem onSelect={markDone}>
                <Check size={12} /> 완료로 이동
              </DropdownMenuItem>
            )}
            {ticket.status === "review" && (
              <DropdownMenuItem onSelect={requestRework}>
                <RefreshCw size={12} /> 재작업 요청
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={remove}
              className="text-[var(--color-danger)]"
            >
              <Trash2 size={12} /> 삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div
        className="font-medium text-[var(--color-foreground)] truncate cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(ticket);
        }}
      >
        {ticket.title}
      </div>
      {ticket.description && (
        <div className="mt-1 text-xs text-[var(--color-foreground-muted)] line-clamp-2">
          {ticket.description}
        </div>
      )}
      {ticket.resultSummary && (
        <div className="mt-1 text-xs text-green-400 line-clamp-2">
          ✓ {ticket.resultSummary}
        </div>
      )}
      {ticket.reworkCount > 0 && (
        <div className="mt-2 text-[10px] text-[var(--color-warning)]">
          ↻ 재작업 {ticket.reworkCount}회
        </div>
      )}
    </div>
  );
}
