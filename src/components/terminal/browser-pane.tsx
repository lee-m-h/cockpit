"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Globe,
  ExternalLink,
} from "lucide-react";
import { useTerminalStore } from "@/store/terminal-store";

interface Props {
  tabId: string;
  initialUrl?: string;
}

/** URL 정규화 — 프로토콜 없으면 https 붙이고, 검색어처럼 보이면 구글 검색 */
function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
    return "https://" + trimmed;
  }
  // 그 외 → google 검색
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

export function BrowserPane({ tabId, initialUrl }: Props) {
  const setBrowserUrl = useTerminalStore((s) => s.setBrowserUrl);
  const [input, setInput] = useState(initialUrl ?? "");
  const [currentUrl, setCurrentUrl] = useState(initialUrl ?? "");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setInput(initialUrl ?? "");
    setCurrentUrl(initialUrl ?? "");
  }, [initialUrl]);

  const go = (raw: string) => {
    const url = normalizeUrl(raw);
    if (!url) return;
    setCurrentUrl(url);
    setBrowserUrl(tabId, url);
    setInput(url);
  };

  const reload = () => {
    if (iframeRef.current) {
      // 강제 새로고침
      const src = iframeRef.current.src;
      iframeRef.current.src = "about:blank";
      requestAnimationFrame(() => {
        if (iframeRef.current) iframeRef.current.src = src;
      });
    }
  };

  const goBack = () => {
    try {
      iframeRef.current?.contentWindow?.history.back();
    } catch {
      // cross-origin이면 접근 불가
    }
  };

  const goForward = () => {
    try {
      iframeRef.current?.contentWindow?.history.forward();
    } catch {
      // cross-origin이면 접근 불가
    }
  };

  const openExternal = () => {
    if (!currentUrl) return;
    window.open(currentUrl, "_blank", "noopener");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    go(input);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[var(--color-background)]">
      {/* 주소창 */}
      <div className="flex items-center gap-1 h-9 px-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <button
          onClick={goBack}
          className="p-1 rounded text-[var(--color-foreground-dim)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]"
          title="뒤로"
        >
          <ArrowLeft size={14} />
        </button>
        <button
          onClick={goForward}
          className="p-1 rounded text-[var(--color-foreground-dim)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]"
          title="앞으로"
        >
          <ArrowRight size={14} />
        </button>
        <button
          onClick={reload}
          className="p-1 rounded text-[var(--color-foreground-dim)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]"
          title="새로고침"
        >
          <RotateCw size={14} />
        </button>
        <form onSubmit={onSubmit} className="flex-1 flex items-center gap-1">
          <div className="flex-1 flex items-center gap-1 px-2 h-7 rounded bg-[var(--color-background)] border border-[var(--color-border)] focus-within:border-[var(--color-accent)]">
            <Globe size={12} className="text-[var(--color-foreground-dim)]" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="URL 입력 또는 검색어"
              className="flex-1 bg-transparent text-xs text-[var(--color-foreground)] outline-none"
            />
          </div>
        </form>
        <button
          onClick={openExternal}
          className="p-1 rounded text-[var(--color-foreground-dim)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]"
          title="기본 브라우저로 열기"
        >
          <ExternalLink size={14} />
        </button>
      </div>

      {/* iframe */}
      <div className="flex-1 min-h-0 relative bg-white">
        {currentUrl ? (
          <iframe
            ref={iframeRef}
            src={currentUrl}
            className="w-full h-full border-0"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--color-foreground-muted)] bg-[var(--color-background)]">
            주소창에 URL을 입력하세요.
          </div>
        )}
      </div>
    </div>
  );
}
