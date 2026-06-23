import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/page-heading";
import { getAuthContext } from "@/lib/auth";
import { getBusinessUnitSelection } from "@/lib/business-units";
import { prisma } from "@/lib/prisma";
import { getExecutiveDashboardData } from "@/lib/sales-ops";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value).toLocaleString("ja-JP")}円`;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value * 1000) / 10}%`;
}

function ratioCaption(numerator: number, denominator: number) {
  if (!denominator) return "分母なし";
  return `${numerator.toLocaleString("ja-JP")}件 / ${denominator.toLocaleString("ja-JP")}件${
    denominator < 5 ? " ・ 参考値" : ""
  }`;
}

function signedClass(value: number | null | undefined) {
  if (!value) return "text-slate-600";
  return value > 0 ? "text-emerald-700" : "text-red-700";
}

export default async function DashboardPage({ searchParams }: Props) {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  const params = (await searchParams) ?? {};
  const organizationId = context.organization.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const businessUnitSelection = await getBusinessUnitSelection(context);
  const selectedBusinessUnitId =
    one(params.businessUnitId) ?? businessUnitSelection.selectedBusinessUnitId;
  const selectedBusinessUnitName =
    businessUnitSelection.units.find((unit) => unit.id === selectedBusinessUnitId)?.name ??
    businessUnitSelection.selectedBusinessUnitName;
  const [data, todayTasks, recentActivities] = await Promise.all([
    getExecutiveDashboardData(organizationId, {
      businessUnitId: selectedBusinessUnitId,
      periodStart: monthStart,
      periodEnd: monthEnd,
    }),
    prisma.task.findMany({
      where: {
        organizationId,
        ownerUserId: context.user.id,
        dueDate: { gte: today, lt: tomorrow },
        status: { notIn: ["COMPLETED", "CANCELED"] },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.activity.findMany({
      where: { organizationId, deletedAt: null },
      include: { actor: { select: { name: true } } },
      orderBy: { occurredAt: "desc" },
      take: 7,
    }),
  ]);
  const isAllBusinessUnits = !selectedBusinessUnitId;
  const metrics = [
    {
      label: "今月の商談金額",
      value: formatMoney(data.overall.opportunityAmount),
      caption: `${data.overall.opportunityCount.toLocaleString("ja-JP")}件`,
      icon: "deals",
    },
    {
      label: "今月の受注金額",
      value: formatMoney(data.overall.confirmedAmount),
      caption: `${data.overall.wonDealCount.toLocaleString("ja-JP")}件受注`,
      icon: "dashboard",
    },
    {
      label: "今月の受注件数",
      value: data.overall.wonDealCount.toLocaleString("ja-JP"),
      caption: ratioCaption(data.overall.wonDealCount, data.overall.winRateDenominator),
      icon: "deals",
    },
    {
      label: "全社受注率",
      value: formatPercent(data.overall.winRate),
      caption: "WON ÷ (WON + LOST)",
      icon: "reports",
    },
    {
      label: "着地見込",
      value: formatMoney(data.overall.landingForecastAmount),
      caption: `達成率 ${formatPercent(data.overall.landingAttainmentRate)}`,
      icon: "dashboard",
    },
    {
      label: "期限切れタスク",
      value: data.overall.overdueTaskCount.toLocaleString("ja-JP"),
      caption: "未完了",
      icon: "tasks",
    },
  ] as const;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeading
        eyebrow="Sales overview"
        title={`おはようございます、${context.user.name}さん`}
        description={`${selectedBusinessUnitName}の今月の営業状況です。全事業部表示では事業部ごとに分けて確認できます。`}
        action={
          <Link
            href={`/deals/board${selectedBusinessUnitId ? `?businessUnitId=${selectedBusinessUnitId}` : ""}`}
            className="primary-button"
          >
            商談パイプライン <Icon name="arrow" className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((metric) => (
          <div className="card p-5" key={metric.label}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500">{metric.label}</p>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Icon name={metric.icon} className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-5 text-2xl font-bold tracking-tight">{metric.value}</p>
            <p className="mt-2 text-xs text-slate-400">{metric.caption}</p>
          </div>
        ))}
      </div>

      {isAllBusinessUnits ? (
        <section className="card mt-6 overflow-hidden">
          <div className="border-b border-line p-5">
            <h2 className="font-bold">事業部比較</h2>
            <p className="mt-1 text-sm text-slate-500">
              全社合計を混在表示せず、事業部別に商談金額、受注率、着地見込、達成率を比較します。
            </p>
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  {["事業部", "商談金額", "商談件数", "受注額", "受注件数", "受注率", "進行中", "着地見込", "目標", "達成率", "前月比"].map((label) => (
                    <th key={label} className="px-4 py-3 text-right first:text-left">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.businessUnits.map((unit) => (
                  <tr key={unit.businessUnitId}>
                    <td className="px-4 py-3 font-semibold">{unit.label}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(unit.openForecastAmount + unit.confirmedAmount)}</td>
                    <td className="px-4 py-3 text-right">{unit.opportunityCount}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(unit.confirmedAmount)}</td>
                    <td className="px-4 py-3 text-right">{unit.wonDealCount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-semibold">{formatPercent(unit.winRate)}</div>
                      <div className="text-xs text-slate-400">{ratioCaption(unit.winRateNumerator, unit.winRateDenominator)}</div>
                    </td>
                    <td className="px-4 py-3 text-right">{unit.openForecastAmount > 0 ? "あり" : "-"}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(unit.landingForecastAmount)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(unit.targetAmount)}</td>
                    <td className="px-4 py-3 text-right">{formatPercent(unit.currentAttainmentRate)}</td>
                    <td className={`px-4 py-3 text-right ${signedClass(unit.progressGap)}`}>{formatMoney(unit.progressGap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 p-4 md:hidden">
            {data.businessUnits.map((unit) => (
              <Link
                key={unit.businessUnitId}
                href={`/dashboard?businessUnitId=${unit.businessUnitId ?? ""}`}
                className="rounded-lg border border-line p-4"
              >
                <p className="font-bold">{unit.label}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <MiniStat label="受注額" value={formatMoney(unit.confirmedAmount)} />
                  <MiniStat label="受注率" value={formatPercent(unit.winRate)} />
                  <MiniStat label="着地見込" value={formatMoney(unit.landingForecastAmount)} />
                  <MiniStat label="達成率" value={formatPercent(unit.currentAttainmentRate)} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="card p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">事業部別パイプライン</h2>
              <p className="mt-1 text-xs text-slate-500">
                同名ステージは混ぜず、事業部ごとに表示します。
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {data.pipelines.map((pipeline) => {
              const maxCount = Math.max(1, ...pipeline.stages.map((stage) => stage.count));
              return (
                <details key={pipeline.id} className="rounded-lg border border-line p-4" open={!isAllBusinessUnits}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <span className="font-bold">{pipeline.businessUnitName}</span>
                    <Link
                      href={`/deals/board?businessUnitId=${pipeline.businessUnitId ?? ""}`}
                      className="text-sm font-bold text-brand-700"
                    >
                      ボードを見る
                    </Link>
                  </summary>
                  <div className="mt-5 space-y-4">
                    {pipeline.stages.map((stage) => (
                      <div key={`${pipeline.id}:${stage.id}`}>
                        <div className="mb-2 flex justify-between text-sm">
                          <span className="font-semibold">{stage.name}</span>
                          <span className="text-slate-500">
                            {stage.count}件 ・ {formatMoney(stage.amount)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className={`h-2 rounded-full ${stage.stageType === "WON" ? "bg-brand-500" : stage.stageType === "LOST" ? "bg-slate-400" : "bg-accent"}`}
                            style={{
                              width: `${Math.max(stage.count ? 7 : 0, (stage.count / maxCount) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">今日のタスク</h2>
            <Link href="/tasks?filter=today" className="text-xs font-bold text-brand-700">
              すべて表示
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {todayTasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-line p-3">
                <p className="text-sm font-bold">{task.title}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {task.dueDate
                    ? new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit" }).format(task.dueDate)
                    : "時間未設定"}
                </p>
              </div>
            ))}
            {!todayTasks.length ? <p className="text-sm text-slate-400">今日のタスクはありません。</p> : null}
          </div>
        </section>
      </div>

      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-line p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="font-bold">営業担当者比較</h2>
              <p className="mt-1 text-sm text-slate-500">
                受注率は受注件数 ÷ クローズ商談数（WON + LOST）です。分母5件未満は参考値です。
              </p>
            </div>
            <Link
              href={`/reports?tab=salesperson-comparison&periodStart=${data.periodStart}&periodEnd=${data.periodEnd}${selectedBusinessUnitId ? `&businessUnitId=${selectedBusinessUnitId}` : ""}`}
              className="secondary-button"
            >
              詳細レポート
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                {["担当者", "商談", "受注", "失注", "受注率", "受注粗利", "着地見込", "達成率"].map((label) => (
                  <th key={label} className="px-4 py-3 text-right first:text-left">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.salespeople.rows.slice(0, 8).map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-semibold">
                    <Link
                      className="text-brand-700 hover:underline"
                      href={`/reports?tab=salesperson-comparison&userId=${row.userId ?? ""}&periodStart=${data.periodStart}&periodEnd=${data.periodEnd}${row.businessUnitId ? `&businessUnitId=${row.businessUnitId}` : ""}`}
                    >
                      {row.label}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">{row.opportunityCount}</td>
                  <td className="px-4 py-3 text-right">{row.wonDealCount}</td>
                  <td className="px-4 py-3 text-right">{row.lostDealCount}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-semibold">{formatPercent(row.winRate)}</div>
                    <div className="text-xs text-slate-400">{ratioCaption(row.winRateNumerator, row.winRateDenominator)}</div>
                  </td>
                  <td className="px-4 py-3 text-right">{formatMoney(row.grossProfitAmount)}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(row.landingForecastAmount)}</td>
                  <td className="px-4 py-3 text-right">{formatPercent(row.currentAttainmentRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card mt-6 p-6">
        <h2 className="font-bold">最近の活動</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex gap-3 rounded-xl border border-line p-4">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500 ring-4 ring-brand-50" />
              <div>
                <p className="text-sm font-bold">{activity.title}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {activity.actor?.name ?? "システム"} ・{" "}
                  {new Intl.DateTimeFormat("ja-JP", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(activity.occurredAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}
