import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError, getRequestMetadata } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { assertBusinessUnitAccess } from "@/lib/business-units";
import { hasPermission, Permission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { actionPlanUpdateSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.CRM_WRITE);
    const { id } = await params;
    const input = actionPlanUpdateSchema.parse(await request.json());
    if (!(await assertBusinessUnitAccess(context, input.businessUnitId))) {
      return NextResponse.json({ message: "事業部が見つかりません。" }, { status: 403 });
    }
    const existing = await prisma.actionPlan.findFirst({
      where: { id, organizationId: context.organization.id },
    });
    if (!existing)
      return NextResponse.json({ message: "ActionPlanが見つかりません。" }, { status: 404 });
    const canManage = hasPermission(context.membership.role, Permission.MANAGE_TARGETS);
    const nextOwnerUserId = input.ownerUserId ?? existing.ownerUserId;
    if (
      !canManage &&
      existing.ownerUserId !== context.user.id &&
      nextOwnerUserId !== context.user.id
    ) {
      return NextResponse.json(
        { message: "このActionPlanを編集する権限がありません。" },
        { status: 403 },
      );
    }
    if (input.ownerUserId && input.ownerUserId !== context.user.id && !canManage) {
      return NextResponse.json(
        { message: "他の担当者への割り当ては管理者のみ可能です。" },
        { status: 403 },
      );
    }
    const metadata = getRequestMetadata(request);
    const item = await prisma.actionPlan.update({
      where: { id },
      data: {
        businessUnitId:
          input.businessUnitId === undefined
            ? undefined
            : input.businessUnitId ?? null,
        workFunction:
          input.workFunction === undefined ? undefined : input.workFunction ?? null,
        ownerUserId:
          input.ownerUserId === undefined || !canManage
            ? undefined
            : input.ownerUserId ?? null,
        targetId: input.targetId === undefined ? undefined : input.targetId ?? null,
        metricDefinitionId:
          input.metricDefinitionId === undefined
            ? undefined
            : input.metricDefinitionId ?? null,
        title: input.title,
        description:
          input.description === undefined ? undefined : input.description ?? null,
        dueDate: input.dueDate === undefined ? undefined : input.dueDate,
        status: input.status,
        priority: input.priority,
        completedAt:
          input.status === "COMPLETED"
            ? existing.completedAt ?? new Date()
            : input.status
              ? null
              : undefined,
      },
      include: {
        metricDefinition: { select: { id: true, displayName: true } },
      },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: context.organization.id,
        actorUserId: context.user.id,
        action: "kpi.action_plan.updated",
        targetType: "action_plan",
        targetId: item.id,
        before: existing as unknown as Prisma.InputJsonValue,
        after: item as unknown as Prisma.InputJsonValue,
        ...metadata,
      },
    });
    return NextResponse.json({ item });
  } catch (error) {
    return apiError(error);
  }
}
