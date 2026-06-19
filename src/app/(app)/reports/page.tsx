import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import { getAuthContext } from "@/lib/auth";
import { getBusinessUnitSelection } from "@/lib/business-units";
import { getKpiDashboardData } from "@/lib/kpi";

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

export default async function ReportsPage({ searchParams }: Props) {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  const params = (await searchParams) ?? {};
  const businessUnits = await getBusinessUnitSelection(context);
  const businessUnitId =
    one(params.businessUnitId) ?? businessUnits.selectedBusinessUnitId;
  const workFunction = one(params.workFunction) as "IS" | "FS" | "CS" | undefined;
  const data = await getKpiDashboardData(context, {
    businessUnitId: businessUnitId || null,
    workFunction: workFunction || null,
    periodStart: one(params.periodStart)
      ? new Date(`${one(params.periodStart)}T00:00:00Z`)
      : undefined,
    periodEnd: one(params.periodEnd)
      ? new Date(`${one(params.periodEnd)}T00:00:00Z`)
      : undefined,
  });
  const primaryMetrics = data.metrics.filter((metric) =>
    [
      "executive_confirmed_gross_profit",
      "executive_weighted_forecast_gross_profit",
      "first_fs_gross_profit",
      "first_fs_won_deals",
      "first_is_calls",
      "first_is_appointments",
      "hd_fs_gross_profit",
      "hd_fs_won_deals",
      "hd_is_calls",
      "hd_is_appointments",
    ].includes(metric.metricDefinition.key),
  );
  const conversionMetrics = data.metrics.filter(
    (metric) => metric.metricDefinition.category === "CONVERSION",
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeading
        eyebrow="KPI scorecard"
        title="レポート"
        description="商談、商品明細、日次実績、紹介、飛込を正規化したKPIスコアカードです。"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/daily-metrics" className="secondary-button">
              日次入力
            </Link>
            <Link href="/settings/kpis" className="secondary-button">
              KPI定義
            </Link>
          </div>
        }
      />

      <form className="card mb-6 grid gap-3 p-4 md:grid-cols-5">
        <label>
          <span className="field-label">事業部</span>
          <select className="text-field" name="businessUnitId" defaultValue={businessUnitId ?? ""}>
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
        {primaryMetrics.slice(0, 8).map((metric) => (
          <Link
            href={`/api/metrics/${metric.metricDefinition.id}/drilldown?periodStart=${data.filters.periodStart}&periodEnd=${data.filters.periodEnd}`}
            key={metric.metricDefinition.id}
            className="card block p-5 transition hover:border-brand-300 hover:bg-brand-50/40"
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
                {metric.metricDefinition.sourceType}
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
            <p className="mt-3 text-xs text-slate-500">
              目標 {formatValue(metric.target, metric.metricDefinition.unit)} ・
              残 {formatValue(metric.remainingValue, metric.metricDefinition.unit)}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="card p-6">
          <h2 className="font-bold">営業日進捗</h2>
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
        </section>
      </div>

      <section className="card mt-6 p-6">
        <h2 className="font-bold">転換ファネル</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {conversionMetrics.map((metric) => (
            <div key={metric.metricDefinition.id} className="rounded-lg border border-line p-4">
              <p className="text-sm font-semibold text-slate-500">
                {metric.metricDefinition.displayName}
              </p>
              <p className="mt-2 text-xl font-semibold">
                {formatValue(metric.value, "PERCENT")}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                分子 {metric.numerator ?? "-"} / 分母 {metric.denominator ?? "-"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
