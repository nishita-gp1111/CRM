import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionPlanPanel } from "@/components/kpi/action-plan-panel";
import { PageHeading } from "@/components/ui/page-heading";
import { getAuthContext } from "@/lib/auth";
import { getBusinessUnitSelection } from "@/lib/business-units";
import { getKpiDashboardData, getMetricDrilldown } from "@/lib/kpi";
import { hasPermission, Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatValue(value: number | null, unit: string) {
  if (value === null) return "-";
  if (unit === "CURRENCY")
    return `${Math.round(value).toLocaleString("ja-JP")}円`;
  if (unit === "PERCENT") return `${Math.round(value * 1000) / 10}%`;
  return value.toLocaleString("ja-JP");
}

function formatRate(value: number | null) {
  if (value === null) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value * 1000) / 10}%`;
}

function formatDate(value: unknown) {
  if (!value) return "-";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value.slice(0, 10);
  return "-";
}

function numberish(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") return value.toLocaleString("ja-JP");
  if (typeof value === "object") {
    const maybeDecimal = value as { toNumber?: unknown };
    if (typeof maybeDecimal.toNumber === "function") {
      return maybeDecimal.toNumber().toLocaleString("ja-JP");
    }
  }
  return String(value);
}

function queryString(
  params: Record<string, string | null | undefined>,
  next: Record<string, string | null | undefined>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...next })) {
    if (value) search.set(key, value);
  }
  return search.toString();
}

function sourceLabel(sourceType: string) {
  const labels: Record<string, string> = {
    MANUAL_DAILY: "日次入力",
    PERFORMANCE_EVENT: "実績イベント",
    DEAL: "商談",
    DEAL_LINE_ITEM: "商品明細",
    REFERRAL: "紹介",
    FIELD_VISIT: "飛込",
    FORMULA: "計算式",
  };
  return labels[sourceType] ?? sourceType;
}

function drilldownTitle(item: unknown) {
  const row = item as Record<string, unknown>;
  if (typeof row.name === "string") return row.name;
  if (typeof row.referredCompanyName === "string") return row.referredCompanyName;
  if (typeof row.companyName === "string") return row.companyName;
  if (typeof row.eventType === "string") return row.eventType;
  if (typeof row.metricDefinitionId === "string") return "日次実績";
  const deal = row.deal as Record<string, unknown> | undefined;
  if (deal && typeof deal.name === "string") return deal.name;
  return typeof row.id === "string" ? row.id : "-";
}

function drilldownDate(item: unknown) {
  const row = item as Record<string, unknown>;
  return formatDate(
    row.closeDate ??
      row.expectedCloseDate ??
      row.billingStartedAt ??
      row.targetDate ??
      row.occurredAt ??
      row.referredAt ??
      row.visitedAt,
  );
}

function drilldownStatus(item: unknown) {
  const row = item as Record<string, unknown>;
  return String(row.status ?? row.eventType ?? row.source ?? "-");
}

function drilldownOwner(item: unknown, userNameById: Map<string, string>) {
  const row = item as Record<string, unknown>;
  const userId =
    row.ownerUserId ??
    row.creditedUserId ??
    row.userId ??
    row.referrerUserId;
  return typeof userId === "string" ? userNameById.get(userId) ?? userId : "-";
}

function drilldownAmount(item: unknown) {
  const row = item as Record<string, unknown>;
  return numberish(
    row.amount ??
      row.grossProfitAmount ??
      row.expectedGrossProfitAmount ??
      row.revenueAmount ??
      row.value ??
      row.quantity,
  );
}

export default async function ReportsPage({ searchParams }: Props) {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  const params = (await searchParams) ?? {};
  const businessUnits = await getBusinessUnitSelection(context);
  const businessUnitId =
    one(params.businessUnitId) ?? businessUnits.selectedBusinessUnitId ?? "";
  const workFunction = one(params.workFunction) as "IS" | "FS" | "CS" | undefined;
  const userId = one(params.userId) ?? "";
  const periodStart = one(params.periodStart);
  const periodEnd = one(params.periodEnd);
  const metricId = one(params.metricId);
  const baseQuery = {
    businessUnitId,
    workFunction,
    userId,
    periodStart,
    periodEnd,
  };
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: context.organization.id, status: "ACTIVE" },
    select: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  const users = members.map((member) => member.user);
  const userNameById = new Map(users.map((user) => [user.id, user.name]));
  const data = await getKpiDashboardData(context, {
    businessUnitId: businessUnitId || null,
    workFunction: workFunction || null,
    userId: userId || null,
    periodStart: periodStart ? new Date(`${periodStart}T00:00:00Z`) : undefined,
    periodEnd: periodEnd ? new Date(`${periodEnd}T00:00:00Z`) : undefined,
  });
  const drilldown = metricId
    ? await getMetricDrilldown({
        organizationId: context.organization.id,
        metricId,
        businessUnitId: businessUnitId || null,
        workFunction: workFunction || null,
        userId: userId || null,
        periodStart: new Date(`${data.filters.periodStart}T00:00:00Z`),
        periodEnd: new Date(`${data.filters.periodEnd}T00:00:00Z`),
      })
    : null;
  const primaryMetrics = data.metrics.filter((metric) => metric.metricDefinition.category !== "CONVERSION");
  const conversionMetrics = data.metrics.filter(
    (metric) => metric.metricDefinition.category === "CONVERSION",
  );
  const metricOptions = data.metrics.map((metric) => ({
    id: metric.metricDefinition.id,
    displayName: metric.metricDefinition.displayName,
  }));
  const canManageTargets = hasPermission(
    context.membership.role,
    Permission.MANAGE_TARGETS,
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeading
        eyebrow="KPI operations"
        title="レポート"
        description="CRM内の商談、商品明細、日次実績、紹介、飛込からKPIを集計します。"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/daily-metrics" className="secondary-button">
              日次入力
            </Link>
            <Link href="/settings/targets" className="secondary-button">
              目標設定
            </Link>
          </div>
        }
      />

      <form className="card mb-6 grid gap-3 p-4 md:grid-cols-6">
        <label>
          <span className="field-label">事業部</span>
          <select className="text-field" name="businessUnitId" defaultValue={businessUnitId}>
            <option value="">全事業部</option>
            {businessUnits.units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">職種</span>
          <select className="text-field" name="workFunction" defaultValue={workFunction ?? ""}>
            <option value="">全職種</option>
            <option value="IS">IS</option>
            <option value="FS">FS</option>
            <option value="CS">CS</option>
          </select>
        </label>
        <label>
          <span className="field-label">担当者</span>
          <select className="text-field" name="userId" defaultValue={userId}>
            <option value="">全担当者</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">開始日</span>
          <input className="text-field" type="date" name="periodStart" defaultValue={data.filters.periodStart} />
        </label>
        <label>
          <span className="field-label">終了日</span>
          <input className="text-field" type="date" name="periodEnd" defaultValue={data.filters.periodEnd} />
        </label>
        <div className="flex items-end">
          <button className="primary-button w-full">更新</button>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {primaryMetrics.slice(0, 12).map((metric) => {
          const href = `/reports?${queryString(baseQuery, {
            periodStart: data.filters.periodStart,
            periodEnd: data.filters.periodEnd,
            metricId: metric.metricDefinition.id,
          })}`;
          return (
            <Link
              href={href}
              key={metric.metricDefinition.id}
              className={`card block p-5 transition hover:border-brand-300 hover:bg-brand-50/40 ${
                metricId === metric.metricDefinition.id ? "border-brand-400" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    {metric.metricDefinition.displayName}
                  </p>
                  <p className="mt-4 text-2xl font-semibold tracking-tight">
                    {formatValue(metric.value, metric.metricDefinition.unit)}
                  </p>
                </div>
                <span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700">
                  {sourceLabel(metric.metricDefinition.sourceType)}
                </span>
              </div>
              <div className="mt-4 h-1.5 rounded-full bg-slate-100">
                <div
                  className="h-1.5 rounded-full bg-brand-600"
                  style={{
                    width: `${Math.min((metric.attainmentRate ?? 0) * 100, 100)}%`,
                  }}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                <span>目標 {formatValue(metric.target, metric.metricDefinition.unit)}</span>
                <span>残 {formatValue(metric.remainingValue, metric.metricDefinition.unit)}</span>
                <span>前期比 {formatRate(metric.changeRate)}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="card p-6">
          <h2 className="font-bold">目標進捗</h2>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-semibold">{data.businessCalendar.elapsedWorkingDays}</p>
              <p className="text-xs text-slate-500">経過営業日</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{data.businessCalendar.remainingWorkingDays}</p>
              <p className="text-xs text-slate-500">残営業日</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">
                {formatValue(data.businessCalendar.progressRate, "PERCENT")}
              </p>
              <p className="text-xs text-slate-500">理想進捗</p>
            </div>
          </div>
          <div className="mt-5 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-brand-600"
              style={{
                width: `${Math.min((data.businessCalendar.progressRate ?? 0) * 100, 100)}%`,
              }}
            />
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-bold">必要行動量</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {[
              ["必要受注数", data.requiredActivity.requiredWonDeals],
              ["必要有効商談", data.requiredActivity.requiredValidMeetings],
              ["必要アポ", data.requiredActivity.requiredAppointments],
              ["必要架電/営業日", data.requiredActivity.dailyRequiredCalls],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-line p-3">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-2 text-xl font-semibold">
                  {typeof value === "number" ? value.toLocaleString("ja-JP") : "-"}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
            <p>
              残粗利:{" "}
              {formatValue(data.requiredActivity.remainingGrossProfit, "CURRENCY")}
            </p>
            <p>
              平均受注粗利:{" "}
              {formatValue(data.requiredActivity.averageGrossProfitPerWonDeal, "CURRENCY")}
            </p>
            <p>
              受注率: {formatValue(data.requiredActivity.calculationBasis.winRate, "PERCENT")}
            </p>
            <p>
              アポ化率:{" "}
              {formatValue(
                data.requiredActivity.calculationBasis.callToAppointmentRate,
                "PERCENT",
              )}
            </p>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="card overflow-hidden">
          <div className="border-b border-line p-5">
            <h2 className="font-bold">KPI一覧</h2>
            <p className="mt-1 text-sm text-slate-500">
              実績、目標、達成率、残数、前期間比を同じ軸で確認します。
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3">KPI</th>
                  <th className="px-4 py-3">元データ</th>
                  <th className="px-4 py-3 text-right">実績</th>
                  <th className="px-4 py-3 text-right">目標</th>
                  <th className="px-4 py-3 text-right">達成率</th>
                  <th className="px-4 py-3 text-right">残数</th>
                  <th className="px-4 py-3 text-right">前期間比</th>
                </tr>
              </thead>
              <tbody>
                {data.metrics.map((metric) => (
                  <tr key={metric.metricDefinition.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <Link
                        className="font-semibold text-slate-900 hover:text-brand-700"
                        href={`/reports?${queryString(baseQuery, {
                          periodStart: data.filters.periodStart,
                          periodEnd: data.filters.periodEnd,
                          metricId: metric.metricDefinition.id,
                        })}`}
                      >
                        {metric.metricDefinition.displayName}
                      </Link>
                      <p className="mt-1 text-xs text-slate-400">{metric.explanation}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {sourceLabel(metric.metricDefinition.sourceType)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatValue(metric.value, metric.metricDefinition.unit)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatValue(metric.target, metric.metricDefinition.unit)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatValue(metric.attainmentRate, "PERCENT")}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatValue(metric.remainingValue, metric.metricDefinition.unit)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatRate(metric.changeRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-6">
          <div className="card p-6">
            <h2 className="font-bold">データ品質警告</h2>
            <div className="mt-4 space-y-3">
              {data.dataQualityWarnings.map((warning) => (
                <div key={warning.id} className="rounded-lg border border-line p-3">
                  <p className="text-sm font-semibold">{warning.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {warning.detail}
                  </p>
                </div>
              ))}
              {data.dataQualityWarnings.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line p-4 text-sm text-slate-500">
                  対象期間の主要な警告はありません。
                </p>
              ) : null}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-bold">転換ファネル</h2>
            <div className="mt-5 grid gap-3">
              {conversionMetrics.map((metric) => (
                <Link
                  key={metric.metricDefinition.id}
                  href={`/reports?${queryString(baseQuery, {
                    periodStart: data.filters.periodStart,
                    periodEnd: data.filters.periodEnd,
                    metricId: metric.metricDefinition.id,
                  })}`}
                  className="rounded-lg border border-line p-4 transition hover:border-brand-300 hover:bg-brand-50/40"
                >
                  <p className="text-sm font-semibold text-slate-500">
                    {metric.metricDefinition.displayName}
                  </p>
                  <p className="mt-2 text-xl font-semibold">
                    {formatValue(metric.value, "PERCENT")}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    分子 {metric.numerator ?? "-"} / 分母 {metric.denominator ?? "-"}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>

      {drilldown?.metric ? (
        <section className="card mt-6 overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
            <div>
              <h2 className="font-bold">元データ</h2>
              <p className="mt-1 text-sm text-slate-500">
                {drilldown.metric.displayName} / {sourceLabel(drilldown.metric.sourceType)} / {drilldown.total}件
              </p>
            </div>
            <Link
              href={`/reports?${queryString(baseQuery, {
                periodStart: data.filters.periodStart,
                periodEnd: data.filters.periodEnd,
                metricId: null,
              })}`}
              className="secondary-button"
            >
              閉じる
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3">対象</th>
                  <th className="px-4 py-3">日付</th>
                  <th className="px-4 py-3">状態</th>
                  <th className="px-4 py-3">担当</th>
                  <th className="px-4 py-3 text-right">値</th>
                </tr>
              </thead>
              <tbody>
                {drilldown.items.map((item: unknown, index: number) => (
                  <tr key={index} className="border-t border-line">
                    <td className="px-4 py-3 font-semibold">{drilldownTitle(item)}</td>
                    <td className="px-4 py-3 text-slate-600">{drilldownDate(item)}</td>
                    <td className="px-4 py-3 text-slate-600">{drilldownStatus(item)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {drilldownOwner(item, userNameById)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {drilldownAmount(item)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {drilldown.items.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">
              このKPIに紐づく元データは対象期間にありません。
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="mt-6">
        <ActionPlanPanel
          actionPlans={data.actionPlans}
          metrics={metricOptions}
          users={users}
          businessUnits={businessUnits.units}
          defaultBusinessUnitId={businessUnitId}
          defaultWorkFunction={workFunction ?? ""}
          defaultUserId={userId || context.user.id}
          canManage={canManageTargets}
        />
      </div>
    </div>
  );
}
