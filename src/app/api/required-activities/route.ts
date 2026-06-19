import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { getKpiDashboardData } from "@/lib/kpi";
import { Permission, requirePermission } from "@/lib/permissions";
import { metricQuerySchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.CRM_READ);
    const url = new URL(request.url);
    const query = metricQuerySchema.parse(Object.fromEntries(url.searchParams));
    const data = await getKpiDashboardData(context, {
      businessUnitId: query.businessUnitId,
      workFunction: query.workFunction ?? null,
      userId: query.userId,
      periodStart: query.periodStart ?? undefined,
      periodEnd: query.periodEnd ?? undefined,
    });
    return NextResponse.json({
      businessCalendar: data.businessCalendar,
      requiredActivity: data.requiredActivity,
    });
  } catch (error) {
    return apiError(error);
  }
}
