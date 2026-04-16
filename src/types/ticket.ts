export type TicketStatus = "backlog" | "in_progress" | "review" | "done";
export type TicketType = "feature" | "bug" | "improvement" | "check";

export interface Ticket {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  type: TicketType | string;
  successCriteria: string | null;
  jiraKey: string | null;
  sessionId: string | null;
  status: TicketStatus | string;
  priority: number;
  order: number;
  startedAt: string | null;
  completedAt: string | null;
  reworkCount: number;
  lastReworkRequest: string | null;
  resultSummary: string | null;
  projectName?: string; // Feature 3: 전체 보기 시 포함
  createdAt: string;
  updatedAt: string;
}

export interface StartTicketResponse {
  ticket: Ticket;
  cwd: string;
  initialInput: string;
}
