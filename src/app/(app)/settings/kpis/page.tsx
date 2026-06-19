import { redirect } from "next/navigation";
import { SettingsNav } from "@/components/settings/settings-nav";
import { PageHeading } from "@/components/ui/page-heading";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function KpiSettingsPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  const metrics = await prisma.metricDefinition.findMany({
    where: { organizationId: context.organization.id },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    orderBy: [{ businessUnitId: "asc" }, { displayOrder: "asc" }],
  });
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeading
        eyebrow="KPI definitions"
        title="KPI定義"
        description="集計元、集計方法、日付基準、バージョンを確認します。"
      />
      <SettingsNav />
      <section className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3">KPI</th>
              <th className="px-4 py-3">元データ</th>
              <th className="px-4 py-3">集計</th>
              <th className="px-4 py-3">日付</th>
              <th className="px-4 py-3 text-right">version</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr key={metric.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <p className="font-semibold">{metric.displayName}</p>
                  <p className="mt-1 text-xs text-slate-400">{metric.key}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{metric.sourceType}</td>
                <td className="px-4 py-3 text-slate-600">{metric.aggregation}</td>
                <td className="px-4 py-3 text-slate-600">{metric.dateField ?? "-"}</td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {metric.versions[0]?.version ?? 1}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
