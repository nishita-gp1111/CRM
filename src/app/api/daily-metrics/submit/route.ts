import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { assertDailyMetricEntryAccess } from "@/lib/daily-metric-fields";
import { jstDateOnly } from "@/lib/jst-date";
import { Permission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { dailyMetricsSubmitSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.CRM_WRITE);
    const input = dailyMetricsSubmitSchema.parse(await request.json());
    if (
      !(await assertDailyMetricEntryAccess({
        context,
        businessUnitId: input.businessUnitId,
        workFunction: input.workFunction,
        targetUserId: context.user.id,
        canManage: false,
      }))
    ) {
      return NextResponse.json(
        { message: "この事業部・職種の日次実績は提出できません。" },
        { status: 403 },
      );
    }
    const targetDate = jstDateOnly(input.targetDate.toISOString().slice(0, 10));
    const result = await prisma.dailyMetricEntry.updateMany({
      where: {
        organizationId: context.organization.id,
        businessUnitId: input.businessUnitId,
        workFunction: input.workFunction,
        targetDate,
        userId: context.user.id,
        status: { in: ["DRAFT", "SUBMITTED"] },
      },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });
    return NextResponse.json({ count: result.count });
  } catch (error) {
    return apiError(error);
  }
}
