import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
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
    const result = await prisma.dailyMetricEntry.updateMany({
      where: {
        organizationId: context.organization.id,
        businessUnitId: input.businessUnitId,
        workFunction: input.workFunction,
        targetDate: input.targetDate,
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
