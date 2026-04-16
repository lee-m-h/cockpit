"use client";

import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelGroupHandle,
} from "react-resizable-panels";
import type { SplitNode } from "@/types/terminal";
import { TerminalPane } from "./terminal-pane";
import { useRef, useState } from "react";

interface TerminalSplitProps {
  node: SplitNode;
  tabId: string;
}

export function TerminalSplit({ node, tabId }: TerminalSplitProps) {
  const [activePaneId, setActivePaneId] = useState<string | null>(null);

  return (
    <SplitNodeRenderer
      node={node}
      active={activePaneId}
      onFocus={setActivePaneId}
      tabId={tabId}
    />
  );
}

function SplitNodeRenderer({
  node,
  active,
  onFocus,
  tabId,
}: {
  node: SplitNode;
  active: string | null;
  onFocus: (id: string) => void;
  tabId: string;
}) {
  if (node.type === "leaf") {
    return (
      <TerminalPane
        pane={node.pane}
        isActive={active === node.pane.id}
        onFocus={() => onFocus(node.pane.id)}
      />
    );
  }

  const isHorizontal = node.direction === "horizontal";
  const childCount = node.children.length;
  // 고유 ID — 하위 pane id 조합으로 충돌 방지
  const groupId = `split-${tabId}-${node.children
    .map((c) => (c.type === "leaf" ? c.pane.id : "g"))
    .join("-")}`;

  return (
    <SplitGroup
      direction={isHorizontal ? "horizontal" : "vertical"}
      groupId={groupId}
      childCount={childCount}
    >
      {node.children.map((child, i) => (
        <PanelItem
          key={getNodeKey(child)}
          index={i}
          childCount={childCount}
        >
          <SplitNodeRenderer
            node={child}
            active={active}
            onFocus={onFocus}
            tabId={tabId}
          />
        </PanelItem>
      ))}
    </SplitGroup>
  );
}

/** PanelGroup + 더블클릭 균등 분할 */
function SplitGroup({
  direction,
  groupId,
  childCount,
  children,
}: {
  direction: "horizontal" | "vertical";
  groupId: string;
  childCount: number;
  children: React.ReactNode;
}) {
  const groupRef = useRef<ImperativePanelGroupHandle>(null);

  const resetLayout = () => {
    if (!groupRef.current) return;
    const equalSize = 100 / childCount;
    const layout = Array(childCount).fill(equalSize);
    groupRef.current.setLayout(layout);
  };

  return (
    <PanelGroup
      ref={groupRef}
      direction={direction}
      className="h-full w-full"
      autoSaveId={groupId}
    >
      {injectHandles(children, direction, resetLayout)}
    </PanelGroup>
  );
}

/** children 사이에 PanelResizeHandle 삽입 */
function injectHandles(
  children: React.ReactNode,
  direction: "horizontal" | "vertical",
  onDoubleClick: () => void,
): React.ReactNode[] {
  const items = Array.isArray(children) ? children : [children];
  const result: React.ReactNode[] = [];
  const isHorizontal = direction === "horizontal";

  items.forEach((child, i) => {
    if (i > 0) {
      result.push(
        <div
          key={`handle-${i}`}
          onDoubleClick={onDoubleClick}
          className={
            isHorizontal
              ? "flex items-stretch cursor-col-resize"
              : "flex flex-col justify-stretch cursor-row-resize"
          }
          title="더블클릭으로 균등 분할"
        >
          <PanelResizeHandle
            className={
              isHorizontal
                ? "w-[3px] bg-[var(--color-border)] hover:bg-[var(--color-accent)] data-[resize-handle-state=drag]:bg-[var(--color-accent)] transition-colors"
                : "h-[3px] bg-[var(--color-border)] hover:bg-[var(--color-accent)] data-[resize-handle-state=drag]:bg-[var(--color-accent)] transition-colors"
            }
          />
        </div>,
      );
    }
    result.push(child);
  });

  return result;
}

function PanelItem({
  children,
  index,
  childCount,
}: {
  children: React.ReactNode;
  index: number;
  childCount: number;
}) {
  return (
    <Panel defaultSize={100 / childCount} minSize={10} order={index}>
      {children}
    </Panel>
  );
}

function getNodeKey(node: SplitNode): string {
  if (node.type === "leaf") return `leaf-${node.pane.id}`;
  return `split-${node.direction}-${node.children
    .map(getNodeKey)
    .join("_")}`;
}
