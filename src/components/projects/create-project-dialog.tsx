"use client";

import { useState } from "react";
import { useCreateProject } from "@/hooks/use-projects";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ProjectFolder } from "@/types/project";
import { FolderOpen } from "lucide-react";
import { FolderPickerDialog } from "./folder-picker-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: ProjectFolder[];
  defaultFolderId?: string | null;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  folders,
  defaultFolderId,
}: Props) {
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [folderId, setFolderId] = useState<string | "">(defaultFolderId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const mutation = useCreateProject();

  const reset = () => {
    setPath("");
    setName("");
    setFolderId(defaultFolderId ?? "");
    setError(null);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await mutation.mutateAsync({
        path: path.trim(),
        name: name.trim() || undefined,
        folderId: folderId || null,
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogTitle>프로젝트 등록</DialogTitle>
        <DialogDescription>
          로컬 디렉토리 절대 경로를 입력하세요. 폴더는 선택입니다.
        </DialogDescription>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <div className="text-xs text-[var(--color-foreground-muted)]">
            경로 *
            <div className="flex gap-1 mt-1">
              <Input
                autoFocus
                placeholder="/Users/you/projects/my-app"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                required
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPickerOpen(true)}
                title="폴더 선택"
                aria-label="폴더 선택"
                className="h-9 w-9 shrink-0"
              >
                <FolderOpen size={14} />
              </Button>
            </div>
          </div>
          <label className="text-xs text-[var(--color-foreground-muted)]">
            이름 (비우면 경로의 마지막 폴더명 사용)
            <Input
              placeholder="My App"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="text-xs text-[var(--color-foreground-muted)]">
            폴더
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-sm text-[var(--color-foreground)]"
            >
              <option value="">(미분류)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "등록 중…" : "등록"}
            </Button>
          </div>
        </form>
        <FolderPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onPick={(absPath) => setPath(absPath)}
          initialPath={path || undefined}
        />
      </DialogContent>
    </Dialog>
  );
}
