import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError, getRequestMetadata } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { assertBusinessUnitAccess } from "@/lib/business-units";
import { hasPermission, Permission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { actionPlanSchema, metricQuerySchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.CRM_READ);
    const url = new URL(request.url);
    const query = metricQuerySchema.parse(Object.fromEntries(url.searchParams));
    const items = await prisma.actionPlan.findMany({
      where: {
        organizationId: context.organization.id,
        ...(query.businessUnitId
          ? { OR: [{ businessUnitId: query.businessUnitId }, { businessUnitId: null }] }
          : {}),
        ...(query.workFunction
          ? { OR: [{ workFunction: query.workFunction }, { workFunction: null }] }
          : {}),
        ...(query.userId
          ? { OR: [{ ownerUserId: query.userId }, { ownerUserId: null }] }
          : {}),
      },
      include: {
        metricDefinition: { select: { id: true, displayName: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { updatedAt: "desc" }],
      take: 100,
    });
    return NextResponse.json({ items });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.CRM_WRITE);
    const input = actionPlanSchema.parse(await request.json());
    if (!(await assertBusinessUnitAccess(context, input.businessUnitId))) {
      return NextResponse.json({ message: "事業部が見つかりません。" }, { status: 403 });
    }
    const ownerUserId = input.ownerUserId ?? context.user.id;
    if (
      ownerUserId !== context.user.id &&
      !hasPermission(context.membership.role, Permission.MANAGE_TARGETS)
    ) {
      return NextResponse.json(
        { message: "他の担当者のActionPlanは管理者のみ作成できます。" },
        { status: 403 },
      );
    }
    const metadata = getRequestMetadata(request);
    const item = await prisma.actionPlan.create({
      data: {
        organizationId: context.organization.id,
        businessUnitId: input.businessUnitId ?? null,
        workFunction: input.workFunction ?? null,
        ownerUserId,
        targetId: input.targetId ?? null,
        metricDefinitionId: input.metricDefinitionId ?? null,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
        status: input.status,
        priority: input.priority,
        completedAt: input.status === "COMPLETED" ? new Date() : null,
        createdByUserId: context.user.id,
        metadata: {} as Prisma.InputJsonValue,
      },
      include: {
        metricDefinition: { select: { id: true, displayName: true } },
      },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: context.organization.id,
        actorUserId: context.user.id,
        action: "kpi.action_plan.created",
        targetType: "action_plan",
        targetId: item.id,
        after: item as unknown as Prisma.InputJsonValue,
        ...metadata,
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
