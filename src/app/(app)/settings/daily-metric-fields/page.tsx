import { redirect } from "next/navigation";
import { DailyMetricFieldSettings } from "@/components/kpi/daily-metric-field-settings";
import { SettingsNav } from "@/components/settings/settings-nav";
import { PageHeading } from "@/components/ui/page-heading";
import { getAuthContext } from "@/lib/auth";
import { isDailyMetricWorkFunction, unitLabel } from "@/lib/daily-metric-fields";
import { hasPermission, Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DailyMetricFieldSettingsPage({ searchParams }: Props) {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  if (!hasPermission(context.membership.role, Permission.MANAGE_KPI)) {
    redirect("/settings/kpis");
  }
  const params = (await searchParams) ?? {};
  const businessUnits = await prisma.businessUnit.findMany({
    where: { organizationId: context.organization.id, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });
  const selectedBusinessUnitId =
    businessUnits.find((unit) => unit.id === one(params.businessUnitId))?.id ??
    businessUnits[0]?.id ??
    "";
  const requestedWorkFunction = one(params.workFunction);
  const selectedWorkFunction = isDailyMetricWorkFunction(requestedWorkFunction)
    ? requestedWorkFunction
    : "IS";
  const selectedStatus = ["enabled", "disabled", "all"].includes(one(params.status) ?? "")
    ? one(params.status)!
    : "enabled";
  const configs = selectedBusinessUnitId
    ? await prisma.dailyMetricFieldConfig.findMany({
        where: {
          organizationId: context.organization.id,
          businessUnitId: selectedBusinessUnitId,
          workFunction: selectedWorkFunction,
          ...(selectedStatus === "enabled"
            ? { isEnabled: true }
            : selectedStatus === "disabled"
              ? { isEnabled: false }
              : {}),
        },
        include: {
          metricDefinition: {
            select: {
              id: true,
              displayName: true,
              description: true,
              unit: true,
            },
          },
        },
        orderBy: [{ displayOrder: "asc" }, { metricDefinition: { displayName: "asc" } }],
      })
    : [];
  const entryCounts = configs.length
    ? await prisma.dailyMetricEntry.groupBy({
        by: ["metricDefinitionId"],
        where: {
          organizationId: context.organization.id,
          businessUnitId: selectedBusinessUnitId,
          workFunction: selectedWorkFunction,
          metricDefinitionId: { in: configs.map((config) => config.metricDefinitionId) },
        },
        _count: { metricDefinitionId: true },
      })
    : [];
  const countByMetricId = new Map(
    entryCounts.map((entry) => [entry.metricDefinitionId, entry._count.metricDefinitionId]),
  );
  const metricOptions = await prisma.metricDefinition.findMany({
    where: {
      organizationId: context.organization.id,
      sourceType: "MANUAL_DAILY",
      isActive: true,
    },
    select: { id: true, displayName: true },
    orderBy: [{ displayOrder: "asc" }, { displayName: "asc" }],
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeading
        eyebrow="Daily metric fields"
        title="日次入力項目設定"
        description="事業部・職種ごとに、日次実績入力で使うKPI項目を追加、非表示、再追加、並び替えできます。"
      />
      <SettingsNav />
      <DailyMetricFieldSettings
        businessUnits={businessUnits}
        selectedBusinessUnitId={selectedBusinessUnitId}
        selectedWorkFunction={selectedWorkFunction}
        selectedStatus={selectedStatus}
        metricOptions={metricOptions}
        rows={configs.map((config) => ({
          id: config.id,
          metricDefinitionId: config.metricDefinitionId,
          displayName: config.metricDefinition.displayName,
          description: config.metricDefinition.description,
          unitLabel: unitLabel(config.metricDefinition.unit),
          isEnabled: config.isEnabled,
          displayOrder: config.displayOrder,
          hasEntries: (countByMetricId.get(config.metricDefinitionId) ?? 0) > 0,
        }))}
      />
    </div>
  );
}
