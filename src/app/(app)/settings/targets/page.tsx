import { redirect } from "next/navigation";
import { SettingsNav } from "@/components/settings/settings-nav";
import { PageHeading } from "@/components/ui/page-heading";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TargetSettingsPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  const targets = await prisma.kpiTarget.findMany({
    where: { organizationId: context.organization.id },
    include: {
      metricDefinition: { select: { displayName: true, unit: true } },
    },
    orderBy: [{ periodStart: "desc" }, { updatedAt: "desc" }],
  });
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeading
        eyebrow="KPI targets"
        title="KPI目標"
        description="月次目標とスコープを確認します。"
      />
      <SettingsNav />
      <section className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3">KPI</th>
              <th className="px-4 py-3">期間</th>
              <th className="px-4 py-3">スコープ</th>
              <th className="px-4 py-3 text-right">目標</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((target) => (
              <tr key={target.id} className="border-t border-line">
                <td className="px-4 py-3 font-semibold">
                  {target.metricDefinition.displayName}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {target.periodStart.toISOString().slice(0, 10)} -{" "}
                  {target.periodEnd.toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-3 text-slate-600">{target.scopeKey}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {Number(target.targetValue).toLocaleString("ja-JP")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
