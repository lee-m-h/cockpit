"use client";

import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import type { SplitNode } from "@/types/terminal";
import { TerminalPane } from "./terminal-pane";
import { useState } from "react";

interface TerminalSplitProps {
  node: SplitNode;
  tabId: string;
}

export function TerminalSplit({ node, tabId }: TerminalSplitProps) {
  const [activePaneId, setActivePaneId] = useState<string | null>(null);

  return <SplitNodeRenderer node={node} active={activePaneId} onFocus={setActivePaneId} tabId={tabId} />;
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

  // split
  const isHorizontal = node.direction === "horizontal";
  return (
    <PanelGroup
      direction={isHorizontal ? "horizontal" : "vertical"}
      className="h-full w-full"
      autoSaveId={`cockpit-split-${tabId}-${node.direction}`}
    >
      {node.children.map((child, i) => (
        <PanelItem
          key={getNodeKey(child)}
          index={i}
          last={i === node.children.length - 1}
          isHorizontal={isHorizontal}
        >
          <SplitNodeRenderer node={child} active={active} onFocus={onFocus} tabId={tabId} />
        </PanelItem>
      ))}
    </PanelGroup>
  );
}

function PanelItem({
  children,
  index,
  last,
  isHorizontal,
}: {
  children: React.ReactNode;
  index: number;
  last: boolean;
  isHorizontal: boolean;
}) {
  return (
    <>
      {index > 0 && (
        <PanelResizeHandle
          className={
            isHorizontal
              ? "w-[3px] bg-[var(--color-border)] hover:bg-[var(--color-accent)] data-[resize-handle-state=drag]:bg-[var(--color-accent)] transition-colors"
              : "h-[3px] bg-[var(--color-border)] hover:bg-[var(--color-accent)] data-[resize-handle-state=drag]:bg-[var(--color-accent)] transition-colors"
          }
        />
      )}
      <Panel defaultSize={100 / (last ? index + 1 : 2)} minSize={15}>
        {children}
      </Panel>
    </>
  );
}

function getNodeKey(node: SplitNode): string {
  if (node.type === "leaf") return `leaf-${node.pane.id}`;
  return `split-${node.direction}-${node.children.map(getNodeKey).join("_")}`;
}
