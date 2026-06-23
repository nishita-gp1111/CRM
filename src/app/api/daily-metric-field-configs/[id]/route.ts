import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, getRequestMetadata } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { Permission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z
  .object({
    isEnabled: z.boolean().optional(),
    displayOrder: z.coerce.number().int().min(0).optional(),
  })
  .refine((value) => value.isEnabled !== undefined || value.displayOrder !== undefined, {
    message: "変更内容を指定してください。",
  });

export async function PATCH(request: Request, { params }: Params) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.MANAGE_KPI);
    const { id } = await params;
    const input = updateSchema.parse(await request.json());
    const before = await prisma.dailyMetricFieldConfig.findFirst({
      where: { id, organizationId: context.organization.id },
    });
    if (!before)
      return NextResponse.json(
        { message: "日次入力項目設定が見つかりません。" },
        { status: 404 },
      );
    const metadata = getRequestMetadata(request);
    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.dailyMetricFieldConfig.update({
        where: { id },
        data: input,
      });
      await tx.auditLog.create({
        data: {
          organizationId: context.organization.id,
          actorUserId: context.user.id,
          action: "kpi.daily_metric_field_config.updated",
          targetType: "daily_metric_field_config",
          targetId: updated.id,
          before: before as unknown as Prisma.InputJsonValue,
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
