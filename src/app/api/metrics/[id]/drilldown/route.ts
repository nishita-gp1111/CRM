import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { getMetricDrilldown, monthRange } from "@/lib/kpi";
import { Permission, requirePermission } from "@/lib/permissions";
import { metricQuerySchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.CRM_READ);
    const { id } = await params;
    const url = new URL(request.url);
    const query = metricQuerySchema.parse(Object.fromEntries(url.searchParams));
    const range = monthRange();
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Number(url.searchParams.get("pageSize") ?? 25);
    const result = await getMetricDrilldown({
      organizationId: context.organization.id,
      metricId: id,
      businessUnitId: query.businessUnitId,
      workFunction: query.workFunction ?? null,
      userId: query.userId,
      periodStart: query.periodStart
        ? query.periodStart
        : range.periodStart,
      periodEnd: query.periodEnd ? query.periodEnd : range.periodEnd,
      page,
      pageSize,
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
