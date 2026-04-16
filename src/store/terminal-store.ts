import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CreateTerminalResponse,
  SplitDirection,
  SplitNode,
  TerminalPane,
  TerminalTab,
} from "@/types/terminal";
import { useActiveProjectStore } from "./active-project-store";

/**
 * 터미널 워크스페이스 상태.
 * - tabs 배열에 각 탭, 각 탭은 재귀적 SplitNode 트리를 가짐.
 * - persist 미들웨어로 tabs/activeTabId만 localStorage에 저장.
 * - 앱 마운트 시 syncWithServer()로 서버 pty 목록과 대조하여 stale한 pane/탭을 정리.
 */

interface TerminalState {
  tabs: TerminalTab[];
  activeTabId: string | null;
  hydrated: boolean; // persist 복원 완료 플래그

  createTab: (opts?: {
    cwd?: string;
    projectId?: string;
    initialInput?: string;
    tabName?: string;
    ticketId?: string;
  }) => Promise<string>;
  /** 패인의 initialInput을 1회 사용 후 클리어. TerminalPane이 호출. */
  consumeInitialInput: (paneId: string) => string | undefined;
  closeTab: (tabId: string) => Promise<void>;
  renameTab: (tabId: string, name: string) => void;
  setActiveTab: (tabId: string) => void;

  splitPane: (
    paneId: string,
    direction: SplitDirection,
    opts?: { cwd?: string },
  ) => Promise<void>;
  closePane: (paneId: string) => Promise<void>;

  syncWithServer: () => Promise<void>;
}

async function createPty(opts?: {
  cwd?: string;
  projectId?: string;
}): Promise<CreateTerminalResponse> {
  const body: { cwd?: string; projectId?: string } = {};
  if (opts?.cwd) body.cwd = opts.cwd;
  else if (opts?.projectId) body.projectId = opts.projectId;
  else {
    const active = useActiveProjectStore.getState();
    if (active.activeProjectPath) body.cwd = active.activeProjectPath;
    else if (active.activeProjectId) body.projectId = active.activeProjectId;
  }

  const res = await fetch("/api/terminals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to create terminal: ${res.status}`);
  return (await res.json()) as CreateTerminalResponse;
}

async function deletePty(id: string): Promise<void> {
  try {
    await fetch(`/api/terminals/${id}`, { method: "DELETE" });
  } catch {
    // ignore
  }
}

function findAllPanes(node: SplitNode): TerminalPane[] {
  if (node.type === "leaf") return [node.pane];
  return node.children.flatMap(findAllPanes);
}

function replaceLeaf(
  node: SplitNode,
  targetPaneId: string,
  replacement: SplitNode,
): SplitNode {
  if (node.type === "leaf") {
    return node.pane.id === targetPaneId ? replacement : node;
  }
  return {
    ...node,
    children: node.children.map((c) => replaceLeaf(c, targetPaneId, replacement)),
  };
}

function removeLeaf(node: SplitNode, targetPaneId: string): SplitNode | null {
  if (node.type === "leaf") {
    return node.pane.id === targetPaneId ? null : node;
  }
  const children = node.children
    .map((c) => removeLeaf(c, targetPaneId))
    .filter((c): c is SplitNode => c !== null);
  if (children.length === 0) return null;
  if (children.length === 1) return children[0];
  return { ...node, children };
}

/** split tree에서 alive set에 없는 leaf를 제거한 새 트리를 반환. 모두 제거되면 null. */
function prunePanes(node: SplitNode, alive: Set<string>): SplitNode | null {
  if (node.type === "leaf") {
    return alive.has(node.pane.id) ? node : null;
  }
  const children = node.children
    .map((c) => prunePanes(c, alive))
    .filter((c): c is SplitNode => c !== null);
  if (children.length === 0) return null;
  if (children.length === 1) return children[0];
  return { ...node, children };
}

function shortCwd(cwd: string): string {
  const base = cwd.split("/").filter(Boolean).pop() ?? "/";
  return base || "~";
}

/**
 * split tree에서 특정 paneId의 initialInput을 null로 교체하고 캡쳐해 콜백에 전달.
 */
function stripInitialInput(
  node: SplitNode,
  targetPaneId: string,
  capture: (input: string | undefined) => void,
): SplitNode {
  if (node.type === "leaf") {
    if (node.pane.id === targetPaneId && node.pane.initialInput) {
      capture(node.pane.initialInput);
      return {
        type: "leaf",
        pane: { ...node.pane, initialInput: null },
      };
    }
    return node;
  }
  return {
    ...node,
    children: node.children.map((c) =>
      stripInitialInput(c, targetPaneId, capture),
    ),
  };
}

export const useTerminalStore = create<TerminalState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,
      hydrated: false,

      createTab: async (opts) => {
        const res = await createPty(opts);
        const pane: TerminalPane = {
          id: res.id,
          cwd: res.cwd,
          title: shortCwd(res.cwd),
          initialInput: opts?.initialInput ?? null,
        };
        const tabId = `tab-${res.id}`;
        const tab: TerminalTab = {
          id: tabId,
          name: opts?.tabName ?? shortCwd(res.cwd),
          root: { type: "leaf", pane },
          ticketId: opts?.ticketId ?? null,
        };
        set((s) => ({
          tabs: [...s.tabs, tab],
          activeTabId: tabId,
        }));
        return tabId;
      },

      consumeInitialInput: (paneId) => {
        let captured: string | undefined;
        set((s) => ({
          tabs: s.tabs.map((t) => ({
            ...t,
            root: stripInitialInput(t.root, paneId, (input) => {
              captured = input;
            }),
          })),
        }));
        return captured;
      },

      closeTab: async (tabId) => {
        const tab = get().tabs.find((t) => t.id === tabId);
        if (!tab) return;
        const panes = findAllPanes(tab.root);
        await Promise.all(panes.map((p) => deletePty(p.id)));

        // 티켓 연결된 탭이면 → 자동으로 "review"로 전환
        if (tab.ticketId) {
          try {
            await fetch(`/api/tickets/${tab.ticketId}`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ status: "review" }),
            });
            // 칸반 등 다른 컴포넌트에 티켓 변경 알림
            window.dispatchEvent(new CustomEvent("ticket-updated"));
          } catch {
            // 실패해도 탭 닫기는 진행
          }
        }

        set((s) => {
          const remaining = s.tabs.filter((t) => t.id !== tabId);
          const nextActive =
            s.activeTabId === tabId ? (remaining[0]?.id ?? null) : s.activeTabId;
          return { tabs: remaining, activeTabId: nextActive };
        });
      },

      renameTab: (tabId, name) =>
        set((s) => ({
          tabs: s.tabs.map((t) =>
            t.id === tabId ? { ...t, name } : t,
          ),
        })),

      setActiveTab: (tabId) => set({ activeTabId: tabId }),

      splitPane: async (paneId, direction, opts) => {
        const tab = get().tabs.find((t) =>
          findAllPanes(t.root).some((p) => p.id === paneId),
        );
        if (!tab) return;
        const currentPane = findAllPanes(tab.root).find((p) => p.id === paneId);
        // opts.cwd가 명시되면 그 경로, 아니면 현재 패널 cwd를 기본으로 사용.
        const res = await createPty({ cwd: opts?.cwd ?? currentPane?.cwd });
        const newPane: TerminalPane = {
          id: res.id,
          cwd: res.cwd,
          title: shortCwd(res.cwd),
        };
        const replacement: SplitNode = {
          type: "split",
          direction,
          children: [
            { type: "leaf", pane: currentPane! },
            { type: "leaf", pane: newPane },
          ],
        };
        set((s) => ({
          tabs: s.tabs.map((t) =>
            t.id === tab.id
              ? { ...t, root: replaceLeaf(t.root, paneId, replacement) }
              : t,
          ),
        }));
      },

      closePane: async (paneId) => {
        await deletePty(paneId);
        set((s) => {
          const updated: TerminalTab[] = [];
          let activeTabId = s.activeTabId;
          for (const t of s.tabs) {
            const newRoot = removeLeaf(t.root, paneId);
            if (newRoot === null) {
              if (activeTabId === t.id) activeTabId = null;
              continue;
            }
            updated.push({ ...t, root: newRoot });
          }
          if (!activeTabId && updated[0]) activeTabId = updated[0].id;
          return { tabs: updated, activeTabId };
        });
      },

      syncWithServer: async () => {
        try {
          const res = await fetch("/api/terminals");
          if (!res.ok) return;
          const data = (await res.json()) as {
            terminals: Array<{ id: string }>;
          };
          const alive = new Set(data.terminals.map((t) => t.id));
          set((s) => {
            const filtered: TerminalTab[] = [];
            for (const t of s.tabs) {
              const pruned = prunePanes(t.root, alive);
              if (pruned) filtered.push({ ...t, root: pruned });
            }
            const activeStillAlive =
              s.activeTabId && filtered.some((t) => t.id === s.activeTabId);
            return {
              tabs: filtered,
              activeTabId: activeStillAlive
                ? s.activeTabId
                : (filtered[0]?.id ?? null),
            };
          });
        } catch {
          // 네트워크 오류 시 기존 상태 유지
        }
      },
    }),
    {
      name: "cockpit-terminal-store",
      partialize: (s) => ({ tabs: s.tabs, activeTabId: s.activeTabId }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
        }
      },
    },
  ),
);

/** 특정 티켓이 현재 터미널에서 실행 중인지 확인 (primitive 반환으로 안정적) */
export function useIsTicketRunning(ticketId: string): boolean {
  return useTerminalStore((s) =>
    s.tabs.some((tab) => tab.ticketId === ticketId),
  );
}
