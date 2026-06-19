import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError, getRequestMetadata } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { Permission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { metricDefinitionSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.CRM_READ);
    const { id } = await params;
    const item = await prisma.metricDefinition.findFirst({
      where: { id, organizationId: context.organization.id },
      include: { versions: { orderBy: { version: "desc" }, take: 10 }, rules: true },
    });
    if (!item)
      return NextResponse.json({ message: "KPI定義が見つかりません。" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.MANAGE_KPI);
    const { id } = await params;
    const current = await prisma.metricDefinition.findFirst({
      where: { id, organizationId: context.organization.id },
    });
    if (!current)
      return NextResponse.json({ message: "KPI定義が見つかりません。" }, { status: 404 });
    const input = metricDefinitionSchema.parse(await request.json());
    const metadata = getRequestMetadata(request);
    const item = await prisma.$transaction(async (tx) => {
      const latest = await tx.metricDefinitionVersion.aggregate({
        where: { metricDefinitionId: id },
        _max: { version: true },
      });
      const updated = await tx.metricDefinition.update({
        where: { id },
        data: {
          businessUnitId: input.businessUnitId ?? null,
          key: input.key,
          displayName: input.displayName,
          description: input.description,
          category: input.category,
          unit: input.unit,
          sourceType: input.sourceType,
          aggregation: input.aggregation,
          workFunction: input.workFunction ?? null,
          dateField: input.dateField ?? null,
          queryDefinition: input.queryDefinition as Prisma.InputJsonValue,
          filterDefinition: input.filterDefinition as Prisma.InputJsonValue,
          isPrimary: input.isPrimary,
          isVisibleByDefault: input.isVisibleByDefault,
          displayOrder: input.displayOrder,
          minSampleSize: input.minSampleSize,
        },
      });
      await tx.metricDefinitionVersion.updateMany({
        where: { metricDefinitionId: id },
        data: { isCurrent: false },
      });
      await tx.metricDefinitionVersion.create({
        data: {
          organizationId: context.organization.id,
          metricDefinitionId: id,
          version: (latest._max.version ?? 0) + 1,
          displayName: updated.displayName,
          description: updated.description,
          sourceType: updated.sourceType,
          aggregation: updated.aggregation,
          unit: updated.unit,
          queryDefinition: updated.queryDefinition as Prisma.InputJsonValue,
          filterDefinition: updated.filterDefinition as Prisma.InputJsonValue,
          createdByUserId: context.user.id,
          isCurrent: true,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: context.organization.id,
          actorUserId: context.user.id,
          action: "kpi.metric.updated",
          targetType: "metric_definition",
          targetId: id,
          before: current as unknown as Prisma.InputJsonValue,
          after: updated as unknown as Prisma.InputJsonValue,
          ...metadata,
        },
      });
      return updated;
    });
    return NextResponse.json({ item });
  } catch (error) {
    return apiError(error);
  }
}
