import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { monthRange } from "@/lib/kpi";
import { Permission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.CRM_READ);
    const url = new URL(request.url);
    const businessUnitId = url.searchParams.get("businessUnitId");
    const range = monthRange();
    const periodStart = url.searchParams.get("periodStart")
      ? new Date(`${url.searchParams.get("periodStart")}T00:00:00Z`)
      : range.periodStart;
    const periodEnd = url.searchParams.get("periodEnd")
      ? new Date(`${url.searchParams.get("periodEnd")}T00:00:00Z`)
      : range.periodEnd;
    const [categories, lineItems] = await Promise.all([
      prisma.forecastCategory.findMany({
        where: {
          organizationId: context.organization.id,
          status: "ACTIVE",
          ...(businessUnitId ? { businessUnitId } : {}),
        },
        orderBy: [{ displayOrder: "asc" }],
      }),
      prisma.dealLineItem.findMany({
        where: {
          organizationId: context.organization.id,
          ...(businessUnitId ? { businessUnitId } : {}),
          deal: { expectedCloseDate: { gte: periodStart, lte: periodEnd } },
        },
        select: {
          expectedGrossProfitAmount: true,
          grossProfitAmount: true,
          deal: { select: { forecastCategoryId: true, probability: true } },
        },
      }),
    ]);
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const buckets = categories.map((category) => ({
      id: category.id,
      key: category.key,
      name: category.name,
      probability: category.probability,
      grossProfit: 0,
      weightedGrossProfit: 0,
      count: 0,
    }));
    const bucketById = new Map(buckets.map((bucket) => [bucket.id, bucket]));
    for (const lineItem of lineItems) {
      const amount = Number(
        lineItem.expectedGrossProfitAmount ?? lineItem.grossProfitAmount ?? 0,
      );
      const category = lineItem.deal.forecastCategoryId
        ? categoryById.get(lineItem.deal.forecastCategoryId)
        : null;
      const bucket = category ? bucketById.get(category.id) : null;
      if (!bucket) continue;
      bucket.grossProfit += amount;
      bucket.weightedGrossProfit += amount * (bucket.probability / 100);
      bucket.count += 1;
    }
    return NextResponse.json({
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
      buckets,
      totalGrossProfit: buckets.reduce((sum, bucket) => sum + bucket.grossProfit, 0),
      weightedGrossProfit: buckets.reduce(
        (sum, bucket) => sum + bucket.weightedGrossProfit,
        0,
      ),
    });
  } catch (error) {
    return apiError(error);
  }
}
