"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Globe,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { useTerminalStore } from "@/store/terminal-store";

interface Props {
  /** 탭 ID 또는 분할 pane ID */
  paneId: string;
  initialUrl: string;
}

/** URL 정규화 — 프로토콜 없으면 https 붙이고, 검색어처럼 보이면 구글 검색 */
function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
    return "https://" + trimmed;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

/** 공용 브라우저 본체 — 탭/분할 panes 양쪽에서 사용 */
export function BrowserContent({ paneId, initialUrl }: Props) {
  const setBrowserUrl = useTerminalStore((s) => s.setBrowserUrl);
  const [input, setInput] = useState(initialUrl);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [blocked, setBlocked] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setInput(initialUrl);
    setCurrentUrl(initialUrl);
  }, [initialUrl]);

  // iframe 로드 감지 — 5초 안에 load 이벤트 안 오면 차단 추정
  useEffect(() => {
    if (!currentUrl) return;
    setBlocked(false);
    const timer = setTimeout(() => {
      // 로드는 됐는데 X-Frame-Options로 빈 화면일 수 있음
      // 확실히 감지는 어려워서 그냥 안내만
    }, 5000);
    return () => clearTimeout(timer);
  }, [currentUrl]);

  const go = (raw: string) => {
    const url = normalizeUrl(raw);
    if (!url) return;
    setCurrentUrl(url);
    setBrowserUrl(paneId, url);
    setInput(url);
    setBlocked(false);
  };

  const reload = () => {
    if (iframeRef.current) {
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
      // cross-origin
    }
  };

  const goForward = () => {
    try {
      iframeRef.current?.contentWindow?.history.forward();
    } catch {
      // cross-origin
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
          className="p-1 rounded text-[var(--color-foreground-dim)] hover:bg-[var(--color-surface-hover)]"
          title="뒤로"
        >
          <ArrowLeft size={14} />
        </button>
        <button
          onClick={goForward}
          className="p-1 rounded text-[var(--color-foreground-dim)] hover:bg-[var(--color-surface-hover)]"
          title="앞으로"
        >
          <ArrowRight size={14} />
        </button>
        <button
          onClick={reload}
          className="p-1 rounded text-[var(--color-foreground-dim)] hover:bg-[var(--color-surface-hover)]"
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
          className="p-1 rounded text-[var(--color-foreground-dim)] hover:bg-[var(--color-surface-hover)]"
          title="기본 브라우저로 열기"
        >
          <ExternalLink size={14} />
        </button>
      </div>

      {/* iframe */}
      <div className="flex-1 min-h-0 relative bg-white">
        {currentUrl ? (
          <>
            <iframe
              ref={iframeRef}
              src={currentUrl}
              className="w-full h-full border-0"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
              onError={() => setBlocked(true)}
            />
            {blocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-background)]/95 text-center p-6">
                <div>
                  <AlertTriangle
                    size={32}
                    className="mx-auto text-[var(--color-warning)] mb-2"
                  />
                  <p className="text-sm text-[var(--color-foreground-muted)] mb-3">
                    이 사이트는 iframe 임베드를 차단합니다.
                  </p>
                  <button
                    onClick={openExternal}
                    className="px-3 py-1.5 text-xs bg-[var(--color-accent)] text-white rounded inline-flex items-center gap-1"
                  >
                    <ExternalLink size={11} /> 기본 브라우저로 열기
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--color-foreground-muted)] bg-[var(--color-background)]">
            주소창에 URL을 입력하세요.
          </div>
        )}
      </div>
    </div>
  );
}
