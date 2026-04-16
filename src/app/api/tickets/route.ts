import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  // projectId가 없으면 전체 프로젝트의 티켓을 반환
  const where = projectId ? { projectId } : {};
  const raw = await prisma.ticket.findMany({
    where,
    include: { project: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });
  // projectName을 최상위 필드로 병합
  const tickets = raw.map(({ project, ...rest }) => ({
    ...rest,
    projectName: project.name,
  }));
  return NextResponse.json({ tickets });
}

interface CreateBody {
  projectId?: string;
  title?: string;
  description?: string;
  type?: string;
  successCriteria?: string;
  priority?: number;
  jiraKey?: string;
  status?: string;
}

export async function POST(request: Request) {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 },
    );
  }
  if (!body.title?.trim()) {
    return NextResponse.json(
      { error: "title is required" },
      { status: 400 },
    );
  }

  // project 존재 확인
  const project = await prisma.project.findUnique({
    where: { id: body.projectId },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "project not found" }, { status: 404 });
  }

  const maxOrder = await prisma.ticket.aggregate({
    where: { projectId: body.projectId, status: body.status ?? "backlog" },
    _max: { order: true },
  });

  const ticket = await prisma.ticket.create({
    data: {
      projectId: body.projectId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      type: body.type ?? "feature",
      successCriteria: body.successCriteria?.trim() || null,
      priority: body.priority ?? 0,
      jiraKey: body.jiraKey?.trim() || null,
      status: body.status ?? "backlog",
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });
  return NextResponse.json(ticket, { status: 201 });
}
