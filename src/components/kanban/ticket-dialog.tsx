"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useCreateTicket,
  useUpdateTicket,
} from "@/hooks/use-tickets";
import type { Ticket } from "@/types/ticket";
import { Sparkles } from "lucide-react";
import { JiraPickerDialog } from "./jira-picker-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** 편집 모드면 ticket 제공, 생성 모드면 null */
  ticket?: Ticket | null;
  /** 생성 모드에서 기본 상태(컬럼별 [+]용) */
  defaultStatus?: string;
  /** Jira 패널에서 임포트 시 사전 입력 */
  importIssue?: { key: string; summary: string; description: string } | null;
}

export function TicketDialog({
  open,
  onOpenChange,
  projectId,
  ticket,
  defaultStatus,
  importIssue,
}: Props) {
  const isEdit = !!ticket;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [successCriteria, setSuccessCriteria] = useState("");
  const [jiraKey, setJiraKey] = useState("");
  const [resultSummary, setResultSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [jiraOpen, setJiraOpen] = useState(false);

  const createMut = useCreateTicket(projectId);
  const updateMut = useUpdateTicket(projectId);

  useEffect(() => {
    if (!open) return;
    if (ticket) {
      setTitle(ticket.title);
      setDescription(ticket.description ?? "");
      setSuccessCriteria(ticket.successCriteria ?? "");
      setJiraKey(ticket.jiraKey ?? "");
      setResultSummary(ticket.resultSummary ?? "");
    } else if (importIssue) {
      setTitle(importIssue.summary);
      setDescription(importIssue.description);
      setSuccessCriteria("");
      setJiraKey(importIssue.key);
      setResultSummary("");
    } else {
      setTitle("");
      setDescription("");
      setSuccessCriteria("");
      setJiraKey("");
      setResultSummary("");
    }
    setError(null);
  }, [open, ticket, importIssue]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      successCriteria: successCriteria.trim() || undefined,
      jiraKey: jiraKey.trim() || undefined,
      ...(isEdit ? { resultSummary: resultSummary.trim() || null } : {}),
    };
    try {
      if (isEdit && ticket) {
        await updateMut.mutateAsync({ id: ticket.id, ...payload });
      } else {
        await createMut.mutateAsync({
          ...payload,
          status: defaultStatus,
        });
      }
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const handleJiraPick = (issue: {
    key: string;
    summary: string;
    description: string;
    type: string;
  }) => {
    setJiraKey(issue.key);
    if (!title.trim()) setTitle(issue.summary);
    if (!description.trim()) setDescription(issue.description);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogTitle>{isEdit ? "티켓 편집" : "새 티켓"}</DialogTitle>
          <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
            <label className="text-xs text-[var(--color-foreground-muted)]">
              제목 *
              <Input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>

            <div className="text-xs text-[var(--color-foreground-muted)]">
              Jira 키
              <div className="flex gap-1 mt-1">
                <Input
                  placeholder="PROJ-123"
                  value={jiraKey}
                  onChange={(e) => setJiraKey(e.target.value.toUpperCase())}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setJiraOpen(true)}
                  title="Jira에서 가져오기"
                >
                  <Sparkles size={13} /> Jira
                </Button>
              </div>
            </div>

            <label className="text-xs text-[var(--color-foreground-muted)]">
              설명
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-foreground-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </label>

            <label className="text-xs text-[var(--color-foreground-muted)]">
              성공 기준
              <textarea
                value={successCriteria}
                onChange={(e) => setSuccessCriteria(e.target.value)}
                rows={3}
                placeholder="- 테스트 통과&#10;- 배포 후 로그 에러 0건"
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-foreground-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </label>

            {isEdit && ticket && ticket.status !== "backlog" && (
              <label className="text-xs text-[var(--color-foreground-muted)]">
                결과 요약
                <textarea
                  value={resultSummary}
                  onChange={(e) => setResultSummary(e.target.value)}
                  rows={3}
                  placeholder="작업 결과를 간단히 기록하세요"
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-foreground-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </label>
            )}

            {error && (
              <div className="text-xs text-[var(--color-danger)]">{error}</div>
            )}
            <div className="mt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={createMut.isPending || updateMut.isPending || !title.trim()}
              >
                {isEdit ? "저장" : "생성"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <JiraPickerDialog
        open={jiraOpen}
        onOpenChange={setJiraOpen}
        onPick={handleJiraPick}
      />
    </>
  );
}
