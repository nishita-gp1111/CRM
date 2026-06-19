import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError, getRequestMetadata } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { hasPermission, Permission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.CRM_WRITE);
    const { id } = await params;
    const existing = await prisma.actionPlan.findFirst({
      where: { id, organizationId: context.organization.id },
    });
    if (!existing)
      return NextResponse.json({ message: "ActionPlanが見つかりません。" }, { status: 404 });
    const canManage = hasPermission(context.membership.role, Permission.MANAGE_TARGETS);
    if (!canManage && existing.ownerUserId !== context.user.id) {
      return NextResponse.json(
        { message: "このActionPlanを完了する権限がありません。" },
        { status: 403 },
      );
    }
    const metadata = getRequestMetadata(request);
    const item = await prisma.actionPlan.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
      include: {
        metricDefinition: { select: { id: true, displayName: true } },
      },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: context.organization.id,
        actorUserId: context.user.id,
        action: "kpi.action_plan.completed",
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
