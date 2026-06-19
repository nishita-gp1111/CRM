import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError, getRequestMetadata } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { assertBusinessUnitAccess } from "@/lib/business-units";
import { getKpiDashboardData } from "@/lib/kpi";
import { Permission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { metricDefinitionSchema, metricQuerySchema } from "@/lib/validation";

function parseQuery(request: Request) {
  const url = new URL(request.url);
  return metricQuerySchema.parse(Object.fromEntries(url.searchParams));
}

export async function GET(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.CRM_READ);
    const query = parseQuery(request);
    if (!(await assertBusinessUnitAccess(context, query.businessUnitId))) {
      return NextResponse.json({ message: "事業部が見つかりません。" }, { status: 403 });
    }
    const data = await getKpiDashboardData(context, {
      businessUnitId: query.businessUnitId,
      workFunction: query.workFunction ?? null,
      userId: query.userId,
      periodStart: query.periodStart ?? undefined,
      periodEnd: query.periodEnd ?? undefined,
    });
    return NextResponse.json(data);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.MANAGE_KPI);
    const input = metricDefinitionSchema.parse(await request.json());
    if (!(await assertBusinessUnitAccess(context, input.businessUnitId))) {
      return NextResponse.json({ message: "事業部が見つかりません。" }, { status: 403 });
    }
    const metadata = getRequestMetadata(request);
    const item = await prisma.$transaction(async (tx) => {
      const metric = await tx.metricDefinition.create({
        data: {
          organizationId: context.organization.id,
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
      await tx.metricDefinitionVersion.create({
        data: {
          organizationId: context.organization.id,
          metricDefinitionId: metric.id,
          version: 1,
          displayName: metric.displayName,
          description: metric.description,
          sourceType: metric.sourceType,
          aggregation: metric.aggregation,
          unit: metric.unit,
          queryDefinition: metric.queryDefinition as Prisma.InputJsonValue,
          filterDefinition: metric.filterDefinition as Prisma.InputJsonValue,
          createdByUserId: context.user.id,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: context.organization.id,
          actorUserId: context.user.id,
          action: "kpi.metric.created",
          targetType: "metric_definition",
          targetId: metric.id,
          after: metric as unknown as Prisma.InputJsonValue,
          ...metadata,
        },
      });
      return metric;
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
