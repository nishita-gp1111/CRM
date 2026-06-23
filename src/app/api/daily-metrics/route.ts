import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError, getRequestMetadata } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import {
  assertDailyMetricEntryAccess,
  canManageDailyMetricEntries,
  getDailyMetricScope,
  getEnabledDailyMetricFieldConfigs,
} from "@/lib/daily-metric-fields";
import { dimensionHash, dimensionsJson, normalizeDimensions } from "@/lib/dimensions";
import { jstDateOnly } from "@/lib/jst-date";
import {
  AuthorizationError,
  Permission,
  requirePermission,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { dailyMetricsPutSchema, metricQuerySchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.CRM_READ);
    const url = new URL(request.url);
    const query = metricQuerySchema.parse(Object.fromEntries(url.searchParams));
    const canManage = canManageDailyMetricEntries(context);
    const scope = await getDailyMetricScope({
      context,
      requestedBusinessUnitId: query.businessUnitId,
      requestedWorkFunction: query.workFunction,
      canManage,
    });
    if (!scope.selectedBusinessUnitId) {
      return NextResponse.json({ message: "事業部が見つかりません。" }, { status: 403 });
    }
    const targetDate = query.periodStart
      ? jstDateOnly(query.periodStart.toISOString().slice(0, 10))
      : jstDateOnly(new Date().toISOString().slice(0, 10));
    const configs = await getEnabledDailyMetricFieldConfigs({
      organizationId: context.organization.id,
      businessUnitId: scope.selectedBusinessUnitId,
      workFunction: scope.selectedWorkFunction,
    });
    const definitions = configs.map((config) => config.metricDefinition);
    const targetUserId = query.userId ?? context.user.id;
    if (
      !(await assertDailyMetricEntryAccess({
        context,
        businessUnitId: scope.selectedBusinessUnitId,
        workFunction: scope.selectedWorkFunction,
        targetUserId,
        canManage,
      }))
    ) {
      return NextResponse.json({ message: "この担当者の日次実績を操作できません。" }, { status: 403 });
    }
    const entries = await prisma.dailyMetricEntry.findMany({
      where: {
        organizationId: context.organization.id,
        targetDate,
        metricDefinitionId: { in: definitions.map((definition) => definition.id) },
        businessUnitId: scope.selectedBusinessUnitId,
        workFunction: scope.selectedWorkFunction,
        userId: targetUserId,
      },
    });
    return NextResponse.json({ definitions, entries });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.CRM_WRITE);
    const input = dailyMetricsPutSchema.parse(await request.json());
    const canManage = canManageDailyMetricEntries(context);
    const targetUserId = input.userId ?? context.user.id;
    if (
      !(await assertDailyMetricEntryAccess({
        context,
        businessUnitId: input.businessUnitId,
        workFunction: input.workFunction,
        targetUserId,
        canManage,
      }))
    ) {
      return NextResponse.json(
        { message: "この担当者の日次実績を操作できません。" },
        { status: 403 },
      );
    }
    const configs = await getEnabledDailyMetricFieldConfigs({
      organizationId: context.organization.id,
      businessUnitId: input.businessUnitId,
      workFunction: input.workFunction,
    });
    const allowedMetricIds = new Set(configs.map((config) => config.metricDefinitionId));
    const invalidEntry = input.entries.find(
      (entry) => !allowedMetricIds.has(entry.metricDefinitionId),
    );
    if (invalidEntry) {
      return NextResponse.json(
        { message: "この事業部・職種では使用できない日次入力項目です。" },
        { status: 400 },
      );
    }
    const metadata = getRequestMetadata(request);
    const hash = dimensionHash(input.dimensions);
    const normalizedDimensions = normalizeDimensions(input.dimensions);
    const normalizedDimensionsJson = dimensionsJson(input.dimensions);
    const targetDate = jstDateOnly(input.targetDate.toISOString().slice(0, 10));
    const items = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const entry of input.entries) {
        const definition = await tx.metricDefinition.findFirst({
          where: {
            id: entry.metricDefinitionId,
            organizationId: context.organization.id,
            sourceType: "MANUAL_DAILY",
            isActive: true,
          },
        });
        if (!definition) throw new Error("日次入力対象のKPIが見つかりません。");
        const existing = await tx.dailyMetricEntry.findFirst({
          where: {
            organizationId: context.organization.id,
            businessUnitId: input.businessUnitId,
            workFunction: input.workFunction,
            targetDate,
            userId: targetUserId,
            metricDefinitionId: entry.metricDefinitionId,
            dimensionHash: hash,
          },
        });
        if (String(existing?.status) === "LOCKED") {
          throw new AuthorizationError(
            "ロック済みの日次実績は変更できません。解除してから編集してください。",
          );
        }
        if (
          existing?.status === "APPROVED" &&
          !canManage
        ) {
          throw new AuthorizationError(
            "承認済みの日次実績は管理者のみ変更できます。",
          );
        }
        const item = existing
          ? await tx.dailyMetricEntry.update({
              where: { id: existing.id },
              data: {
                value: entry.value,
                comment: entry.comment,
                dimensions: normalizedDimensionsJson,
                dimensionHash: hash,
                status: existing.status === "LOCKED" ? "LOCKED" : "DRAFT",
              },
            })
          : await tx.dailyMetricEntry.create({
              data: {
                organizationId: context.organization.id,
                businessUnitId: input.businessUnitId,
                workFunction: input.workFunction,
                targetDate,
                userId: targetUserId,
                metricDefinitionId: entry.metricDefinitionId,
                value: entry.value,
                comment: entry.comment,
                dimensions: normalizedDimensionsJson,
                dimensionHash: hash,
                metadata: { normalizedDimensions },
              },
            });
        await tx.auditLog.create({
          data: {
            organizationId: context.organization.id,
            actorUserId: context.user.id,
            action: "kpi.daily_metric.upserted",
            targetType: "daily_metric_entry",
            targetId: item.id,
            before: existing as unknown as Prisma.InputJsonValue,
            after: item as unknown as Prisma.InputJsonValue,
            ...metadata,
          },
        });
        results.push(item);
      }
      return results;
    });
    return NextResponse.json({ items });
  } catch (error) {
    return apiError(error);
  }
}
