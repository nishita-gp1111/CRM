import Link from "next/link";
import { redirect } from "next/navigation";
import { DailyMetricForm } from "@/components/kpi/daily-metric-form";
import { PageHeading } from "@/components/ui/page-heading";
import { getAuthContext } from "@/lib/auth";
import { getAccessibleBusinessUnits } from "@/lib/business-units";
import { prisma } from "@/lib/prisma";

export default async function DailyMetricsPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  const businessUnits = await getAccessibleBusinessUnits(context);
  const defaultBusinessUnitId =
    context.membership.selectedBusinessUnitId ?? businessUnits[0]?.id ?? "";
  const today = new Date();
  const todayOnly = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  const definitions = await prisma.metricDefinition.findMany({
    where: {
      organizationId: context.organization.id,
      sourceType: "MANUAL_DAILY",
      isActive: true,
      ...(defaultBusinessUnitId
        ? { OR: [{ businessUnitId: defaultBusinessUnitId }, { businessUnitId: null }] }
        : {}),
    },
    select: { id: true, displayName: true, description: true },
    orderBy: [{ displayOrder: "asc" }],
  });
  const entries = await prisma.dailyMetricEntry.findMany({
    where: {
      organizationId: context.organization.id,
      userId: context.user.id,
      targetDate: todayOnly,
      metricDefinitionId: { in: definitions.map((definition) => definition.id) },
    },
    select: { metricDefinitionId: true, value: true, status: true },
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeading
        eyebrow="Daily metrics"
        title="日次実績入力"
        description="架電、接続、オーナー、フル、アポなどの手入力KPIを日別に保存します。"
        action={
          <Link href="/reports" className="secondary-button">
            レポートへ
          </Link>
        }
      />
      <DailyMetricForm
        definitions={definitions}
        entries={entries}
        businessUnits={businessUnits}
        defaultBusinessUnitId={defaultBusinessUnitId}
      />
    </div>
  );
}
