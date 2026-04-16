"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Terminal as TerminalIcon } from "lucide-react";

/** POSIX dirname 최소 구현 — 브라우저 번들에 path-browserify 불필요 */
function dirname(p: string): string {
  const idx = p.lastIndexOf("/");
  if (idx <= 0) return idx === 0 ? "/" : p;
  return p.slice(0, idx);
}

interface FileResponse {
  binary: boolean;
  oversize: boolean;
  size: number;
  content?: string;
  name: string;
  absolutePath: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  relPath: string | null;
  absolutePath: string | null;
  name: string | null;
}

export function FileViewerDialog({
  open,
  onOpenChange,
  projectId,
  relPath,
  absolutePath,
  name,
}: Props) {
  const [data, setData] = useState<FileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!open || !projectId || !relPath) return;
    let cancelled = false;
    setError(null);
    setData(null);
    setLoading(true);
    fetch(`/api/projects/${projectId}/file?path=${encodeURIComponent(relPath)}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        return body as FileResponse;
      })
      .then((body) => {
        if (!cancelled) {
          setData(body);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, projectId, relPath]);

  const openInOS = async () => {
    if (!absolutePath) return;
    await fetch("/api/system/open", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: absolutePath }),
    });
  };

  const openTerminalAtDir = () => {
    if (!absolutePath) return;
    const dir = dirname(absolutePath);
    router.push(`/terminal?newTabCwd=${encodeURIComponent(dir)}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] p-0">
        <div className="border-b border-[var(--color-border)] p-4">
          <DialogTitle className="truncate">{name ?? "파일"}</DialogTitle>
          {absolutePath && (
            <div className="mt-1 text-[10px] text-[var(--color-foreground-dim)] font-mono truncate">
              {absolutePath}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={openInOS}>
              <ExternalLink size={12} /> OS 기본 앱으로 열기
            </Button>
            <Button size="sm" variant="outline" onClick={openTerminalAtDir}>
              <TerminalIcon size={12} /> 이 폴더에서 터미널 열기
            </Button>
          </div>
        </div>

        <div className="p-0 min-h-[320px] max-h-[60vh] overflow-auto">
          {loading ? (
            <div className="p-6 text-sm text-[var(--color-foreground-muted)]">
              불러오는 중…
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-[var(--color-danger)]">
              {error}
            </div>
          ) : !data ? null : data.oversize ? (
            <OversizePlaceholder
              size={data.size}
              onOpen={openInOS}
            />
          ) : data.binary ? (
            <BinaryPlaceholder onOpen={openInOS} />
          ) : (
            <TextContent content={data.content ?? ""} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TextContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <pre className="p-0 text-xs font-mono bg-[var(--color-background)]">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="align-top">
              <td className="select-none pr-3 pl-3 py-0 text-right text-[var(--color-foreground-dim)] border-r border-[var(--color-border)] w-[1%] whitespace-nowrap">
                {i + 1}
              </td>
              <td className="pl-3 pr-3 py-0 whitespace-pre text-[var(--color-foreground)]">
                {line || " "}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </pre>
  );
}

function BinaryPlaceholder({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="p-8 text-center">
      <p className="text-sm text-[var(--color-foreground-muted)] mb-2">
        이 파일은 바이너리입니다. Cockpit 내에서 미리보기 할 수 없어요.
      </p>
      <p className="text-xs text-[var(--color-foreground-dim)] mb-4">
        이미지·영상·PDF 등은 OS 기본 앱으로 열어보세요.
      </p>
      <Button size="sm" onClick={onOpen}>
        <ExternalLink size={12} /> OS 기본 앱으로 열기
      </Button>
    </div>
  );
}

function OversizePlaceholder({
  size,
  onOpen,
}: {
  size: number;
  onOpen: () => void;
}) {
  const mb = (size / 1024 / 1024).toFixed(1);
  return (
    <div className="p-8 text-center">
      <p className="text-sm text-[var(--color-foreground-muted)] mb-2">
        파일이 너무 큽니다 ({mb} MB). Cockpit 내장 뷰어는 1MB 이하만 표시합니다.
      </p>
      <Button size="sm" onClick={onOpen}>
        <ExternalLink size={12} /> OS 기본 앱으로 열기
      </Button>
    </div>
  );
}
