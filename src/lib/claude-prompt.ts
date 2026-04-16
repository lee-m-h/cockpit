/**
 * 티켓 정보를 Claude CLI에 넘길 프롬프트와 명령어로 변환.
 */
export interface TicketLike {
  title: string;
  description?: string | null;
  successCriteria?: string | null;
  type?: string | null;
  jiraKey?: string | null;
  lastReworkRequest?: string | null;
}

export function buildClaudePrompt(ticket: TicketLike): string {
  const parts: string[] = [];
  parts.push(`# ${ticket.title}`);
  if (ticket.jiraKey) parts.push(`(Jira: ${ticket.jiraKey})`);

  if (ticket.description?.trim()) {
    parts.push(`\n## 설명\n${ticket.description.trim()}`);
  }
  if (ticket.successCriteria?.trim()) {
    parts.push(`\n## 성공 기준\n${ticket.successCriteria.trim()}`);
  }
  if (ticket.lastReworkRequest?.trim()) {
    parts.push(`\n## 재작업 요청\n${ticket.lastReworkRequest.trim()}`);
  }
  return parts.join("\n");
}

/**
 * shell에 안전하게 넘기기 위한 이스케이프 + `claude [--resume ID] "<prompt>"` 생성.
 * 마지막에 엔터(\r)로 끝내 pty에 바로 실행되도록 함.
 * Windows(cmd.exe/PowerShell)와 Unix(bash/zsh) 이스케이프를 분기 처리.
 */
export function buildClaudeCommand(prompt: string, sessionId?: string | null): string {
  const resume = sessionId ? ` --resume ${sessionId}` : "";

  if (process.platform === "win32") {
    // PowerShell: 쌍따옴표 안의 특수문자를 backtick(`)으로 이스케이프
    const escaped = prompt
      .replace(/`/g, "``")
      .replace(/"/g, '`"')
      .replace(/\$/g, "`$");
    return `claude${resume} "${escaped}"\r`;
  }

  // Unix (bash/zsh)
  const escaped = prompt
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`");
  return `claude${resume} "${escaped}"\r`;
}
