"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Home,
  Folder,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BrowseResponse {
  currentPath: string;
  home: string;
  nodes: Array<{
    name: string;
    path: string;
    absolutePath: string;
    type: "directory" | "file";
  }>;
  quickPaths: Array<{ name: string; path: string }>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (absolutePath: string) => void;
  initialPath?: string;
}

export function FolderPickerDialog({
  open,
  onOpenChange,
  onPick,
  initialPath,
}: Props) {
  const [currentPath, setCurrentPath] = useState<string | undefined>(initialPath);
  const [data, setData] = useState<BrowseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setData(null);
    const qs = currentPath ? `?path=${encodeURIComponent(currentPath)}` : "";
    fetch(`/api/fs/browse${qs}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        return body as BrowseResponse;
      })
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [open, currentPath]);

  const goUp = () => {
    if (!data) return;
    if (data.currentPath === data.home) return;
    const parent = data.currentPath.split("/").slice(0, -1).join("/") || "/";
    setCurrentPath(parent);
  };

  const confirm = () => {
    if (!data) return;
    onPick(data.currentPath);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogTitle>폴더 선택</DialogTitle>

        {/* quickPaths */}
        {data?.quickPaths && data.quickPaths.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCurrentPath(data.home)}
              className="text-xs"
            >
              <Home size={12} /> Home
            </Button>
            {data.quickPaths.map((q) => (
              <Button
                key={q.path}
                size="sm"
                variant="ghost"
                onClick={() => setCurrentPath(q.path)}
                className="text-xs"
              >
                <Folder size={12} /> {q.name}
              </Button>
            ))}
          </div>
        )}

        {/* 현재 경로 */}
        <div className="mt-3 flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5">
          <Button
            size="icon"
            variant="ghost"
            onClick={goUp}
            disabled={!data || data.currentPath === data.home}
            title="상위 폴더로"
          >
            <ChevronUp size={14} />
          </Button>
          <span className="flex-1 min-w-0 truncate text-xs font-mono text-[var(--color-foreground)]">
            {data?.currentPath ?? "…"}
          </span>
        </div>

        {/* 목록 */}
        <div className="mt-2 h-[280px] overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-1">
          {error ? (
            <div className="p-3 text-xs text-[var(--color-danger)]">{error}</div>
          ) : !data ? (
            <div className="p-3 text-xs text-[var(--color-foreground-muted)]">
              …
            </div>
          ) : data.nodes.length === 0 ? (
            <div className="p-3 text-xs text-[var(--color-foreground-dim)]">
              하위 폴더 없음
            </div>
          ) : (
            data.nodes.map((n) => (
              <button
                key={n.absolutePath}
                onDoubleClick={() => setCurrentPath(n.absolutePath)}
                onClick={() => setCurrentPath(n.absolutePath)}
                className={cn(
                  "w-full flex items-center gap-2 rounded px-2 py-1 text-sm text-left",
                  "hover:bg-[var(--color-surface-hover)]",
                )}
                title="더블클릭으로 진입"
              >
                <Folder size={12} className="text-[var(--color-foreground-muted)]" />
                <span className="truncate">{n.name}</span>
              </button>
            ))
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={confirm} disabled={!data}>
            이 폴더 선택
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
