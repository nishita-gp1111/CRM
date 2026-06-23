import { randomUUID } from "node:crypto";
import { MetricUnit, Prisma, WorkFunction } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, getRequestMetadata } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { Permission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const baseSchema = z.object({
  businessUnitId: z.string().uuid(),
  workFunction: z.enum(["IS", "FS", "CS"]),
  displayOrder: z.coerce.number().int().min(0).optional(),
});

const createSchema = z.discriminatedUnion("mode", [
  baseSchema.extend({
    mode: z.literal("existing"),
    metricDefinitionId: z.string().uuid(),
  }),
  baseSchema.extend({
    mode: z.literal("new"),
    displayName: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2000).optional().nullable(),
    unit: z.enum(["COUNT", "NUMBER", "CURRENCY", "PERCENT"]),
  }),
]);

async function assertActiveBusinessUnit(organizationId: string, businessUnitId: string) {
  return prisma.businessUnit.findFirst({
    where: { id: businessUnitId, organizationId, status: "ACTIVE" },
    select: { id: true },
  });
}

async function nextDisplayOrder(input: {
  organizationId: string;
  businessUnitId: string;
  workFunction: WorkFunction;
}) {
  const aggregate = await prisma.dailyMetricFieldConfig.aggregate({
    where: input,
    _max: { displayOrder: true },
  });
  return (aggregate._max.displayOrder ?? 0) + 10;
}

function generatedMetricKey() {
  return `daily_${Date.now().toString(36)}_${randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.MANAGE_KPI);
    const input = createSchema.parse(await request.json());
    if (!(await assertActiveBusinessUnit(context.organization.id, input.businessUnitId))) {
      return NextResponse.json({ message: "事業部が見つかりません。" }, { status: 403 });
    }
    const displayOrder =
      input.displayOrder ??
      (await nextDisplayOrder({
        organizationId: context.organization.id,
        businessUnitId: input.businessUnitId,
        workFunction: input.workFunction,
      }));
    const metadata = getRequestMetadata(request);

    const item = await prisma.$transaction(async (tx) => {
      const metric =
        input.mode === "existing"
          ? await tx.metricDefinition.findFirst({
              where: {
                id: input.metricDefinitionId,
                organizationId: context.organization.id,
                sourceType: "MANUAL_DAILY",
                isActive: true,
                OR: [{ businessUnitId: input.businessUnitId }, { businessUnitId: null }],
                AND: [
                  {
                    OR: [
                      { workFunction: input.workFunction },
                      { workFunction: null },
                    ],
                  },
                ],
              },
            })
          : await tx.metricDefinition.create({
              data: {
                organizationId: context.organization.id,
                businessUnitId: input.businessUnitId,
                key: generatedMetricKey(),
                displayName: input.displayName,
                description: input.description ?? null,
                unit: input.unit as MetricUnit,
                sourceType: "MANUAL_DAILY",
                aggregation: "SUM",
                category: "ACTIVITY",
                workFunction: input.workFunction,
                isActive: true,
                isVisibleByDefault: false,
                displayOrder,
                queryDefinition: {},
                filterDefinition: {},
              },
            });
      if (!metric) throw new Error("追加できるKPIが見つかりません。");
      if (input.mode === "new") {
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
      }
      const config = await tx.dailyMetricFieldConfig.upsert({
        where: {
          organizationId_businessUnitId_workFunction_metricDefinitionId: {
            organizationId: context.organization.id,
            businessUnitId: input.businessUnitId,
            workFunction: input.workFunction,
            metricDefinitionId: metric.id,
          },
        },
        create: {
          organizationId: context.organization.id,
          businessUnitId: input.businessUnitId,
          workFunction: input.workFunction,
          metricDefinitionId: metric.id,
          isEnabled: true,
          displayOrder,
        },
        update: {
          isEnabled: true,
          displayOrder,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: context.organization.id,
          actorUserId: context.user.id,
          action: "kpi.daily_metric_field_config.upserted",
          targetType: "daily_metric_field_config",
          targetId: config.id,
          after: config as unknown as Prisma.InputJsonValue,
          ...metadata,
        },
      });
      return config;
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
