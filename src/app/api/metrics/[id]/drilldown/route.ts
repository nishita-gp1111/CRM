import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { getMetricDrilldown, monthRange } from "@/lib/kpi";
import { Permission, requirePermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.CRM_READ);
    const { id } = await params;
    const url = new URL(request.url);
    const range = monthRange();
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Number(url.searchParams.get("pageSize") ?? 25);
    const result = await getMetricDrilldown({
      organizationId: context.organization.id,
      metricId: id,
      periodStart: url.searchParams.get("periodStart")
        ? new Date(`${url.searchParams.get("periodStart")}T00:00:00Z`)
        : range.periodStart,
      periodEnd: url.searchParams.get("periodEnd")
        ? new Date(`${url.searchParams.get("periodEnd")}T00:00:00Z`)
        : range.periodEnd,
      page,
      pageSize,
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
